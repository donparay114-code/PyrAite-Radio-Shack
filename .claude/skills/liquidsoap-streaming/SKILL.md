# Liquidsoap Audio Streaming Specialist

**Purpose**: Configure, manage, and troubleshoot Liquidsoap multi-channel streaming infrastructure for AI radio station with HLS and Icecast outputs.

**When to use**: Setting up new channels, debugging streaming issues, optimizing audio quality, configuring crossfades, managing fallback playlists, HLS segment tuning.

## Liquid

soap Architecture

### Multi-Channel Setup
```liquidsoap
# Load environment
settings.log.level := 3
settings.server.telnet := true
settings.server.telnet.bind_addr := "0.0.0.0"
settings.server.telnet.port := 1234

# Channel list (loaded from database or config)
channels = [
  {id="rap", name="Rap Vibes", mount="/rap.mp3", hls="/var/www/hls/rap/", backup="~/playlists/rap_backup.m3u"},
  {id="jazz", name="Smooth Jazz", mount="/jazz.mp3", hls="/var/www/hls/jazz/", backup="~/playlists/jazz_backup.m3u"},
  {id="lofi", name="Lo-Fi Beats", mount="/lofi.mp3", hls="/var/www/hls/lofi/", backup="~/playlists/lofi_backup.m3u"},
  {id="electronic", name="Electronic", mount="/electronic.mp3", hls="/var/www/hls/electronic/", backup="~/playlists/electronic_backup.m3u"},
  {id="rock", name="Rock Classics", mount="/rock.mp3", hls="/var/www/hls/rock/", backup="~/playlists/rock_backup.m3u"}
]

# Create each channel
def create_channel(ch) =
  # Request queue for this channel
  queue_id = "queue_#{ch.id}"
  queue = request.queue(id=queue_id)

  # Backup playlist (plays when queue is empty)
  backup = playlist(
    ch.backup,
    mode="randomize",
    reload_mode="watch",
    reload=3600
  )

  # Emergency fallback (single track on loop)
  emergency = single("~/radio/emergency_beep.mp3")

  # Combine with fallback priority
  source = fallback(
    track_sensitive=true,
    [queue, backup, emergency]
  )

  # Audio processing
  source = amplify(1.0, override="liq_amplify", source)
  source = normalize(target=-14.0, source) # LUFS normalization
  source = crossfade(
    fade_in=3.0,
    fade_out=3.0,
    duration=5.0,
    source
  )

  # Metadata handling
  source = map_metadata(
    fun (m) -> [
      ("title", m["title"]),
      ("artist", m["artist"] ?? "AI Generated"),
      ("genre", ch.name)
    ],
    source
  )

  # Icecast MP3 output (192 kbps)
  output.icecast(
    %mp3(bitrate=192, samplerate=44100),
    host="localhost",
    port=8000,
    password=getenv("ICECAST_PASSWORD"),
    mount=ch.mount,
    name=ch.name,
    description="AI-generated #{ch.name} radio",
    url="https://radio.yourdomain.com",
    genre=ch.name,
    source
  )

  # HLS output for web/mobile (4s segments, 5 in playlist)
  output.file.hls(
    playlist="live.m3u8",
    segment_duration=4.0,
    segments=5,
    segments_overhead=2,
    ch.hls,
    [
      ("aac_128k", %ffmpeg(
        format="mpegts",
        %audio(codec="aac", b="128k", ar=44100)
      ))
    ],
    source
  )

  # Register interactive commands
  server.register(
    namespace="#{ch.id}",
    description="Push track to #{ch.name} queue",
    usage="push <uri>",
    "push",
    fun (uri) -> begin
      queue.push(request.create(uri))
      "Track queued for #{ch.name}"
    end
  )

  server.register(
    namespace="#{ch.id}",
    description="Skip current track on #{ch.name}",
    "skip",
    fun (_) -> begin
      source.skip()
      "Skipped current track on #{ch.name}"
    end
  )
end

# Initialize all channels
list.iter(create_channel, channels)

# System-wide monitoring
def log_track_change(m) =
  log(level=3, "NOW PLAYING: #{m['artist']} - #{m['title']}")
  # Optionally call webhook to update database
  # ignore(http.post("https://n8n.yourdomain.com/webhook/now-playing", json_of(compact=true, m)))
end

# Apply to all sources
on_track(log_track_change)

# Keep script alive
```

## Queue Management via Telnet

### Adding Tracks
```bash
# Push track to specific channel
echo "rap.push file:///var/audio/track123.mp3" | nc localhost 1234

# Push with metadata
echo "jazz.push annotate:title='Smooth Night',artist='AI Jazz':file:///var/audio/jazz001.mp3" | nc localhost 1234

# Push multiple tracks
cat <<EOF | nc localhost 1234
lofi.push file:///var/audio/lofi01.mp3
lofi.push file:///var/audio/lofi02.mp3
lofi.push file:///var/audio/lofi03.mp3
EOF
```

### Queue Control
```bash
# Skip current track
echo "rap.skip" | nc localhost 1234

# List queue contents
echo "queue_rap.queue" | nc localhost 1234

# Clear queue
echo "queue_rap.clear" | nc localhost 1234

# Get queue length
echo "queue_rap.length" | nc localhost 1234
```

## Audio Processing

### Normalization & Loudness
```liquidsoap
# LUFS normalization (recommended for streaming)
source = normalize(
  target=-14.0,  # EBU R128 standard
  window=0.5,    # Analysis window
  gain_min=-12.0,
  gain_max=12.0,
  source
)

# Peak normalization (alternative)
source = amplify(1.0, override="liq_amplify", source)

# Compression for consistent levels
source = compress(
  attack=50.0,
  release=400.0,
  threshold=-15.0,
  ratio=3.0,
  knee=1.0,
  gain=0.0,
  source
)
```

### Crossfading & Transitions
```liquidsoap
# Smart crossfade (detects silence)
source = crossfade(
  start_next=5.0,   # Start next track 5s before end
  fade_in=3.0,      # Fade in duration
  fade_out=3.0,     # Fade out duration
  duration=5.0,     # Max crossfade duration
  conservative=true, # Only crossfade on silence
  source
)

# Simple fade (always applies)
source = fade.in(duration=2.0, source)
source = fade.out(duration=2.0, source)

# Custom transition with jingle
def transition_with_jingle(old, new) =
  jingle = single("~/jingles/transition.mp3")
  sequence([fade.out(duration=1.0, old), jingle, fade.in(duration=1.0, new)])
end

source = fallback(transitions=[transition_with_jingle], [queue, backup])
```

### Audio Quality Checks
```liquidsoap
# Detect silence (emergency fallback trigger)
source = on_track(
  fun (m) -> begin
    # Check if track is silent
    def is_silent() =
      rms = source.rms()
      rms < 0.001
    end

    if is_silent() then
      log(level=1, "ALERT: Silent track detected!")
      # Trigger skip or alert
    end
  end,
  source
)

# Detect clipping (too loud)
source = on_track(
  fun (m) -> begin
    peak = source.peak()
    if peak > 0.99 then
      log(level=2, "WARNING: Track #{m['title']} is clipping (peak: #{peak})")
    end
  end,
  source
)
```

## HLS Configuration

### Segment Tuning
```liquidsoap
# Low-latency HLS (2s segments)
output.file.hls(
  playlist="live.m3u8",
  segment_duration=2.0,  # Shorter for lower latency
  segments=3,            # Fewer segments in playlist
  segments_overhead=1,   # Minimal overhead
  "/var/www/hls/channel/",
  [("aac", %ffmpeg(format="mpegts", %audio(codec="aac", b="128k")))],
  source
)

# Standard HLS (4s segments, recommended)
output.file.hls(
  playlist="live.m3u8",
  segment_duration=4.0,
  segments=5,
  segments_overhead=2,
  "/var/www/hls/channel/",
  [("aac", %ffmpeg(format="mpegts", %audio(codec="aac", b="128k")))],
  source
)

# Multi-bitrate HLS (adaptive streaming)
output.file.hls(
  playlist="live.m3u8",
  segment_duration=4.0,
  segments=5,
  "/var/www/hls/channel/",
  [
    ("high", %ffmpeg(format="mpegts", %audio(codec="aac", b="192k", ar=48000))),
    ("medium", %ffmpeg(format="mpegts", %audio(codec="aac", b="128k", ar=44100))),
    ("low", %ffmpeg(format="mpegts", %audio(codec="aac", b="64k", ar=44100)))
  ],
  source
)
```

### HLS Cleanup
```bash
# Cron job to remove old segments (keep last 10 only)
*/1 * * * * find /var/www/hls/*/segment*.ts -mmin +5 -delete

# Monitor segment count
watch -n 1 'ls -lh /var/www/hls/rap/'
```

## Icecast Configuration

### icecast.xml Setup
```xml
<icecast>
  <location>Earth</location>
  <admin>admin@radio.yourdomain.com</admin>

  <limits>
    <clients>1000</clients>
    <sources>20</sources>
    <queue-size>524288</queue-size>
    <client-timeout>30</client-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
    <burst-on-connect>1</burst-on-connect>
    <burst-size>65535</burst-size>
  </limits>

  <authentication>
    <source-password>SECURE_PASSWORD_HERE</source-password>
    <relay-password>RELAY_PASSWORD_HERE</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>ADMIN_PASSWORD_HERE</admin-password>
  </authentication>

  <hostname>radio.yourdomain.com</hostname>
  <listen-socket>
    <port>8000</port>
    <bind-address>0.0.0.0</bind-address>
  </listen-socket>

  <http-headers>
    <header name="Access-Control-Allow-Origin" value="*" />
  </http-headers>

  <mount type="normal">
    <mount-name>/rap.mp3</mount-name>
    <fallback-mount>/fallback.mp3</fallback-mount>
    <fallback-override>1</fallback-override>
    <max-listeners>500</max-listeners>
    <burst-size>65536</burst-size>
    <public>1</public>
  </mount>

  <fileserve>1</fileserve>
  <paths>
    <basedir>/usr/share/icecast2</basedir>
    <logdir>/var/log/icecast2</logdir>
    <webroot>/usr/share/icecast2/web</webroot>
    <adminroot>/usr/share/icecast2/admin</adminroot>
    <pidfile>/var/run/icecast2/icecast.pid</pidfile>
  </paths>

  <logging>
    <accesslog>access.log</accesslog>
    <errorlog>error.log</errorlog>
    <playlistlog>playlist.log</playlistlog>
    <loglevel>3</loglevel>
    <logsize>10000</logsize>
    <logarchive>1</logarchive>
  </logging>

  <security>
    <chroot>0</chroot>
  </security>
</icecast>
```

### Icecast Management
```bash
# Start/stop/restart
sudo systemctl start icecast2
sudo systemctl stop icecast2
sudo systemctl restart icecast2

# View active listeners
curl -u admin:ADMIN_PASSWORD http://localhost:8000/admin/stats

# Kick specific client
curl -u admin:ADMIN_PASSWORD "http://localhost:8000/admin/killclient?mount=/rap.mp3&id=CLIENT_ID"

# Monitor logs
sudo tail -f /var/log/icecast2/access.log
sudo tail -f /var/log/icecast2/error.log

# Check mount points
curl http://localhost:8000/status-json.xsl
```

## Troubleshooting

### Issue: No audio output
```bash
# Check if Liquidsoap is running
sudo systemctl status liquidsoap

# View Liquidsoap logs
sudo journalctl -u liquidsoap -f

# Check for errors in log
sudo grep -i error /var/log/liquidsoap/liquidsoap.log

# Test audio file playback
ffplay /var/audio/test.mp3

# Verify Icecast mount is active
curl http://localhost:8000/status-json.xsl | jq '.icestats.source'
```

### Issue: Crossfade not working
```liquidsoap
# Enable debug logging
settings.log.level := 4

# Check transition logs
def custom_crossfade(old, new) =
  log(level=3, "Crossfading from #{old.metadata['title']} to #{new.metadata['title']}")
  fade.initial = fade.in(duration=3.0, new)
  fade.ending = fade.out(duration=3.0, old)
  add(normalize=false, [fade.ending, fade.initial])
end
```

### Issue: HLS segments not updating
```bash
# Check file permissions
ls -lh /var/www/hls/

# Ensure Liquidsoap can write
sudo chown -R liquidsoap:liquidsoap /var/www/hls/

# Check segment generation
watch -n 1 'ls -lt /var/www/hls/rap/ | head -10'

# Manual FFmpeg test
ffmpeg -i /var/audio/test.mp3 \
  -codec:a aac -b:a 128k -f hls \
  -hls_time 4 -hls_list_size 5 \
  -hls_flags delete_segments \
  /var/www/hls/test/live.m3u8
```

### Issue: High CPU usage
```bash
# Check current CPU usage
top -bn1 | grep liquidsoap

# Reduce crossfade complexity
# In Liquidsoap config, use simple fade instead of smart_crossfade

# Limit FFmpeg threads for HLS
output.file.hls(
  ...
  [("aac", %ffmpeg(format="mpegts", %audio(codec="aac", b="128k"), "-threads", "2"))],
  source
)

# Use simpler normalization
source = amplify(1.0, override="liq_amplify", source)  # Instead of normalize()
```

## Production Deployment

### Systemd Service
```ini
# /etc/systemd/system/liquidsoap.service
[Unit]
Description=Liquidsoap Multi-Channel Radio
After=network.target

[Service]
Type=forking
User=liquidsoap
Group=liquidsoap
ExecStart=/usr/bin/liquidsoap --daemon /etc/liquidsoap/radio.liq
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=10
Environment="ICECAST_PASSWORD=your_password"

[Install]
WantedBy=multi-user.target
```

### Health Check Script
```bash
#!/bin/bash
# /usr/local/bin/liquidsoap-healthcheck.sh

# Check if Liquidsoap is running
if ! systemctl is-active --quiet liquidsoap; then
  echo "CRITICAL: Liquidsoap is not running"
  sudo systemctl restart liquidsoap
  exit 2
fi

# Check if Icecast mounts are active
MOUNT_COUNT=$(curl -s http://localhost:8000/status-json.xsl | jq '.icestats.source | length')
if [ "$MOUNT_COUNT" -lt 5 ]; then
  echo "WARNING: Only $MOUNT_COUNT mounts active (expected 10+)"
  exit 1
fi

# Check HLS segment freshness
LATEST_SEGMENT=$(find /var/www/hls/rap/ -name "segment*.ts" -mmin -1 | wc -l)
if [ "$LATEST_SEGMENT" -eq 0 ]; then
  echo "CRITICAL: No fresh HLS segments generated in last minute"
  exit 2
fi

echo "OK: Liquidsoap healthy, $MOUNT_COUNT mounts active, HLS segments fresh"
exit 0
```

### Monitoring Dashboard
```bash
# Install monitoring tools
sudo apt install -y prometheus-node-exporter

# Configure Prometheus scraping
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'liquidsoap'
    static_configs:
      - targets: ['localhost:9100']

# View metrics
curl http://localhost:9100/metrics | grep liquidsoap
```

## Performance Optimization

1. **Buffer Size**: Increase for stability, decrease for latency
2. **Sample Rate**: 44.1kHz standard, 48kHz for higher quality
3. **Bitrate**: 128kbps good balance, 192kbps premium, 64kbps mobile
4. **Crossfade**: Keep duration < 10s to avoid overlap issues
5. **HLS Segments**: 4s optimal for web, 2s for low-latency
6. **CPU**: Disable unnecessary processing (EQ, compressor) if bottleneck

## Tools & Resources

- **Liquidsoap Docs**: https://www.liquidsoap.info/doc-dev/
- **Icecast Manual**: https://icecast.org/docs/icecast-latest/
- **HLS Spec**: https://datatracker.ietf.org/doc/html/rfc8216
- **Audio Standards**: EBU R128 (loudness), ITU-R BS.1770 (measurement)
