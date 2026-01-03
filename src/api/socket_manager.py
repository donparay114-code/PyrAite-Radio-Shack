import socketio
import logging
from urllib.parse import parse_qs
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
