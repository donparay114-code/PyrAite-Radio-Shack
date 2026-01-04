"""Telegram bot command and callback handlers."""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.models import QueueStatus, RadioQueue, User, Vote, VoteType
from src.models.base import get_async_engine
from src.services.telegram_bot import CallbackAction, TelegramBot, get_telegram_bot

logger = logging.getLogger(__name__)

# Create session maker for handlers
_session_maker: Optional[async_sessionmaker[AsyncSession]] = None


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Get or create session maker."""
    global _session_maker
    if _session_maker is None:
        engine = get_async_engine()
        _session_maker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
    return _session_maker


async def get_or_create_user(session: AsyncSession, telegram_user: dict) -> User:
    """Get or create a user from Telegram data."""
    telegram_id = telegram_user.get("id")
    if not telegram_id:
        raise ValueError("No Telegram ID provided")

    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=telegram_id,
            telegram_username=telegram_user.get("username"),
            telegram_first_name=telegram_user.get("first_name"),
            telegram_last_name=telegram_user.get("last_name"),
        )
        session.add(user)
        await session.flush()
    else:
        # Update info if changed
        changed = False
        if user.telegram_username != telegram_user.get("username"):
            user.telegram_username = telegram_user.get("username")
            changed = True
        if user.telegram_first_name != telegram_user.get("first_name"):
            user.telegram_first_name = telegram_user.get("first_name")
            changed = True
        if user.telegram_last_name != telegram_user.get("last_name"):
            user.telegram_last_name = telegram_user.get("last_name")
            changed = True

        if changed:
            await session.flush()

    return user


async def process_song_request(
    chat_id: int, prompt: str, from_user: dict, message: dict
) -> bool:
    """
    Shared logic for processing song requests.

    Args:
        chat_id: Telegram chat ID
        prompt: Song prompt/description
        from_user: Telegram user dict
        message: Original message dict

    Returns:
        True if request was successful, False otherwise
    """
    bot = get_telegram_bot()

    # Content moderation with OpenAI
    from src.services.moderation import moderate_content

    moderation_result = await moderate_content(prompt, use_openai=True)
    if not moderation_result.passed:
        logger.warning(
            f"Request blocked by moderation: user={from_user.get('id')}, "
            f"category={moderation_result.category.value}, "
            f"reason={moderation_result.reason}"
        )
        await bot.send_message(
            chat_id,
            f"⚠️ Your request could not be processed.\n\n"
            f"<b>Reason:</b> {moderation_result.reason}\n\n"
            f"Please modify your prompt and try again.",
            reply_to_message_id=message.get("message_id"),
        )
        return False

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            user = await get_or_create_user(session, from_user)

            if user.is_banned:
                await bot.send_message(
                    chat_id,
                    f"🚫 You are banned from making requests.\nReason: {user.ban_reason or 'No reason provided'}",
                )
                return False

            # Check daily limit
            today_start = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            today_requests = await session.scalar(
                select(func.count())
                .select_from(RadioQueue)
                .where(
                    and_(
                        RadioQueue.user_id == user.id,
                        RadioQueue.created_at >= today_start,
                    )
                )
            )

            daily_limit = user.max_daily_requests
            if today_requests >= daily_limit:
                tier_info = (
                    f"(Premium {user.tier.value})" if user.is_premium else "(Free tier)"
                )
                await bot.send_message(
                    chat_id,
                    f"⚠️ You've reached your daily limit of {daily_limit} requests {tier_info}.\n\n"
                    f"Your limit resets at midnight UTC.\n"
                    f"Upgrade to premium for more requests!",
                    reply_to_message_id=message.get("message_id"),
                )
                return False

            # Check cooldown between requests
            cooldown_seconds = 30 if user.is_premium else 60  # Premium: 30s, Free: 60s
            if user.last_request_at:
                elapsed = (datetime.utcnow() - user.last_request_at).total_seconds()
                if elapsed < cooldown_seconds:
                    remaining = int(cooldown_seconds - elapsed)
                    await bot.send_message(
                        chat_id,
                        f"⏳ Please wait {remaining} seconds before your next request.",
                        reply_to_message_id=message.get("message_id"),
                    )
                    return False

            # Check for existing pending requests
            # We want to limit how many pending requests a user can have
            query = select(RadioQueue).where(
                and_(
                    RadioQueue.user_id == user.id,
                    RadioQueue.status.in_(
                        [QueueStatus.PENDING.value, QueueStatus.QUEUED.value]
                    ),
                )
            )
            result = await session.execute(query)
            pending_count = len(result.scalars().all())

            # Limit to 3 pending requests per user for now
            if pending_count >= 3:
                await bot.send_message(
                    chat_id,
                    "⚠️ You already have 3 pending requests. Please wait for them to complete.",
                )
                return False

            # Create queue item
            queue_item = RadioQueue(
                user_id=user.id,
                telegram_user_id=user.telegram_id,
                telegram_message_id=message.get("message_id"),
                original_prompt=prompt,
                status=QueueStatus.PENDING.value,
                # Initial priority score based on user reputation
                priority_score=100.0 + (user.reputation_score * 0.5),
            )
            session.add(queue_item)
            await session.flush()
            await session.refresh(queue_item)

            # Update last request timestamp for cooldown tracking
            user.last_request_at = datetime.utcnow()

            await session.commit()

            # Send confirmation
            await bot.send_message(
                chat_id,
                f"✅ Request received!\n\n"
                f"<b>Prompt:</b> {prompt}\n\n"
                f"You will be notified when your song starts generating.",
                reply_to_message_id=message.get("message_id"),
            )
            return True

        except Exception as e:
            logger.error(f"Error processing song request: {e}")
            await session.rollback()
            await bot.send_message(
                chat_id,
                "❌ An error occurred while processing your request. Please try again later.",
            )
            return False


async def handle_request_command(message: dict):
    """Handle /request command."""
    bot = get_telegram_bot()
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    from_user = message.get("from")

    if not chat_id or not from_user:
        return

    # Extract prompt from command
    parts = text.split(" ", 1)
    if len(parts) < 2:
        await bot.send_message(
            chat_id,
            "Please provide a description for your song.\n\n"
            "Example: <code>/request chill lo-fi beats for studying</code>",
        )
        return

    prompt = parts[1].strip()
    if not prompt:
        await bot.send_message(chat_id, "Please provide a description for your song.")
        return

    await process_song_request(chat_id, prompt, from_user, message)


async def handle_text_message(message: dict):
    """
    Handle plain text messages as song requests.

    Users can simply type their song description without /request command.
    """
    text = message.get("text", "").strip()

    # Skip if empty or starts with / (already handled by command handlers)
    if not text or text.startswith("/"):
        return

    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from")

    if not chat_id or not from_user:
        return

    # Treat plain text as song request prompt
    await process_song_request(chat_id, text, from_user, message)


async def handle_callback_query(callback: dict):
    """Handle callback queries (buttons)."""
    bot = get_telegram_bot()
    callback_id = callback.get("id")
    data = callback.get("data", "")
    from_user = callback.get("from")
    message = callback.get("message")

    if not callback_id or not data or not from_user:
        return

    # Parse data: action:queue_id or action:arg:queue_id
    parts = data.split(":")
    action = parts[0]

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            if action in (CallbackAction.UPVOTE.value, CallbackAction.DOWNVOTE.value):
                if len(parts) < 2:
                    await bot.answer_callback_query(callback_id, "Invalid data")
                    return

                try:
                    queue_id = int(parts[1])
                except ValueError:
                    await bot.answer_callback_query(callback_id, "Invalid queue ID")
                    return

                user = await get_or_create_user(session, from_user)

                # Get queue item
                query = select(RadioQueue).where(RadioQueue.id == queue_id)
                result = await session.execute(query)
                queue_item = result.scalar_one_or_none()

                if not queue_item:
                    await bot.answer_callback_query(
                        callback_id, "Request not found", show_alert=True
                    )
                    return

                # Check if user owns the request (optional: prevent self-voting?)
                if queue_item.user_id == user.id:
                    await bot.answer_callback_query(
                        callback_id,
                        "You cannot vote on your own request",
                        show_alert=True,
                    )
                    return

                vote_type = (
                    VoteType.UPVOTE.value
                    if action == CallbackAction.UPVOTE.value
                    else VoteType.DOWNVOTE.value
                )

                # Check for existing vote
                vote_query = select(Vote).where(
                    and_(Vote.user_id == user.id, Vote.queue_item_id == queue_id)
                )
                vote_result = await session.execute(vote_query)
                existing_vote = vote_result.scalar_one_or_none()

                response_text = ""

                if existing_vote:
                    if existing_vote.vote_type == vote_type:
                        # Toggle off (remove vote)
                        await session.delete(existing_vote)
                        if vote_type == VoteType.UPVOTE.value:
                            queue_item.upvotes = max(0, queue_item.upvotes - 1)
                        else:
                            queue_item.downvotes = max(0, queue_item.downvotes - 1)
                        response_text = "Vote removed"
                    else:
                        # Change vote
                        old_type = existing_vote.vote_type
                        existing_vote.flip_vote()
                        if old_type == VoteType.UPVOTE.value:
                            queue_item.upvotes = max(0, queue_item.upvotes - 1)
                            queue_item.downvotes += 1
                        else:
                            queue_item.downvotes = max(0, queue_item.downvotes - 1)
                            queue_item.upvotes += 1
                        response_text = "Vote changed"
                else:
                    # New vote
                    new_vote = Vote(
                        user_id=user.id,
                        telegram_user_id=user.telegram_id,
                        queue_item_id=queue_id,
                        vote_type=vote_type,
                        telegram_callback_id=callback_id,
                    )
                    session.add(new_vote)
                    if vote_type == VoteType.UPVOTE.value:
                        queue_item.upvotes += 1
                    else:
                        queue_item.downvotes += 1
                    response_text = "Voted!"

                # Recalculate priority
                # Note: user_reputation is needed for full priority calculation,
                # but we might not have the request creator's reputation handy without a join or extra query.
                # For now, let's just trigger a simple update or let the queue manager handle recalculation later.
                # However, updating the queue item priority now is good.

                requester_rep = 0.0
                if queue_item.user_id:
                    requester_query = select(User.reputation_score).where(
                        User.id == queue_item.user_id
                    )
                    requester_res = await session.execute(requester_query)
                    requester_rep = requester_res.scalar() or 0.0

                queue_item.update_priority(requester_rep)

                await session.commit()
                await bot.answer_callback_query(callback_id, response_text)

                # Update message keyboard
                # We need to reconstruct the keyboard with new counts
                if message and message.get("chat"):
                    keyboard = bot.vote_keyboard(
                        queue_id, queue_item.upvotes, queue_item.downvotes
                    )
                    # We only update if the counts changed. The vote_keyboard function generates buttons.

                    try:
                        await bot.edit_message(
                            chat_id=message["chat"]["id"],
                            message_id=message["message_id"],
                            text=message.get(
                                "text", "Song Request"
                            ),  # Keep existing text
                            reply_markup=keyboard,
                            parse_mode="HTML",  # Assume HTML
                        )
                    except Exception as e:
                        # Message might not be modified
                        logger.warning(f"Failed to update message keyboard: {e}")

            elif action == CallbackAction.INFO.value:
                # Show info about the request
                # For now just answer
                await bot.answer_callback_query(callback_id, "Info not implemented yet")

            else:
                await bot.answer_callback_query(callback_id, "Unknown action")

        except Exception as e:
            logger.error(f"Error handling callback: {e}")
            await session.rollback()
            await bot.answer_callback_query(callback_id, "Error processing request")


async def handle_start_command(message: dict):
    """Handle /start command - Welcome message."""
    bot = get_telegram_bot()
    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from", {})

    if not chat_id:
        return

    first_name = from_user.get("first_name", "there")

    welcome_message = (
        f"👋 Welcome to <b>PYrte Radio</b>, {first_name}!\n\n"
        f"🎵 I'm an AI-powered community radio station. Request songs and I'll generate them with Suno AI!\n\n"
        f"<b>How to request:</b>\n"
        f'• Just type your song idea (e.g., "chill lo-fi beats for studying")\n'
        f"• Or use <code>/request your prompt here</code>\n\n"
        f"<b>Commands:</b>\n"
        f"/request - Request a song\n"
        f"/status - View queue statistics\n"
        f"/me - View your stats\n"
        f"/help - Show this help message\n\n"
        f"🎧 Start by typing your song request!"
    )

    await bot.send_message(chat_id, welcome_message)


async def handle_help_command(message: dict):
    """Handle /help command."""
    bot = get_telegram_bot()
    chat_id = message.get("chat", {}).get("id")

    if not chat_id:
        return

    help_message = (
        "📻 <b>PYrte Radio Help</b>\n\n"
        "<b>Requesting Songs:</b>\n"
        "• Just type your song idea directly!\n"
        '• Example: "upbeat synthwave for working out"\n'
        "• Or use: <code>/request [prompt]</code>\n\n"
        "<b>Commands:</b>\n"
        "/request [prompt] - Request a song\n"
        "/status - View queue statistics\n"
        "/me - View your profile and stats\n"
        "/help - Show this message\n\n"
        "<b>Daily Limits:</b>\n"
        "• Free users: 5 requests/day\n"
        "• Premium users: 10-50 requests/day\n\n"
        "<b>Voting:</b>\n"
        "• 👍 Upvote songs you like\n"
        "• 👎 Downvote songs you don't\n"
        "• Your votes affect queue priority!\n\n"
        "🎵 Enjoy the music!"
    )

    await bot.send_message(chat_id, help_message)


async def handle_status_command(message: dict):
    """Handle /status command - Queue statistics."""
    bot = get_telegram_bot()
    chat_id = message.get("chat", {}).get("id")

    if not chat_id:
        return

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            from sqlalchemy import func as sqlfunc

            # Get queue counts by status
            pending_count = await session.scalar(
                select(sqlfunc.count())
                .select_from(RadioQueue)
                .where(RadioQueue.status == QueueStatus.PENDING.value)
            )
            generating_count = await session.scalar(
                select(sqlfunc.count())
                .select_from(RadioQueue)
                .where(RadioQueue.status == QueueStatus.GENERATING.value)
            )
            generated_count = await session.scalar(
                select(sqlfunc.count())
                .select_from(RadioQueue)
                .where(RadioQueue.status == QueueStatus.GENERATED.value)
            )

            # Get today's completed count
            today_start = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            completed_today = await session.scalar(
                select(sqlfunc.count())
                .select_from(RadioQueue)
                .where(
                    and_(
                        RadioQueue.status == QueueStatus.PLAYED.value,
                        RadioQueue.played_at >= today_start,
                    )
                )
            )

            status_message = (
                "📊 <b>Queue Status</b>\n\n"
                f"⏳ Pending: {pending_count or 0}\n"
                f"🔄 Generating: {generating_count or 0}\n"
                f"✅ Ready to play: {generated_count or 0}\n"
                f"🎵 Played today: {completed_today or 0}\n\n"
                f"💡 <i>Songs are processed by priority based on votes and user reputation.</i>"
            )

            await bot.send_message(chat_id, status_message)

        except Exception as e:
            logger.error(f"Error fetching status: {e}")
            await bot.send_message(
                chat_id, "❌ Error fetching queue status. Please try again."
            )


async def handle_me_command(message: dict):
    """Handle /me command - User stats."""
    bot = get_telegram_bot()
    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from")

    if not chat_id or not from_user:
        return

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            user = await get_or_create_user(session, from_user)

            # Count user's requests
            from sqlalchemy import func as sqlfunc

            total_requests = await session.scalar(
                select(sqlfunc.count())
                .select_from(RadioQueue)
                .where(RadioQueue.user_id == user.id)
            )

            # Today's requests
            today_start = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            today_requests = await session.scalar(
                select(sqlfunc.count())
                .select_from(RadioQueue)
                .where(
                    and_(
                        RadioQueue.user_id == user.id,
                        RadioQueue.created_at >= today_start,
                    )
                )
            )

            daily_limit = user.max_daily_requests
            remaining = max(0, daily_limit - (today_requests or 0))

            # Format tier display
            tier_emoji = {
                "new": "🌱",
                "regular": "⭐",
                "trusted": "🌟",
                "vip": "💫",
                "elite": "👑",
            }
            tier_display = tier_emoji.get(user.tier.value, "⭐")

            premium_badge = " 💎 Premium" if user.is_premium else ""

            me_message = (
                f"👤 <b>Your Profile</b>{premium_badge}\n\n"
                f"<b>Name:</b> {user.display_name}\n"
                f"<b>Tier:</b> {tier_display} {user.tier.value.title()}\n"
                f"<b>Reputation:</b> {user.reputation_score:.1f}\n\n"
                f"<b>📊 Stats</b>\n"
                f"Total requests: {total_requests or 0}\n"
                f"Today: {today_requests or 0}/{daily_limit}\n"
                f"Remaining today: {remaining}\n\n"
            )

            if user.is_banned:
                me_message += f"⚠️ <b>Status:</b> Banned\nReason: {user.ban_reason or 'Not specified'}"
            else:
                me_message += "✅ <b>Status:</b> Active"

            await bot.send_message(chat_id, me_message)

        except Exception as e:
            logger.error(f"Error fetching user stats: {e}")
            await bot.send_message(
                chat_id, "❌ Error fetching your stats. Please try again."
            )


def register_handlers(bot: TelegramBot):
    """Register all handlers to the bot instance."""
    # Command handlers
    bot.on_command("start")(handle_start_command)
    bot.on_command("help")(handle_help_command)
    bot.on_command("status")(handle_status_command)
    bot.on_command("me")(handle_me_command)
    bot.on_command("request")(handle_request_command)

    # Message and callback handlers
    bot.on_message(handle_text_message)  # Allow plain text song requests
    bot.on_callback(handle_callback_query)

    logger.info("Telegram handlers registered")
