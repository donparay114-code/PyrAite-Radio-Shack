"""Content moderation service for song prompts and user input.

Layer Order (optimized for speed):
1. LOCAL_BLOCKLIST - SQL/in-memory blocklist (fastest, ~1ms)
2. PROMPT_INJECTION - Regex check (~5ms)
3. HATE_SPEECH, VIOLENCE, etc. - Regex checks (~10ms)
4. OpenAI Moderation API - Comprehensive AI check (~200-500ms)

The local blocklist should ALWAYS run first to catch known bad terms
before paying for regex processing or API calls.
"""

import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class ModerationCategory(str, Enum):
    """Categories of content violations."""

    SAFE = "safe"
    LOCAL_BLOCKLIST = "local_blocklist"  # New: fastest check
    PROFANITY = "profanity"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    SEXUAL = "sexual"
    DRUGS = "drugs"
    SPAM = "spam"
    PROMPT_INJECTION = "prompt_injection"
    COPYRIGHT = "copyright"
    PERSONAL_INFO = "personal_info"

    # OpenAI Moderation API categories
    OPENAI_HATE = "openai_hate"
    OPENAI_HARASSMENT = "openai_harassment"
    OPENAI_SELF_HARM = "openai_self_harm"
    OPENAI_SEXUAL = "openai_sexual"
    OPENAI_VIOLENCE = "openai_violence"


@dataclass
class ModerationResult:
    """Result of content moderation check."""

    passed: bool
    category: ModerationCategory
    confidence: float
    reason: Optional[str] = None
    flagged_terms: list[str] = None

    def __post_init__(self):
        if self.flagged_terms is None:
            self.flagged_terms = []


class ContentModerator:
    """Moderates user-submitted content for safety and policy compliance.

    Layer Order (optimized for speed - LOCAL_BLOCKLIST is fastest):
    1. LOCAL_BLOCKLIST - In-memory set lookup O(1) - ~0.001ms
    2. PROMPT_INJECTION - Regex patterns - ~5ms
    3. Other regex checks - ~10ms total
    """

    # LOCAL BLOCKLIST - These are checked FIRST (fastest, O(1) set lookup)
    # Add commonly banned terms here for instant rejection
    # Can be loaded from database at startup for production
    LOCAL_BLOCKLIST: set[str] = {
        # Explicit slurs and hate terms (redacted for safety)
        "n-word-placeholder",
        "slur-placeholder",
        # Known spam/scam terms
        "free robux",
        "free vbucks",
        "crypto airdrop",
        # Known injection attempts
        "ignore instructions",
        "jailbreak mode",
        "dan mode",
        # Artist names to avoid copyright
        "taylor swift song",
        "drake song",
        "beatles cover",
    }

    # Common profanity patterns (keeping this minimal and SFW)
    PROFANITY_PATTERNS = [
        r"\b(f+u+c+k+|sh+i+t+|a+s+s+h+o+l+e+|b+i+t+c+h+|d+a+m+n+|c+r+a+p+)\b",
    ]

    # Hate speech and slurs (basic patterns)
    HATE_SPEECH_PATTERNS = [
        r"\b(nazi|kkk|white\s*power|kill\s*all)\b",
        r"\b(racial\s*slur|ethnic\s*cleansing)\b",
    ]

    # Violence patterns
    VIOLENCE_PATTERNS = [
        r"\b(kill\s+(?:them|him|her|everyone)|murder|massacre|genocide)\b",
        r"\b(bomb|shoot\s*up|mass\s*shooting|terrorist\s*attack)\b",
        r"\b(torture|mutilate|dismember)\b",
    ]

    # Sexual content patterns
    SEXUAL_PATTERNS = [
        r"\b(porn|xxx|sex\s*tape|nude|naked)\b",
        r"\b(explicit\s*sexual|hardcore)\b",
    ]

    # Drug-related patterns
    DRUG_PATTERNS = [
        r"\b(cocaine|heroin|meth|crack|fentanyl)\b",
        r"\b(how\s*to\s*(make|cook|synthesize)\s*(drugs|meth))\b",
    ]

    # Spam patterns
    SPAM_PATTERNS = [
        r"(https?://\S+){3,}",  # Multiple URLs
        r"(.)\1{10,}",  # Repeated characters
        r"\b(buy\s*now|click\s*here|free\s*money|act\s*now)\b",
    ]

    # Prompt injection patterns
    INJECTION_PATTERNS = [
        r"ignore\s*(previous|all|prior)\s*(instructions?|prompts?|rules?)",
        r"disregard\s*(the\s*)?(above|previous|system)",
        r"you\s*are\s*now\s*(a|an|in)\s*(different|new|evil)",
        r"jailbreak|DAN\s*mode|developer\s*mode",
        r"pretend\s*(you\s*are|to\s*be)\s*(unrestricted|unfiltered)",
        r"\[system\]|\[user\]|\[assistant\]",
        r"<\|.*?\|>",  # Special tokens
        r"```.*?ignore.*?```",
    ]

    # Copyright/trademark patterns
    COPYRIGHT_PATTERNS = [
        r"\b(cover\s*of|remix\s*of|parody\s*of)\s+[A-Z][a-z]+",
        r"\b(taylor\s*swift|drake|beyonce|beatles|rolling\s*stones)\b",
        r"\b(disney|marvel|star\s*wars|pokemon|nintendo)\b",
    ]

    # Personal information patterns
    PERSONAL_INFO_PATTERNS = [
        r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",  # Phone numbers
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
        r"\b\d{3}[-]?\d{2}[-]?\d{4}\b",  # SSN pattern
        r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b",  # Credit cards
    ]

    def __init__(self, strict_mode: bool = False, enable_openai: bool = None):
        """
        Initialize the moderator.

        Args:
            strict_mode: If True, be more aggressive with filtering
            enable_openai: Override config for OpenAI moderation (None = use config)
        """
        self.strict_mode = strict_mode
        self._compile_patterns()

        # OpenAI moderation settings
        from src.utils.config import settings

        self._openai_enabled = (
            enable_openai if enable_openai is not None else settings.openai_moderation_enabled
        )
        self._openai_api_key = settings.openai_api_key
        self._openai_timeout = settings.openai_moderation_timeout
        self._openai_fallback = settings.openai_moderation_fallback_on_error
        self._http_client: Optional[httpx.AsyncClient] = None

    def _compile_patterns(self) -> None:
        """Compile regex patterns for efficiency."""
        flags = re.IGNORECASE | re.MULTILINE

        self.compiled_patterns = {
            ModerationCategory.PROFANITY: [
                re.compile(p, flags) for p in self.PROFANITY_PATTERNS
            ],
            ModerationCategory.HATE_SPEECH: [
                re.compile(p, flags) for p in self.HATE_SPEECH_PATTERNS
            ],
            ModerationCategory.VIOLENCE: [
                re.compile(p, flags) for p in self.VIOLENCE_PATTERNS
            ],
            ModerationCategory.SEXUAL: [
                re.compile(p, flags) for p in self.SEXUAL_PATTERNS
            ],
            ModerationCategory.DRUGS: [
                re.compile(p, flags) for p in self.DRUG_PATTERNS
            ],
            ModerationCategory.SPAM: [re.compile(p, flags) for p in self.SPAM_PATTERNS],
            ModerationCategory.PROMPT_INJECTION: [
                re.compile(p, flags) for p in self.INJECTION_PATTERNS
            ],
            ModerationCategory.COPYRIGHT: [
                re.compile(p, flags) for p in self.COPYRIGHT_PATTERNS
            ],
            ModerationCategory.PERSONAL_INFO: [
                re.compile(p, flags) for p in self.PERSONAL_INFO_PATTERNS
            ],
        }

    def check(self, content: str) -> ModerationResult:
        """
        Check content for policy violations.

        Args:
            content: The text content to moderate

        Returns:
            ModerationResult with pass/fail status
        """
        if not content or not content.strip():
            return ModerationResult(
                passed=False,
                category=ModerationCategory.SPAM,
                confidence=1.0,
                reason="Empty content",
            )

        # Normalize content
        normalized = content.lower().strip()

        # Check length
        if len(normalized) < 3:
            return ModerationResult(
                passed=False,
                category=ModerationCategory.SPAM,
                confidence=1.0,
                reason="Content too short",
            )

        if len(normalized) > 2000:
            return ModerationResult(
                passed=False,
                category=ModerationCategory.SPAM,
                confidence=1.0,
                reason="Content too long",
            )

        # LAYER 1: Local blocklist check FIRST (fastest - O(1) set lookup)
        blocklist_result = self._check_local_blocklist(normalized)
        if not blocklist_result.passed:
            logger.warning(
                f"Content blocked by local blocklist: {blocklist_result.flagged_terms}"
            )
            return blocklist_result

        # LAYER 2+: Regex pattern checks (slower but more comprehensive)
        # Priority order: injection > hate_speech > violence > sexual > drugs > profanity > copyright > personal_info > spam
        check_order = [
            ModerationCategory.PROMPT_INJECTION,
            ModerationCategory.HATE_SPEECH,
            ModerationCategory.VIOLENCE,
            ModerationCategory.SEXUAL,
            ModerationCategory.DRUGS,
            ModerationCategory.PROFANITY,
            ModerationCategory.COPYRIGHT,
            ModerationCategory.PERSONAL_INFO,
            ModerationCategory.SPAM,
        ]

        for category in check_order:
            result = self._check_category(normalized, category)
            if not result.passed:
                logger.warning(
                    f"Content failed moderation: {category.value} - {result.reason}"
                )
                return result

        return ModerationResult(
            passed=True,
            category=ModerationCategory.SAFE,
            confidence=1.0,
        )

    def _check_local_blocklist(self, content: str) -> ModerationResult:
        """
        Check content against local blocklist (LAYER 1 - fastest check).

        This is O(1) set lookup per word, much faster than regex.
        Run this BEFORE any regex or API checks.
        """
        content_lower = content.lower()

        # Check for exact matches in blocklist
        flagged = []
        for term in self.LOCAL_BLOCKLIST:
            if term in content_lower:
                flagged.append(term)

        if flagged:
            return ModerationResult(
                passed=False,
                category=ModerationCategory.LOCAL_BLOCKLIST,
                confidence=1.0,
                reason="Content contains blocked terms",
                flagged_terms=flagged[:5],
            )

        return ModerationResult(
            passed=True,
            category=ModerationCategory.SAFE,
            confidence=1.0,
        )

    def _check_category(
        self,
        content: str,
        category: ModerationCategory,
    ) -> ModerationResult:
        """Check content against a specific category."""
        patterns = self.compiled_patterns.get(category, [])

        for pattern in patterns:
            matches = pattern.findall(content)
            if matches:
                # Calculate confidence based on match count and length
                confidence = min(0.5 + (len(matches) * 0.1), 1.0)

                return ModerationResult(
                    passed=False,
                    category=category,
                    confidence=confidence,
                    reason=f"Matched {category.value} pattern",
                    flagged_terms=list(set(matches))[:5],  # Limit to 5 terms
                )

        return ModerationResult(
            passed=True,
            category=ModerationCategory.SAFE,
            confidence=1.0,
        )

    def sanitize(self, content: str) -> str:
        """
        Sanitize content by removing or replacing problematic patterns.

        Args:
            content: The text to sanitize

        Returns:
            Sanitized text
        """
        sanitized = content

        # Remove potential injection attempts
        for pattern in self.compiled_patterns[ModerationCategory.PROMPT_INJECTION]:
            sanitized = pattern.sub("", sanitized)

        # Remove personal information
        for pattern in self.compiled_patterns[ModerationCategory.PERSONAL_INFO]:
            sanitized = pattern.sub("[REDACTED]", sanitized)

        # Remove excessive whitespace
        sanitized = re.sub(r"\s+", " ", sanitized).strip()

        return sanitized

    def get_safe_prompt(self, prompt: str) -> tuple[str, ModerationResult]:
        """
        Get a safe version of a prompt if possible.

        Args:
            prompt: The original prompt

        Returns:
            Tuple of (sanitized_prompt, moderation_result)
        """
        # First check the original
        result = self.check(prompt)

        if result.passed:
            return prompt, result

        # Try sanitizing
        sanitized = self.sanitize(prompt)
        sanitized_result = self.check(sanitized)

        if sanitized_result.passed:
            return sanitized, sanitized_result

        # Return original with failure
        return prompt, result

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client for OpenAI API."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=self._openai_timeout,
                headers={
                    "Authorization": f"Bearer {self._openai_api_key}",
                    "Content-Type": "application/json",
                },
            )
        return self._http_client

    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def check_with_openai(self, content: str) -> ModerationResult:
        """
        Check content using OpenAI's Moderation API.

        This is Layer 4 in the moderation stack (slowest but most comprehensive).

        Args:
            content: Text to moderate

        Returns:
            ModerationResult with OpenAI category if flagged
        """
        if not self._openai_enabled or not self._openai_api_key:
            logger.debug("OpenAI moderation disabled or no API key")
            return ModerationResult(
                passed=True,
                category=ModerationCategory.SAFE,
                confidence=0.0,
                reason="OpenAI moderation not configured",
            )

        try:
            client = await self._get_http_client()
            response = await client.post(
                "https://api.openai.com/v1/moderations",
                json={"input": content},
            )
            response.raise_for_status()
            data = response.json()

            # Parse OpenAI response
            result = data["results"][0]

            if not result["flagged"]:
                return ModerationResult(
                    passed=True,
                    category=ModerationCategory.SAFE,
                    confidence=1.0,
                    reason="Passed OpenAI moderation",
                )

            # Find the flagged categories
            categories = result["categories"]
            scores = result["category_scores"]

            flagged_cats = [cat for cat, flagged in categories.items() if flagged]

            # Map OpenAI category to our enum
            category_mapping = {
                "hate": ModerationCategory.OPENAI_HATE,
                "hate/threatening": ModerationCategory.OPENAI_HATE,
                "harassment": ModerationCategory.OPENAI_HARASSMENT,
                "harassment/threatening": ModerationCategory.OPENAI_HARASSMENT,
                "self-harm": ModerationCategory.OPENAI_SELF_HARM,
                "self-harm/intent": ModerationCategory.OPENAI_SELF_HARM,
                "self-harm/instructions": ModerationCategory.OPENAI_SELF_HARM,
                "sexual": ModerationCategory.OPENAI_SEXUAL,
                "sexual/minors": ModerationCategory.OPENAI_SEXUAL,
                "violence": ModerationCategory.OPENAI_VIOLENCE,
                "violence/graphic": ModerationCategory.OPENAI_VIOLENCE,
            }

            # Get highest scoring flagged category
            highest_cat = max(flagged_cats, key=lambda c: scores.get(c.replace("/", "_"), 0))
            our_category = category_mapping.get(highest_cat, ModerationCategory.HATE_SPEECH)
            highest_score = scores.get(highest_cat.replace("/", "_"), 0.9)

            return ModerationResult(
                passed=False,
                category=our_category,
                confidence=highest_score,
                reason=f"OpenAI flagged: {', '.join(flagged_cats)}",
                flagged_terms=flagged_cats,
            )

        except httpx.TimeoutException:
            logger.warning("OpenAI moderation timeout")
            if self._openai_fallback:
                return ModerationResult(
                    passed=True,
                    category=ModerationCategory.SAFE,
                    confidence=0.0,
                    reason="OpenAI timeout - falling back to regex",
                )
            raise

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenAI moderation API error: {e.response.status_code}")
            if self._openai_fallback:
                return ModerationResult(
                    passed=True,
                    category=ModerationCategory.SAFE,
                    confidence=0.0,
                    reason=f"OpenAI API error {e.response.status_code} - falling back to regex",
                )
            raise

        except Exception as e:
            logger.error(f"OpenAI moderation failed: {e}")
            if self._openai_fallback:
                return ModerationResult(
                    passed=True,
                    category=ModerationCategory.SAFE,
                    confidence=0.0,
                    reason="OpenAI error - falling back to regex",
                )
            raise

    async def check_async(self, content: str, use_openai: bool = True) -> ModerationResult:
        """
        Async version of check() with optional OpenAI integration.

        Layer Order:
        1. LOCAL_BLOCKLIST - O(1) set lookup (~0.001ms)
        2. PROMPT_INJECTION - Regex (~5ms)
        3. Other regex checks (~10ms)
        4. OpenAI Moderation API (~200-500ms)

        Args:
            content: Content to moderate
            use_openai: Whether to use OpenAI as final layer

        Returns:
            ModerationResult
        """
        # Run fast local checks first (synchronous)
        local_result = self.check(content)

        if not local_result.passed:
            # Already caught by local checks - no need for API call
            return local_result

        # If enabled and configured, run OpenAI check
        if use_openai and self._openai_enabled:
            openai_result = await self.check_with_openai(content)
            if not openai_result.passed:
                return openai_result

        return local_result


# Singleton instance
_moderator: Optional[ContentModerator] = None


def get_moderator(strict_mode: bool = False) -> ContentModerator:
    """Get the content moderator singleton."""
    global _moderator
    if _moderator is None or _moderator.strict_mode != strict_mode:
        _moderator = ContentModerator(strict_mode=strict_mode)
    return _moderator


async def moderate_prompt(prompt: str) -> ModerationResult:
    """
    Convenience function to moderate a prompt (regex only, no OpenAI).

    Args:
        prompt: The prompt to moderate

    Returns:
        ModerationResult
    """
    moderator = get_moderator()
    return moderator.check(prompt)


async def moderate_content(content: str, use_openai: bool = True) -> ModerationResult:
    """
    Moderate content with OpenAI integration.

    This is the recommended function for moderating user content.
    It runs local regex checks first, then OpenAI moderation if enabled.

    Args:
        content: The content to moderate
        use_openai: Whether to use OpenAI as final layer (default True)

    Returns:
        ModerationResult
    """
    moderator = get_moderator()
    return await moderator.check_async(content, use_openai=use_openai)
