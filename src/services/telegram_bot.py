"""Telegram bot service for radio station interactions."""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Callable, Optional

import httpx

from src.utils.config import settings

logger = logging.getLogger(__name__)


class CallbackAction(str, Enum):
    """Telegram callback button actions."""

    UPVOTE = "vote_up"
    DOWNVOTE = "vote_down"
    SKIP = "skip"
    INFO = "info"
    CANCEL = "cancel"
    CONFIRM = "confirm"


@dataclass
class TelegramUser:
    """Telegram user data."""

    id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_bot: bool = False

    @property
    def display_name(self) -> str:
        if self.username:
            return f"@{self.username}"
        if self.first_name:
            name = self.first_name
            if self.last_name:
                name += f" {self.last_name}"
            return name
        return f"User {self.id}"


@dataclass
class TelegramMessage:
    """Telegram message data."""

    message_id: int
    chat_id: int
    text: Optional[str] = None
    user: Optional[TelegramUser] = None
    date: Optional[datetime] = None
    reply_to_message_id: Optional[int] = None


@dataclass
class CallbackQuery:
    """Telegram callback query data."""

    id: str
    user: TelegramUser
    message: Optional[TelegramMessage] = None
    data: Optional[str] = None


class TelegramBot:
    """Telegram bot client for radio station."""

    BASE_URL = "https://api.telegram.org/bot{token}"

    def __init__(
        self,
        token: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.token = token or settings.telegram_bot_token
        if not self.token:
            raise ValueError("Telegram bot token not configured")

        self.base_url = self.BASE_URL.format(token=self.token)
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._handlers: dict[str, list[Callable]] = {
            "message": [],
            "callback_query": [],
            "command": {},
        }
        self._running = False

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _request(self, method: str, **params) -> dict:
        """Make a request to Telegram API."""
        client = await self._get_client()
        url = f"{self.base_url}/{method}"

        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}

        try:
            response = await client.post(url, json=params)
            response.raise_for_status()
            data = response.json()

            if not data.get("ok"):
                raise Exception(f"Telegram API error: {data.get('description')}")

            return data.get("result", {})
        except httpx.HTTPStatusError as e:
            logger.error(f"Telegram API HTTP error: {e}")
            raise
        except Exception as e:
            logger.error(f"Telegram API error: {e}")
            raise

    # Message sending methods
    async def send_message(
        self,
        chat_id: int,
        text: str,
        parse_mode: str = "HTML",
        reply_to_message_id: Optional[int] = None,
        reply_markup: Optional[dict] = None,
        disable_notification: bool = False,
    ) -> dict:
        """Send a text message."""
        return await self._request(
            "sendMessage",
            chat_id=chat_id,
            text=text,
            parse_mode=parse_mode,
            reply_to_message_id=reply_to_message_id,
            reply_markup=reply_markup,
            disable_notification=disable_notification,
        )

    async def edit_message(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        parse_mode: str = "HTML",
        reply_markup: Optional[dict] = None,
    ) -> dict:
        """Edit an existing message."""
        return await self._request(
            "editMessageText",
            chat_id=chat_id,
            message_id=message_id,
            text=text,
            parse_mode=parse_mode,
            reply_markup=reply_markup,
        )

    async def delete_message(self, chat_id: int, message_id: int) -> bool:
        """Delete a message."""
        try:
            await self._request(
                "deleteMessage",
                chat_id=chat_id,
                message_id=message_id,
            )
            return True
        except Exception:
            return False

    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False,
    ) -> bool:
        """Answer a callback query (button press)."""
        try:
            await self._request(
                "answerCallbackQuery",
                callback_query_id=callback_query_id,
                text=text,
                show_alert=show_alert,
            )
            return True
        except Exception:
            return False

    async def send_audio(
        self,
        chat_id: int,
        audio_url: str,
        caption: Optional[str] = None,
        title: Optional[str] = None,
        performer: Optional[str] = None,
        duration: Optional[int] = None,
        reply_markup: Optional[dict] = None,
    ) -> dict:
        """Send an audio file."""
        return await self._request(
            "sendAudio",
            chat_id=chat_id,
            audio=audio_url,
            caption=caption,
            title=title,
            performer=performer,
            duration=duration,
            reply_markup=reply_markup,
        )

    # Keyboard builders
    @staticmethod
    def inline_keyboard(buttons: list[list[dict]]) -> dict:
        """Build inline keyboard markup."""
        return {"inline_keyboard": buttons}

    @staticmethod
    def button(text: str, callback_data: str) -> dict:
        """Build inline keyboard button."""
        return {"text": text, "callback_data": callback_data}

    @staticmethod
    def url_button(text: str, url: str) -> dict:
        """Build URL button."""
        return {"text": text, "url": url}

    def vote_keyboard(self, queue_id: int, upvotes: int = 0, downvotes: int = 0) -> dict:
        """Build voting keyboard for a queue item."""
        return self.inline_keyboard([
            [
                self.button(f"👍 {upvotes}", f"{CallbackAction.UPVOTE.value}:{queue_id}"),
                self.button(f"👎 {downvotes}", f"{CallbackAction.DOWNVOTE.value}:{queue_id}"),
            ],
            [
                self.button("ℹ️ Info", f"{CallbackAction.INFO.value}:{queue_id}"),
                self.button("⏭ Skip", f"{CallbackAction.SKIP.value}:{queue_id}"),
            ],
        ])

    def confirm_keyboard(self, action: str, item_id: int) -> dict:
        """Build confirmation keyboard."""
        return self.inline_keyboard([
            [
                self.button("✅ Confirm", f"{CallbackAction.CONFIRM.value}:{action}:{item_id}"),
                self.button("❌ Cancel", f"{CallbackAction.CANCEL.value}:{action}:{item_id}"),
            ],
        ])

    # Message formatters
    def format_queue_item(
        self,
        position: int,
        prompt: str,
        requester: str,
        status: str,
        upvotes: int = 0,
        downvotes: int = 0,
    ) -> str:
        """Format queue item for display."""
        status_emoji = {
            "pending": "⏳",
            "generating": "🎵",
            "generated": "✅",
            "broadcasting": "📻",
            "completed": "✓",
            "failed": "❌",
        }.get(status, "❓")

        return (
            f"<b>#{position}</b> {status_emoji}\n"
            f"<i>{prompt[:100]}{'...' if len(prompt) > 100 else ''}</i>\n"
            f"👤 {requester}\n"
            f"👍 {upvotes} | 👎 {downvotes}"
        )

    def format_now_playing(
        self,
        title: str,
        requester: str,
        genre: Optional[str] = None,
        duration: Optional[str] = None,
    ) -> str:
        """Format now playing message."""
        lines = [
            "🎵 <b>Now Playing</b>",
            f"<b>{title}</b>",
            f"👤 Requested by {requester}",
        ]
        if genre:
            lines.append(f"🎸 {genre}")
        if duration:
            lines.append(f"⏱ {duration}")
        return "\n".join(lines)

    def format_queue_status(
        self,
        pending: int,
        generating: int,
        total_today: int,
    ) -> str:
        """Format queue status message."""
        return (
            "📊 <b>Queue Status</b>\n\n"
            f"⏳ Pending: {pending}\n"
            f"🎵 Generating: {generating}\n"
            f"✅ Completed today: {total_today}"
        )

    def format_user_stats(
        self,
        display_name: str,
        reputation: float,
        tier: str,
        total_requests: int,
        success_rate: float,
    ) -> str:
        """Format user stats message."""
        tier_emoji = {
            "new": "🌱",
            "regular": "⭐",
            "trusted": "🌟",
            "vip": "💎",
            "elite": "👑",
        }.get(tier, "")

        return (
            f"👤 <b>{display_name}</b>\n\n"
            f"🏆 Reputation: {reputation:.0f}\n"
            f"{tier_emoji} Tier: {tier.capitalize()}\n"
            f"🎵 Requests: {total_requests}\n"
            f"✅ Success rate: {success_rate:.0%}"
        )

    # Polling and updates
    async def get_updates(
        self,
        offset: Optional[int] = None,
        timeout: int = 30,
        allowed_updates: Optional[list[str]] = None,
    ) -> list[dict]:
        """Get updates via long polling."""
        return await self._request(
            "getUpdates",
            offset=offset,
            timeout=timeout,
            allowed_updates=allowed_updates or ["message", "callback_query"],
        )

    def on_command(self, command: str):
        """Decorator to register command handler."""
        def decorator(func: Callable):
            self._handlers["command"][command] = func
            return func
        return decorator

    def on_message(self, func: Callable):
        """Decorator to register message handler."""
        self._handlers["message"].append(func)
        return func

    def on_callback(self, func: Callable):
        """Decorator to register callback handler."""
        self._handlers["callback_query"].append(func)
        return func

    async def _process_update(self, update: dict) -> None:
        """Process a single update."""
        if "message" in update:
            message = update["message"]
            text = message.get("text", "")

            # Check for commands
            if text.startswith("/"):
                command = text.split()[0][1:].split("@")[0]
                handler = self._handlers["command"].get(command)
                if handler:
                    await handler(message)
                    return

            # Regular message handlers
            for handler in self._handlers["message"]:
                await handler(message)

        elif "callback_query" in update:
            callback = update["callback_query"]
            for handler in self._handlers["callback_query"]:
                await handler(callback)

    async def start_polling(self) -> None:
        """Start polling for updates."""
        self._running = True
        offset = None
        logger.info("Telegram bot started polling")

        while self._running:
            try:
                updates = await self.get_updates(offset=offset)
                for update in updates:
                    offset = update["update_id"] + 1
                    await self._process_update(update)
            except Exception as e:
                logger.error(f"Polling error: {e}")
                await asyncio.sleep(5)

    def stop_polling(self) -> None:
        """Stop polling."""
        self._running = False
        logger.info("Telegram bot stopped polling")


# Singleton instance
_telegram_bot: Optional[TelegramBot] = None


def get_telegram_bot() -> TelegramBot:
    """Get the Telegram bot singleton."""
    global _telegram_bot
    if _telegram_bot is None:
        _telegram_bot = TelegramBot()
    return _telegram_bot
