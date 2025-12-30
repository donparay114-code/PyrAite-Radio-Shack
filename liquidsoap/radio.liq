#!/usr/bin/liquidsoap

# PYrte Radio Shack - Liquidsoap Configuration
# AI-powered community radio station

# ============================================
# SETTINGS
# ============================================

settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)

# Audio settings
settings.frame.audio.samplerate.set(44100)
settings.frame.audio.channels.set(2)

# Logging
settings.log.file.set(true)
settings.log.file.path.set("/var/log/liquidsoap/radio.log")
settings.log.level.set(3)

# ============================================
# ENVIRONMENT VARIABLES
# ============================================

songs_dir = getenv("SONGS_DIR") ?? "/app/data/songs"
fallback_dir = getenv("FALLBACK_DIR") ?? "/app/data/fallback"
icecast_host = getenv("ICECAST_HOST") ?? "localhost"
icecast_port = int_of_string(getenv("ICECAST_PORT") ?? "8000")
icecast_password = getenv("ICECAST_PASSWORD") ?? "hackme"
icecast_mount = getenv("ICECAST_MOUNT") ?? "/radio.mp3"

# ============================================
# SOURCES
# ============================================

# Request queue - songs requested by users
request_queue = request.queue(id="request_queue")

# Fallback playlist - plays when queue is empty
fallback_playlist = playlist(
    id="fallback",
    mode="randomize",
    reload=3600,
    fallback_dir
)

# Emergency fallback - single file that always works
emergency = single("/app/data/fallback/emergency.mp3")

# ============================================
# AUDIO PROCESSING
# ============================================

# Normalize audio levels
def normalize(s)
    normalize(target=-14., s)
end

# Add crossfade between tracks
def crossfade(a, b)
    fade.out(duration=3., a)
    add(normalize=false, [
        fade.in(duration=3., b),
        fade.out(duration=3., a)
    ])
end

# ============================================
# MAIN SOURCE
# ============================================

# Build source with fallbacks
radio = fallback(
    track_sensitive=false,
    [
        request_queue,
        fallback_playlist,
        emergency
    ]
)

# Apply crossfade
radio = crossfade(radio)

# Normalize output
radio = normalize(radio)

# ============================================
# METADATA HANDLING
# ============================================

# Log when track changes
def on_track(m)
    title = m["title"] ?? "Unknown"
    artist = m["artist"] ?? "AI Radio"
    log("Now playing: #{artist} - #{title}")

    # Notify API about track change
    ignore(http.post(
        "http://api:8000/api/webhooks/broadcast/status",
        data='{"event": "track_change", "title": "#{title}", "artist": "#{artist}"}'
    ))
end

radio = on_track(on_track, radio)

# ============================================
# TELNET COMMANDS
# ============================================

# Add custom command to push song to queue
server.register(
    namespace="queue",
    usage="push <uri>",
    description="Push a song to the request queue",
    "push",
    fun(uri) -> begin
        request.push(request_queue, uri)
        "Queued: #{uri}"
    end
)

# Get queue status
server.register(
    namespace="queue",
    usage="status",
    description="Get queue status",
    "status",
    fun(_) -> begin
        len = request.queue.length(request_queue)
        "Queue length: #{len}"
    end
)

# Skip current track
server.register(
    usage="skip",
    description="Skip current track",
    "skip",
    fun(_) -> begin
        source.skip(radio)
        "Skipped"
    end
)

# ============================================
# HTTP API
# ============================================

# Simple HTTP endpoint for control
def http_handler(request, response)
    path = request.path
    method = request.method

    if path == "/next" and method == "POST" then
        body = request.body()
        # Parse file from body and queue it
        request.push(request_queue, body)
        response.status(200)
        response.data("Queued")
    elsif path == "/skip" and method == "POST" then
        source.skip(radio)
        response.status(200)
        response.data("Skipped")
    elsif path == "/status" then
        len = request.queue.length(request_queue)
        response.status(200)
        response.data('{"queue_length": #{len}}')
    else
        response.status(404)
        response.data("Not found")
    end
end

harbor.http.register(port=8080, "/", http_handler)

# ============================================
# OUTPUT
# ============================================

# Output to Icecast (MP3 stream - immediate compatibility)
output.icecast(
    %mp3(bitrate=320),
    host=icecast_host,
    port=icecast_port,
    password=icecast_password,
    mount=icecast_mount,
    name="PYrte Radio Shack",
    description="AI-powered community radio station",
    genre="Various",
    url="https://pyrte.radio",
    public=true,
    radio
)

# ============================================
# HLS OUTPUT (for better sync and modern players)
# ============================================
# HLS provides better metadata sync with PROGRAM-DATE-TIME
# Note: HLS has ~20-25s latency (5 segments x 4s each)

hls_dir = getenv("HLS_DIR") ?? "/var/www/hls"

output.file.hls(
    playlist="live.m3u8",
    segment_duration=4.0,
    segments=5,
    segments_overhead=2,
    hls_dir,
    [("aac", %fdkaac(bitrate=128))],
    radio
)

# ============================================
# METADATA FOR FRONTEND SYNC
# ============================================
# Store current track metadata for frontend polling
# This helps sync the "Now Playing" display with HLS latency

def store_metadata(m)
    title = m["title"] ?? "Unknown"
    artist = m["artist"] ?? "AI Radio"
    duration = m["duration"] ?? "0"

    # Write metadata to file for nginx/API to serve
    file.write(
        data='{"title": "#{title}", "artist": "#{artist}", "duration": "#{duration}", "timestamp": "#{time()}"}',
        "/var/www/hls/now_playing.json"
    )
end

radio = on_metadata(store_metadata, radio)

# Also output to local file for monitoring
output.file(
    %mp3(bitrate=128),
    "/var/log/liquidsoap/current.mp3",
    radio,
    reopen_on_metadata=true
)

log("PYrte Radio Shack started!")
log("Icecast stream: #{icecast_host}:#{icecast_port}#{icecast_mount}")
log("HLS playlist: #{hls_dir}/live.m3u8")
