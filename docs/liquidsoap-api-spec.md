# Liquidsoap HTTP Control API Specification

## Overview

The Liquidsoap HTTP Control API replaces SSH telnet commands with a fast, secure, RESTful HTTP interface for controlling Liquidsoap radio streams.

**Performance Comparison:**
- **SSH Telnet**: ~300ms latency, shell injection risks, error handling difficulties
- **HTTP API**: ~20ms latency, structured responses, automatic retry logic

**Cost**: Free (self-hosted Express.js server)
**Port**: 3001 (configurable)
**Protocol**: HTTP/HTTPS with API key authentication

## Architecture

```
┌─────────────┐      HTTP/JSON      ┌──────────────────┐      Telnet      ┌─────────────┐
│   n8n       ├──────────────────────>│  Express.js API  ├──────────────────>│ Liquidsoap  │
│ Workflows   │   20ms latency       │   (Port 3001)    │   Local socket   │   Streams   │
└─────────────┘                      └──────────────────┘                  └─────────────┘
```

### Components

1. **Express.js HTTP Server** - REST API wrapper
2. **Liquidsoap Telnet Client** - Internal telnet connection
3. **Request Queue** - Prevents telnet socket overload
4. **Response Parser** - Converts telnet responses to JSON

## API Endpoints

### Authentication

All requests require an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_secure_api_key_here" \
  http://localhost:3001/health
```

Set the API key in environment variables:
```bash
export CONTROL_API_KEY="your_secure_api_key_here"
```

---

### Health Check

**GET** `/health`

Check if the API server and Liquidsoap are responsive.

**Request:**
```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "liquidsoap": "connected",
  "uptime": 3600,
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

### Queue Management

#### Push Track to Queue

**POST** `/channels/:channel/queue/push`

Add a track to the broadcast queue.

**Parameters:**
- `channel` (path): Channel name (e.g., "main", "backup")

**Request Body:**
```json
{
  "trackPath": "/var/radio/tracks/song_123.mp3"
}
```

**Request Example:**
```bash
curl -X POST http://localhost:3001/channels/main/queue/push \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $CONTROL_API_KEY" \
  -d '{"trackPath": "/var/radio/tracks/song_123.mp3"}'
```

**Response (Success):**
```json
{
  "success": true,
  "channel": "main",
  "trackPath": "/var/radio/tracks/song_123.mp3",
  "queuePosition": 5,
  "response": "OK",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "File not found",
  "trackPath": "/var/radio/tracks/song_123.mp3",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

#### Get Queue Status

**GET** `/channels/:channel/queue/status`

Get the current queue status including pending tracks.

**Request:**
```bash
curl http://localhost:3001/channels/main/queue/status \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "channel": "main",
  "queueLength": 5,
  "currentTrack": {
    "path": "/var/radio/tracks/song_120.mp3",
    "duration": 180,
    "elapsed": 45
  },
  "upcomingTracks": [
    "/var/radio/tracks/song_121.mp3",
    "/var/radio/tracks/song_122.mp3",
    "/var/radio/tracks/song_123.mp3",
    "/var/radio/tracks/song_124.mp3"
  ],
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

#### Clear Queue

**POST** `/channels/:channel/queue/clear`

Remove all pending tracks from the queue (does not stop current track).

**Request:**
```bash
curl -X POST http://localhost:3001/channels/main/queue/clear \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "channel": "main",
  "tracksRemoved": 5,
  "message": "Queue cleared successfully",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

### Playback Control

#### Skip Current Track

**POST** `/channels/:channel/skip`

Skip the currently playing track and start the next one.

**Request:**
```bash
curl -X POST http://localhost:3001/channels/main/skip \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "channel": "main",
  "previousTrack": "/var/radio/tracks/song_120.mp3",
  "currentTrack": "/var/radio/tracks/song_121.mp3",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

#### Get Currently Playing

**GET** `/channels/:channel/current`

Get information about the currently playing track.

**Request:**
```bash
curl http://localhost:3001/channels/main/current \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "channel": "main",
  "currentTrack": {
    "path": "/var/radio/tracks/song_120.mp3",
    "filename": "song_120.mp3",
    "duration": 180,
    "elapsed": 45,
    "remaining": 135,
    "metadata": {
      "title": "Epic Beat",
      "artist": "AI Generated",
      "album": "PYrte Radio"
    }
  },
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

### Stream Control

#### Get Stream Info

**GET** `/channels/:channel/info`

Get detailed information about the stream status.

**Request:**
```bash
curl http://localhost:3001/channels/main/info \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "channel": "main",
  "status": "online",
  "bitrate": "192kbps",
  "sampleRate": "44100Hz",
  "format": "MP3",
  "listeners": 42,
  "uptime": 86400,
  "hlsUrl": "http://radio.example.com/stream/main.m3u8",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

#### Reload Liquidsoap Config

**POST** `/admin/reload`

Reload Liquidsoap configuration without restarting.

**Request:**
```bash
curl -X POST http://localhost:3001/admin/reload \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "message": "Liquidsoap configuration reloaded",
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

### Metrics

#### Get API Metrics

**GET** `/metrics`

Get API usage statistics and performance metrics.

**Request:**
```bash
curl http://localhost:3001/metrics \
  -H "X-API-Key: $CONTROL_API_KEY"
```

**Response:**
```json
{
  "uptime": 3600,
  "requests": {
    "total": 1523,
    "success": 1498,
    "errors": 25
  },
  "latency": {
    "avg": 18,
    "p50": 15,
    "p95": 32,
    "p99": 45
  },
  "queueOperations": {
    "push": 523,
    "skip": 45,
    "clear": 3
  },
  "timestamp": "2025-01-20T14:30:00Z"
}
```

---

## Express.js Implementation

### Server Setup

```javascript
const express = require('express');
const net = require('net');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.CONTROL_API_PORT || 3001;
const LIQUIDSOAP_TELNET_HOST = '127.0.0.1';
const LIQUIDSOAP_TELNET_PORT = 1234;
const API_KEY = process.env.CONTROL_API_KEY;

// Telnet client pool
class LiquidsoapClient {
  constructor() {
    this.requestQueue = [];
    this.processing = false;
  }

  async execute(command) {
    return new Promise((resolve, reject) => {
      const client = net.createConnection({
        host: LIQUIDSOAP_TELNET_HOST,
        port: LIQUIDSOAP_TELNET_PORT
      });

      let response = '';

      client.on('connect', () => {
        client.write(command + '\\n');
      });

      client.on('data', (data) => {
        response += data.toString();
      });

      client.on('end', () => {
        resolve(response.trim());
        client.destroy();
      });

      client.on('error', (error) => {
        reject(error);
        client.destroy();
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout'));
      }, 5000);
    });
  }
}

const liquidsoapClient = new LiquidsoapClient();

// Authentication middleware
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Apply authentication to all routes except /health
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  authenticate(req, res, next);
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await liquidsoapClient.execute('help');
    res.json({
      status: 'healthy',
      liquidsoap: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      liquidsoap: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Push track to queue
app.post('/channels/:channel/queue/push', async (req, res) => {
  const { channel } = req.params;
  const { trackPath } = req.body;

  if (!trackPath) {
    return res.status(400).json({ error: 'trackPath is required' });
  }

  try {
    const command = `queue_${channel}.push ${trackPath}`;
    const response = await liquidsoapClient.execute(command);

    res.json({
      success: true,
      channel,
      trackPath,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      channel,
      trackPath,
      timestamp: new Date().toISOString()
    });
  }
});

// Get queue status
app.get('/channels/:channel/queue/status', async (req, res) => {
  const { channel } = req.params;

  try {
    const queueLength = await liquidsoapClient.execute(`queue_${channel}.queue`);
    const currentTrack = await liquidsoapClient.execute(`${channel}.metadata`);

    res.json({
      channel,
      queueLength: parseInt(queueLength) || 0,
      currentTrack: parseMetadata(currentTrack),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Skip current track
app.post('/channels/:channel/skip', async (req, res) => {
  const { channel } = req.params;

  try {
    const response = await liquidsoapClient.execute(`${channel}.skip`);

    res.json({
      success: true,
      channel,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Liquidsoap Control API listening on port ${PORT}`);
});
```

---

## n8n Integration

### HTTP Request Node Configuration

**Push Track to Queue:**
```json
{
  "method": "POST",
  "url": "http://localhost:3001/channels/main/queue/push",
  "headers": {
    "Content-Type": "application/json",
    "X-API-Key": "{{$env.CONTROL_API_KEY}}"
  },
  "body": {
    "trackPath": "{{$json.local_file_path}}"
  },
  "options": {
    "timeout": 10000,
    "retry": {
      "maxRetries": 3,
      "retryInterval": 1000
    }
  }
}
```

**Error Handling:**
```javascript
// In n8n error workflow
if ($json.statusCode !== 200) {
  // Log error
  await $db.query(`
    INSERT INTO broadcast_errors (
      track_id,
      error_message,
      error_code,
      created_at
    ) VALUES ($1, $2, $3, NOW())
  `, [$json.trackId, $json.error, $json.statusCode]);

  // Retry with different track
  return { retry: true, skipTrack: true };
}
```

---

## Security

### API Key Management

```bash
# Generate secure API key
openssl rand -hex 32

# Store in environment
echo "CONTROL_API_KEY=your_generated_key_here" >> .env

# Use in n8n
# Add to n8n environment variables
```

### HTTPS Configuration

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/privkey.pem'),
  cert: fs.readFileSync('/path/to/fullchain.pem')
};

https.createServer(options, app).listen(3001);
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60 // 60 requests per minute
});

app.use('/channels/', limiter);
```

---

## Deployment

### Systemd Service

```ini
[Unit]
Description=Liquidsoap HTTP Control API
After=network.target liquidsoap.service

[Service]
Type=simple
User=radio
WorkingDirectory=/var/radio
EnvironmentFile=/var/radio/.env
ExecStart=/usr/bin/node /var/radio/control-api/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Docker Compose

```yaml
version: '3.8'

services:
  liquidsoap-api:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./control-api:/app
      - /var/radio/tracks:/var/radio/tracks:ro
    environment:
      - CONTROL_API_PORT=3001
      - CONTROL_API_KEY=${CONTROL_API_KEY}
      - LIQUIDSOAP_TELNET_HOST=liquidsoap
      - LIQUIDSOAP_TELNET_PORT=1234
    ports:
      - "3001:3001"
    command: node server.js
    depends_on:
      - liquidsoap

  liquidsoap:
    image: savonet/liquidsoap:latest
    volumes:
      - ./liquidsoap.liq:/etc/liquidsoap/radio.liq
      - /var/radio/tracks:/var/radio/tracks:ro
    ports:
      - "8000:8000"  # HLS stream
      - "1234:1234"  # Telnet
```

---

## Monitoring

### Health Check Script

```bash
#!/bin/bash

# health_check.sh
RESPONSE=$(curl -s http://localhost:3001/health)
STATUS=$(echo $RESPONSE | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "API unhealthy: $RESPONSE"
  # Send alert
  curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
    -d "{\"text\": \"Liquidsoap API is unhealthy\"}"
  exit 1
fi

echo "API healthy"
exit 0
```

### Prometheus Metrics

```javascript
const promClient = require('prom-client');

const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);

app.get('/prometheus', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

---

## Troubleshooting

### API Not Responding

```bash
# Check if API is running
curl http://localhost:3001/health

# Check logs
journalctl -u liquidsoap-api -n 50

# Check if port is listening
netstat -tlnp | grep 3001
```

### Cannot Connect to Liquidsoap

```bash
# Test telnet connection
telnet localhost 1234

# Check Liquidsoap logs
tail -f /var/log/liquidsoap/main.log

# Verify Liquidsoap is running
ps aux | grep liquidsoap
```

### Authentication Errors

```bash
# Verify API key is set
echo $CONTROL_API_KEY

# Test with correct key
curl -H "X-API-Key: $CONTROL_API_KEY" http://localhost:3001/channels/main/info
```

---

For implementation details, see:
- `.claude/skills/liquidsoap-control-api/SKILL.md`
- `.claude/agents/n8n-workflow-designer/AGENT.md` (HTTP API patterns)
