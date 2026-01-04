import logging

import socketio

from src.utils.config import settings

logger = logging.getLogger(__name__)

# Configure Redis manager if URL is available
client_manager = None
if settings.redis_url:
    try:
        client_manager = socketio.AsyncRedisManager(settings.redis_url)
        logger.info(f"Socket.IO using Redis manager at {settings.redis_url}")
    except Exception as e:
        logger.warning(f"Failed to initialize Redis manager: {e}")

# Create a Socket.IO server
# cors_allowed_origins='*' allows connection from any origin (e.g., localhost:3000)
sio = socketio.AsyncServer(
    async_mode="asgi", cors_allowed_origins="*", client_manager=client_manager
)

# Create an ASGI app
sio_app = socketio.ASGIApp(sio)

from urllib.parse import parse_qs


@sio.event
async def connect(sid, environ):
    logger.info(f"Socket connected: {sid}")
    # Handle query string to auto-join channel if provided
    query_string = environ.get("QUERY_STRING", "")
    params = parse_qs(query_string)
    channel_id = params.get("channelId", [None])[0]

    if channel_id:
        logger.info(f"Socket {sid} auto-joining channel {channel_id} from query param")
        sio.enter_room(sid, channel_id)


@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")


@sio.on("join-channel")
async def join_channel(sid, channel_id):
    logger.info(f"Socket {sid} joined channel {channel_id}")
    sio.enter_room(sid, channel_id)
    # Emit initial stats or data if needed


async def emit_moderation_settings_changed(channel_id: str, data: dict):
    """Broadcast moderation settings change to a channel."""
    await sio.emit("moderation-settings-changed", data, room=channel_id)


async def emit_vote_updated(queue_id: int, upvotes: int, downvotes: int, score: int):
    """Broadcast vote update to all connected clients."""
    data = {
        "queue_id": queue_id,
        "upvotes": upvotes,
        "downvotes": downvotes,
        "score": score,
    }
    logger.debug(f"Emitting vote_updated: {data}")
    await sio.emit("vote_updated", data)


async def emit_queue_updated(queue_data: dict):
    """Broadcast queue list update to all connected clients."""
    logger.debug(f"Emitting queue_updated for {len(queue_data.get('items', []))} items")
    await sio.emit("queue_updated", queue_data)


async def emit_generation_progress(
    queue_id: int, status: str, progress_msg: str, eta: str | None = None
):
    """Broadcast generation progress update."""
    data = {
        "queue_id": queue_id,
        "status": status,
        "progress_msg": progress_msg,
        "eta": eta,
    }
    logger.debug(f"Emitting generation_progress: {data}")
    await sio.emit("generation_progress", data)


async def emit_now_playing(song_data: dict):
    """Broadcast now playing update to all clients."""
    logger.debug(f"Emitting now_playing: {song_data.get('title', 'Unknown')}")
    await sio.emit("now_playing", song_data)


# ============================================================================
# Chat Events
# ============================================================================


async def emit_chat_message(message_data: dict):
    """Broadcast new chat message to all connected clients."""
    logger.debug(f"Emitting chat_message: {message_data.get('id')}")
    await sio.emit("chat_message", message_data)


async def emit_chat_delete(message_id: int):
    """Broadcast chat message deletion to all connected clients."""
    logger.debug(f"Emitting chat_delete: {message_id}")
    await sio.emit("chat_delete", {"id": message_id})


async def emit_chat_update(message_data: dict):
    """Broadcast chat message update to all connected clients."""
    logger.debug(f"Emitting chat_update: {message_data.get('id')}")
    await sio.emit("chat_update", message_data)
