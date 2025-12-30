"""Content moderation service for song prompts and user input."""

import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


logger = logging.getLogger(__name__)


class ModerationCategory(str, Enum):
    """Categories of content violations."""

    SAFE = "safe"
    PROFANITY = "profanity"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    SEXUAL = "sexual"
    DRUGS = "drugs"
    SPAM = "spam"
    PROMPT_INJECTION = "prompt_injection"
    COPYRIGHT = "copyright"
    PERSONAL_INFO = "personal_info"


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
    """Moderates user-submitted content for safety and policy compliance."""

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

    def __init__(self, strict_mode: bool = False):
        """
        Initialize the moderator.

        Args:
            strict_mode: If True, be more aggressive with filtering
        """
        self.strict_mode = strict_mode
        self._compile_patterns()

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

        # Check each category
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
    Convenience function to moderate a prompt.

    Args:
        prompt: The prompt to moderate

    Returns:
        ModerationResult
    """
    moderator = get_moderator()
    return moderator.check(prompt)
