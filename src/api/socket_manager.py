import socketio
import logging

logger = logging.getLogger(__name__)

# Create a Socket.IO server
# cors_allowed_origins='*' allows connection from any origin (e.g., localhost:3000)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

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

@sio.on('join-channel')
async def join_channel(sid, channel_id):
    logger.info(f"Socket {sid} joined channel {channel_id}")
    sio.enter_room(sid, channel_id)
    # Emit initial stats or data if needed

async def emit_moderation_settings_changed(channel_id: str, data: dict):
    """Broadcast moderation settings change to a channel."""
    await sio.emit('moderation-settings-changed', data, room=channel_id)
