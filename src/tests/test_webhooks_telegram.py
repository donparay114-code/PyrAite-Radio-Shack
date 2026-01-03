
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from src.api.routes.webhooks import telegram_webhook, TelegramWebhookPayload
from src.services.telegram_bot import TelegramBot
from src.services.telegram_handlers import handle_request_command, handle_callback_query
from src.models import RadioQueue, User, QueueStatus, Vote, VoteType

# Mock the TelegramBot
@pytest.fixture
def mock_telegram_bot():
    bot = AsyncMock(spec=TelegramBot)
    bot._handlers = {"command": {}, "message": [], "callback_query": []}
    return bot

# Test the webhook endpoint
@pytest.mark.asyncio
async def test_telegram_webhook_valid_payload(mock_telegram_bot):
    with patch("src.api.routes.webhooks.get_telegram_bot", return_value=mock_telegram_bot):
        with patch("src.api.routes.webhooks.register_handlers") as mock_register:
            payload = TelegramWebhookPayload(
                update_id=12345,
                message={"message_id": 1, "text": "/request test song", "chat": {"id": 123}, "from": {"id": 123}}
            )

            response = await telegram_webhook(payload=payload)

            assert response["ok"] is True
            assert response["update_id"] == 12345
            mock_register.assert_called_once()
            mock_telegram_bot._process_update.assert_called_once()
            args = mock_telegram_bot._process_update.call_args[0][0]
            assert args["update_id"] == 12345

# Test daily limit logic in handle_request_command
@pytest.mark.asyncio
async def test_handle_request_command_daily_limit(mock_telegram_bot):
    with patch("src.services.telegram_handlers.get_telegram_bot", return_value=mock_telegram_bot):
        # Mock session and user
        mock_session = AsyncMock()
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.telegram_id = 123456
        mock_user.is_banned = False
        mock_user.max_daily_requests = 3
        mock_user.reputation_score = 100

        # Setup session maker context manager
        mock_session_maker = MagicMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session

        with patch("src.services.telegram_handlers.get_session_maker", return_value=mock_session_maker):
            with patch("src.services.telegram_handlers.get_or_create_user", return_value=mock_user):

                # Mock finding existing requests (daily limit exceeded)
                # We mock the return of session.execute(daily_query) to return 3 items
                mock_result = MagicMock()
                mock_result.scalars.return_value.all.return_value = [1, 2, 3] # 3 items
                mock_session.execute.return_value = mock_result

                message = {
                    "message_id": 1,
                    "text": "/request test song",
                    "chat": {"id": 123},
                    "from": {"id": 123, "username": "testuser"}
                }

                await handle_request_command(message)

                # Verify that a message about daily limit was sent
                mock_telegram_bot.send_message.assert_called_with(
                    123,
                    f"⚠️ You have reached your daily limit of {mock_user.max_daily_requests} requests.\n"
                    "Please try again tomorrow or upgrade your tier."
                )

# Test request command success
@pytest.mark.asyncio
async def test_handle_request_command_success(mock_telegram_bot):
    with patch("src.services.telegram_handlers.get_telegram_bot", return_value=mock_telegram_bot):
        # Mock session and user
        mock_session = AsyncMock()
        mock_user = MagicMock(spec=User)
        mock_user.id = 1
        mock_user.telegram_id = 123456
        mock_user.is_banned = False
        mock_user.max_daily_requests = 3
        mock_user.reputation_score = 100

        # Setup session maker context manager
        mock_session_maker = MagicMock()
        mock_session_maker.return_value.__aenter__.return_value = mock_session

        with patch("src.services.telegram_handlers.get_session_maker", return_value=mock_session_maker):
            with patch("src.services.telegram_handlers.get_or_create_user", return_value=mock_user):

                # Mock daily requests count = 0
                mock_daily_result = MagicMock()
                mock_daily_result.scalars.return_value.all.return_value = []

                # Mock pending requests count = 0
                mock_pending_result = MagicMock()
                mock_pending_result.scalars.return_value.all.return_value = []

                # Configure execute side effects
                # First call is daily_query, second is pending_query
                mock_session.execute.side_effect = [mock_daily_result, mock_pending_result]

                message = {
                    "message_id": 1,
                    "text": "/request valid song",
                    "chat": {"id": 123},
                    "from": {"id": 123, "username": "testuser"}
                }

                await handle_request_command(message)

                # Verify that request was added
                mock_session.add.assert_called_once()
                args = mock_session.add.call_args[0][0]
                assert isinstance(args, RadioQueue)
                assert args.original_prompt == "valid song"

                # Verify success message
                mock_telegram_bot.send_message.assert_called_with(
                    123,
                    f"✅ Request received!\n\n"
                    f"<b>Prompt:</b> valid song\n\n"
                    f"You will be notified when your song starts generating.",
                    reply_to_message_id=1
                )
