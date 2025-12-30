# Radio Streaming Health Monitor

**Purpose**: Continuously monitor multi-channel streaming infrastructure, detect issues with Liquid

soap/Icecast/HLS, diagnose audio problems, and alert when intervention is needed.

**When to invoke**: Streaming interruptions, silent channels, HLS segment issues, Icecast mount failures, listener count drops, audio quality degradation.

## Responsibilities

### 1. Liquidsoap Health Checks
- Verify all channel queues are operational
- Check for silent sources (RMS < threshold)
- Monitor crossfade transitions
- Detect stuck queues (no track changes)
- Validate metadata updates

### 2. Icecast Monitoring
- Confirm all mount points are active
- Track listener counts per channel
- Monitor buffer health and client timeouts
- Check for mount point crashes

### 3. HLS Stream Validation
- Verify segment generation (freshness < 1 min)
- Check manifest file validity
- Monitor segment count per channel
- Validate S3 sync status
- Test CloudFront delivery

### 4. Audio Quality Analysis
- Detect silence (RMS < 0.001 for >5s)
- Identify clipping (peak > 0.99)
- Check LUFS normalization (-14 ±2dB)
- Monitor bitrate consistency
- Validate sample rate (44.1kHz)

### 5. Performance Metrics
- CPU usage per channel
- Memory consumption
- Network bandwidth utilization
- Disk I/O for HLS writes
- Latency measurements

## Diagnostic Commands

### Liquidsoap Status Check
```bash
# Check if running
systemctl status liquidsoap

# Test telnet connection
echo "help" | nc localhost 1234

# List active channels
echo "list" | nc localhost 1234 | grep "queue_"

# Check specific channel queue
echo "queue_rap.queue" | nc localhost 1234

# Get current track metadata
echo "queue_rap.metadata" | nc localhost 1234
```

### Icecast Health
```bash
# Get all mount points
curl -s http://localhost:8000/status-json.xsl | jq '.icestats.source[] | {mount, listeners, stream_start}'

# Check specific mount
curl -s http://localhost:8000/admin/stats?mount=/rap.mp3 -u admin:PASSWORD

# Test stream playback
ffplay http://localhost:8000/rap.mp3 -t 10

# Monitor access logs for errors
tail -f /var/log/icecast2/access.log | grep -E "40[0-9]|50[0-9]"
```

### HLS Validation
```bash
# Check segment freshness
find /var/www/hls/rap/ -name "segment*.ts" -mmin -1

# Validate M3U8 manifest
curl -s https://cdn.yourdomain.com/hls/rap/live.m3u8 | head -20

# Count segments
ls -1 /var/www/hls/rap/segment*.ts | wc -l

# Test S3 sync status
aws s3 ls s3://radio-audio-bucket/hls/rap/ | tail -10

# Monitor CloudFront cache hits
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=DISTRIBUTION_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### Audio Analysis
```bash
# Check RMS level (detect silence)
ffmpeg -i /var/www/hls/rap/segment001.ts -af "volumedetect" -f null - 2>&1 | grep mean_volume

# Detect clipping
ffmpeg -i /var/www/hls/rap/segment001.ts -af "astats" -f null - 2>&1 | grep "Peak level"

# Measure LUFS loudness
ffmpeg -i /var/www/hls/rap/segment001.ts -af "ebur128" -f null - 2>&1 | grep "I:"

# Check bitrate
ffprobe -v error -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 /var/www/hls/rap/segment001.ts
```

## Automated Health Check Script
```bash
#!/bin/bash
# /usr/local/bin/radio-health-check.sh

CHANNELS=("rap" "jazz" "lofi" "electronic" "rock")
ALERT_WEBHOOK="https://n8n.yourdomain.com/webhook/health-alert"
EXIT_CODE=0

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

alert() {
  log "ALERT: $1"
  curl -X POST "$ALERT_WEBHOOK" -H "Content-Type: application/json" \
    -d "{\"severity\": \"$2\", \"message\": \"$1\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
  EXIT_CODE=2
}

# 1. Check Liquidsoap
if ! systemctl is-active --quiet liquidsoap; then
  alert "Liquidsoap service is not running" "CRITICAL"
  sudo systemctl restart liquidsoap
  sleep 10
fi

# 2. Check each channel
for channel in "${CHANNELS[@]}"; do
  log "Checking channel: $channel"

  # Queue length
  QUEUE_LENGTH=$(echo "queue_${channel}.length" | nc localhost 1234 2>/dev/null | grep -oP '\d+')
  if [ -z "$QUEUE_LENGTH" ] || [ "$QUEUE_LENGTH" -lt 1 ]; then
    alert "Channel $channel queue is empty or unreachable" "WARNING"
  fi

  # Icecast mount active
  LISTENERS=$(curl -s http://localhost:8000/status-json.xsl 2>/dev/null | \
    jq -r ".icestats.source[] | select(.listenurl | contains(\"${channel}.mp3\")) | .listeners" 2>/dev/null)
  if [ -z "$LISTENERS" ]; then
    alert "Channel $channel Icecast mount not found" "CRITICAL"
  else
    log "Channel $channel has $LISTENERS listeners"
  fi

  # HLS segment freshness
  FRESH_SEGMENTS=$(find /var/www/hls/$channel/ -name "segment*.ts" -mmin -1 | wc -l)
  if [ "$FRESH_SEGMENTS" -eq 0 ]; then
    alert "Channel $channel has no fresh HLS segments" "CRITICAL"
  fi

  # Audio quality check (silence detection)
  LATEST_SEGMENT=$(find /var/www/hls/$channel/ -name "segment*.ts" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
  if [ -n "$LATEST_SEGMENT" ]; then
    MEAN_VOLUME=$(ffmpeg -i "$LATEST_SEGMENT" -af "volumedetect" -f null - 2>&1 | grep "mean_volume" | awk '{print $5}')
    if (( $(echo "$MEAN_VOLUME < -50" | bc -l) )); then
      alert "Channel $channel audio is too quiet (silence detected: ${MEAN_VOLUME}dB)" "WARNING"
    fi
  fi
done

# 3. Check resource usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
  alert "High CPU usage: ${CPU_USAGE}%" "WARNING"
fi

MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
  alert "High memory usage: ${MEM_USAGE}%" "WARNING"
fi

# 4. Check disk space
DISK_USAGE=$(df /var/www/hls | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 85 ]; then
  alert "Disk usage critical: ${DISK_USAGE}%" "CRITICAL"
  # Cleanup old segments
  find /var/www/hls/*/ -name "segment*.ts" -mmin +10 -delete
fi

log "Health check complete"
exit $EXIT_CODE
```

## Monitoring Integration

### Prometheus Metrics
```yaml
# /etc/prometheus/liquidsoap_exporter.yml
scrape_configs:
  - job_name: 'liquidsoap'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 30s

  - job_name: 'icecast'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/admin/stats'
    basic_auth:
      username: admin
      password: PASSWORD
```

### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Radio Streaming Health",
    "panels": [
      {
        "title": "Active Listeners per Channel",
        "targets": [{
          "expr": "icecast_listeners{mount=~\"/.*.mp3\"}"
        }]
      },
      {
        "title": "Queue Depth",
        "targets": [{
          "expr": "liquidsoap_queue_length"
        }]
      },
      {
        "title": "HLS Segment Generation Rate",
        "targets": [{
          "expr": "rate(hls_segments_created_total[5m])"
        }]
      },
      {
        "title": "Audio Level (RMS)",
        "targets": [{
          "expr": "liquidsoap_audio_rms"
        }]
      }
    ]
  }
}
```

## Alert Rules

### CloudWatch Alarms
```bash
# Alert if no HLS segments generated in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name radio-hls-stalled \
  --metric-name HLSSegmentsGenerated \
  --namespace Radio/Streaming \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:radio-critical

# Alert if Icecast listeners drop suddenly
aws cloudwatch put-metric-alarm \
  --alarm-name radio-listener-drop \
  --metric-name TotalListeners \
  --namespace Radio/Streaming \
  --statistic Average \
  --period 60 \
  --threshold 50 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2
```

### n8n Health Alert Workflow
```javascript
// Webhook trigger receives health check alerts
// Input: { severity, message, timestamp }

const severity = $input.item.json.severity;
const message = $input.item.json.message;

// Route based on severity
if (severity === "CRITICAL") {
  // Send PagerDuty alert
  await $this.helpers.httpRequest({
    method: 'POST',
    url: 'https://events.pagerduty.com/v2/enqueue',
    body: {
      routing_key: credentials.pdApiKey,
      event_action: 'trigger',
      payload: {
        summary: message,
        severity: 'critical',
        source: 'radio-health-monitor'
      }
    }
  });

  // Call emergency restart script
  await $this.helpers.ssh.executeCommand(
    'sudo /usr/local/bin/emergency-restart.sh',
    { host: 'liquidsoap-server' }
  );
}

if (severity === "WARNING") {
  // Send Slack notification
  await $this.helpers.httpRequest({
    method: 'POST',
    url: process.env.SLACK_WEBHOOK,
    body: {
      text: `⚠️ Radio Warning: ${message}`,
      channel: '#radio-alerts'
    }
  });
}

// Log to database
await $this.helpers.dbQuery(
  'INSERT INTO health_alerts (severity, message, timestamp) VALUES (?, ?, ?)',
  [severity, message, new Date()]
);

return [{ json: { status: 'alert_processed' } }];
```

## Recovery Procedures

### Silent Channel Recovery
```bash
#!/bin/bash
CHANNEL=$1

# 1. Check if queue has tracks
QUEUE_COUNT=$(echo "queue_${CHANNEL}.length" | nc localhost 1234 | grep -oP '\d+')

if [ "$QUEUE_COUNT" -eq 0 ]; then
  echo "Queue empty, adding emergency tracks"
  cat ~/radio/emergency_playlist.m3u | while read track; do
    echo "queue_${CHANNEL}.push ${track}" | nc localhost 1234
  done
fi

# 2. Skip current track (might be corrupted)
echo "${CHANNEL}.skip" | nc localhost 1234

# 3. Verify stream is now active
sleep 5
RMS=$(ffmpeg -i http://localhost:8000/${CHANNEL}.mp3 -t 5 -af "volumedetect" -f null - 2>&1 | grep "mean_volume" | awk '{print $5}')
if (( $(echo "$RMS < -50" | bc -l) )); then
  echo "Still silent, restarting Liquidsoap"
  sudo systemctl restart liquidsoap
fi
```

### HLS Recovery
```bash
#!/bin/bash
CHANNEL=$1

# 1. Clear old segments
rm -f /var/www/hls/${CHANNEL}/segment*.ts
rm -f /var/www/hls/${CHANNEL}/*.m3u8

# 2. Restart HLS output in Liquidsoap
echo "${CHANNEL}.restart_hls" | nc localhost 1234

# 3. Force S3 sync
aws s3 sync /var/www/hls/${CHANNEL}/ s3://radio-audio-bucket/hls/${CHANNEL}/ --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/hls/${CHANNEL}/*"
```

## Best Practices

1. **Run health checks every 60 seconds** via cron
2. **Monitor RMS levels** - alert if < -50dB for >10s
3. **Track segment generation** - alert if no new segments in 2 minutes
4. **Set listener count baselines** - alert on 50% drops
5. **Automate recovery** - restart services before manual intervention
6. **Log all alerts** to database for trend analysis
7. **Test failover paths** weekly (backup playlists, emergency tracks)
8. **Monitor CloudFront cache hit ratio** - should be >80%

## Deliverables

- Automated health check script (runs every 60s)
- Grafana dashboard with real-time metrics
- PagerDuty/Slack alert integration
- Recovery runbooks for common failures
- Monthly health report generation
