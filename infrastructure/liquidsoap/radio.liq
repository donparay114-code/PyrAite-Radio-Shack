#!/usr/bin/liquidsoap
# PYrte Radio Shack - Multi-Channel Radio Configuration
# Liquidsoap 2.0+

# =============================================================================
# CONFIGURATION
# =============================================================================

# Enable telnet server for dynamic control
set("server.telnet", true)
set("server.telnet.port", 1234)
set("server.telnet.bind_addr", "0.0.0.0")

# Logging
set("log.file.path", "/var/log/liquidsoap/radio.log")
set("log.level", 3)

# Audio settings
set("frame.audio.samplerate", 44100)
set("frame.audio.channels", 2)

# Icecast configuration
icecast_host = getenv("ICECAST_HOST") or "localhost"
icecast_port = int_of_string(getenv("ICECAST_PORT") or "8000")
icecast_password = getenv("ICECAST_PASSWORD") or "hackme"

# API configuration
api_url = getenv("API_URL") or "http://api:8000"
webhook_secret = getenv("SECRET_KEY") or "dev-secret-key-change-in-production"

# =============================================================================
# CHANNEL DEFINITIONS
# =============================================================================

# Define public channels
# In production, this would be dynamically generated from database
channels = [
  {id="rap", name="Rap Radio", mount="rap.mp3", hls_dir="/var/www/hls/rap/", genre="Rap"},
  {id="jazz", name="Jazz Lounge", mount="jazz.mp3", hls_dir="/var/www/hls/jazz/", genre="Jazz"},
  {id="lofi", name="Lo-Fi Beats", mount="lofi.mp3", hls_dir="/var/www/hls/lofi/", genre="Lo-Fi"},
  {id="electronic", name="Electronic Dreams", mount="electronic.mp3", hls_dir="/var/www/hls/electronic/", genre="Electronic"},
  {id="rock", name="Rock Station", mount="rock.mp3", hls_dir="/var/www/hls/rock/", genre="Rock"},
  {id="classical", name="Classical Concert", mount="classical.mp3", hls_dir="/var/www/hls/classical/", genre="Classical"},
  {id="indie", name="Indie Vibes", mount="indie.mp3", hls_dir="/var/www/hls/indie/", genre="Indie"},
  {id="pop", name="Pop Hits", mount="pop.mp3", hls_dir="/var/www/hls/pop/", genre="Pop"},
  {id="country", name="Country Roads", mount="country.mp3", hls_dir="/var/www/hls/country/", genre="Country"},
  {id="rnb", name="R&B Soul", mount="rnb.mp3", hls_dir="/var/www/hls/rnb/", genre="R&B"}
]

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Function to create emergency fallback
def create_emergency_fallback(id) =
  # Blank audio as last resort
  blank(duration=10.0)
end

# Simple JSON string escape function
def json_escape(s) =
  # Escape backslashes first
  s = string.replace(pattern="\\\\", by="\\\\\\\\", s)
  # Escape double quotes
  string.replace(pattern="\"", by="\\\"", s)
end

# Function to create channel stream
def create_channel(id, name, mount, hls_dir, genre) =
  # Request queue for this channel (controlled via telnet)
  queue = request.queue(id="queue_#{id}")

  # Backup playlist (if no user-generated content)
  backup_path = "/opt/radio/backup/#{id}.m3u"
  backup =
    if file.exists(backup_path) then
      playlist(backup_path,
        mode="randomize",
        reload_mode="watch",
        id="backup_#{id}")
    else
      # If no backup playlist exists, use silence
      blank(duration=180.0)
    end

  # Emergency fallback
  emergency = create_emergency_fallback(id)

  # Priority: queue > backup > emergency
  source = fallback(
    track_sensitive=true,
    transitions=[
      fun(old, new) -> add([fade.initial(new), fade.final(old)])
    ],
    [queue, backup, emergency]
  )

  # Normalize audio levels (EBU R128 loudness)
  source = normalize(source, target=-16.0, window=1.0)

  # Crossfade between tracks
  source = crossfade(
    duration=3.0,
    fade_in=2.0,
    fade_out=2.0,
    source
  )

  # Metadata rewriting
  source = map_metadata(
    update=true,
    fun(m) ->
      [
        ("title", m["title"] or "Unknown"),
        ("artist", "PYrte Radio - #{name}"),
        ("genre", genre),
        ("comment", "AI-generated community radio")
      ]
    ,
    source
  )

  # Output to Icecast (MP3 192kbps)
  output.icecast(
    %mp3(bitrate=192, samplerate=44100, stereo=true),
    host=icecast_host,
    port=icecast_port,
    password=icecast_password,
    mount="/#{mount}",
    name=name,
    description="AI-powered community radio - #{genre}",
    genre=genre,
    url="https://pyrte-radio.com",
    public=true,
    fallible=true,
    on_start={
      log("Channel #{id} started streaming")
    },
    on_stop={
      log("Channel #{id} stopped streaming")
    },
    source
  )

  # HLS Output (for web/mobile playback)
  # Ensure HLS directory exists
  if file.is_directory(hls_dir) then
    output.file.hls(
      playlist="live.m3u8",
      segment_duration=4.0,
      segments=5,
      segments_overhead=10,
      persist_at="#{hls_dir}/state.json",
      hls_dir,
      [
        ("aac_128k", %ffmpeg(
          format="mpegts",
          %audio(
            codec="aac",
            b="128k",
            ar=44100,
            ac=2
          )
        ))
      ],
      source
    )
  end

  # On metadata change, log and trigger webhook
  source = on_metadata(
    fun(m) ->
      log("Now playing on #{name}: #{m['title']}")

      # Escape strings for JSON
      title = json_escape(m["title"] or "Unknown")
      artist = json_escape(m["artist"] or "Unknown")

      # Trigger webhook to update database now_playing table
      ignore(http.post(
        headers=[
          ("Content-Type", "application/json"),
          ("X-Webhook-Secret", webhook_secret)
        ],
        "#{api_url}/api/webhooks/broadcast/status",
        data='{"event": "track_change", "title": "#{title}", "artist": "#{artist}", "channel_id": "#{mount}"}'
      ))
    ,
    source
  )

  log("Channel #{name} initialized")
end

# =============================================================================
# INITIALIZE ALL CHANNELS
# =============================================================================

# Create streams for all defined channels
list.iter(
  fun(ch) ->
    create_channel(ch.id, ch.name, ch.mount, ch.hls_dir, ch.genre)
  ,
  channels
)

# =============================================================================
# TELNET COMMANDS
# =============================================================================

# Custom telnet commands for queue management
server.register(
  namespace="",
  description="Push track to specific channel queue",
  usage="push_track <channel_id> <audio_url>",
  "push_track",
  fun(channel_id, audio_url) ->
    begin
      request.push(
        uri=audio_url,
        "queue_#{channel_id}"
      )
      "Track pushed to #{channel_id} queue"
    end
)

server.register(
  namespace="",
  description="Get queue length for channel",
  usage="queue_length <channel_id>",
  "queue_length",
  fun(channel_id) ->
    begin
      length = request.queue.queue_length("queue_#{channel_id}")
      "Queue length: #{length}"
    end
)

# =============================================================================
# MONITORING
# =============================================================================

# Heartbeat log every 60 seconds
thread.run(
  delay=60.0,
  fun() ->
    begin
      log("Heartbeat: Liquidsoap running with #{list.length(channels)} channels")
      true
    end
)

log("===========================================")
log("PYrte Radio Shack - Liquidsoap initialized")
log("Channels: #{list.length(channels)}")
log("Telnet server: localhost:1234")
log("===========================================")
