"""Telegram bot command and callback handlers."""

import logging
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from src.models import RadioQueue, QueueStatus, User, Vote, VoteType
from src.models.base import get_async_engine
from src.services.telegram_bot import TelegramBot, CallbackAction, get_telegram_bot
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

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


async def handle_request_command(message: dict):
    """Handle /request command."""
    bot = get_telegram_bot()
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "")
    from_user = message.get("from")

    if not chat_id or not from_user:
        return

    # Extract prompt
    parts = text.split(" ", 1)
    if len(parts) < 2:
        await bot.send_message(
            chat_id,
            "Please provide a description for your song.\n\n"
            "Example: <code>/request chill lo-fi beats for studying</code>"
        )
        return

    prompt = parts[1].strip()
    if not prompt:
        await bot.send_message(
            chat_id,
            "Please provide a description for your song."
        )
        return

    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            user = await get_or_create_user(session, from_user)

            if user.is_banned:
                await bot.send_message(
                    chat_id,
                    f"🚫 You are banned from making requests.\nReason: {user.ban_reason or 'No reason provided'}"
                )
                return

            # Check daily limit
            # TODO: Implement daily limit check based on created_at

            # Check for existing pending requests
            # We want to limit how many pending requests a user can have
            query = select(RadioQueue).where(
                and_(
                    RadioQueue.user_id == user.id,
                    RadioQueue.status.in_([QueueStatus.PENDING.value, QueueStatus.QUEUED.value])
                )
            )
            result = await session.execute(query)
            pending_count = len(result.scalars().all())

            # Limit to 3 pending requests per user for now
            if pending_count >= 3:
                await bot.send_message(
                    chat_id,
                    "⚠️ You already have 3 pending requests. Please wait for them to complete."
                )
                return

            # Create queue item
            queue_item = RadioQueue(
                user_id=user.id,
                telegram_user_id=user.telegram_id,
                telegram_message_id=message.get("message_id"),
                original_prompt=prompt,
                status=QueueStatus.PENDING.value,
                # Initial priority score based on user reputation
                priority_score=100.0 + (user.reputation_score * 0.5)
            )
            session.add(queue_item)
            await session.flush()
            await session.refresh(queue_item)

            await session.commit()

            # Send confirmation
            await bot.send_message(
                chat_id,
                f"✅ Request received!\n\n"
                f"<b>Prompt:</b> {prompt}\n\n"
                f"You will be notified when your song starts generating.",
                reply_to_message_id=message.get("message_id")
            )

        except Exception as e:
            logger.error(f"Error handling request command: {e}")
            await session.rollback()
            await bot.send_message(
                chat_id,
                "❌ An error occurred while processing your request. Please try again later."
            )


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
                    await bot.answer_callback_query(callback_id, "Request not found", show_alert=True)
                    return

                # Check if user owns the request (optional: prevent self-voting?)
                if queue_item.user_id == user.id:
                    await bot.answer_callback_query(callback_id, "You cannot vote on your own request", show_alert=True)
                    return

                vote_type = VoteType.UPVOTE.value if action == CallbackAction.UPVOTE.value else VoteType.DOWNVOTE.value

                # Check for existing vote
                vote_query = select(Vote).where(
                    and_(
                        Vote.user_id == user.id,
                        Vote.queue_item_id == queue_id
                    )
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
                        telegram_callback_id=callback_id
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
                     requester_query = select(User.reputation_score).where(User.id == queue_item.user_id)
                     requester_res = await session.execute(requester_query)
                     requester_rep = requester_res.scalar() or 0.0

                queue_item.update_priority(requester_rep)

                await session.commit()
                await bot.answer_callback_query(callback_id, response_text)

                # Update message keyboard
                # We need to reconstruct the keyboard with new counts
                if message and message.get("chat"):
                    keyboard = bot.vote_keyboard(queue_id, queue_item.upvotes, queue_item.downvotes)
                    # We only update if the counts changed. The vote_keyboard function generates buttons.

                    try:
                        await bot.edit_message(
                            chat_id=message["chat"]["id"],
                            message_id=message["message_id"],
                            text=message.get("text", "Song Request"), # Keep existing text
                            reply_markup=keyboard,
                            parse_mode="HTML" # Assume HTML
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


def register_handlers(bot: TelegramBot):
    """Register all handlers to the bot instance."""
    bot.on_command("request")(handle_request_command)
    bot.on_callback(handle_callback_query)
    logger.info("Telegram handlers registered")
