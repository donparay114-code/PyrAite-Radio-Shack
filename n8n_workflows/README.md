# n8n Workflows for PYrte Radio Shack

This directory contains exported n8n workflows for the AI radio station automation.

## Workflows

### 1. Queue Processor (`queue_processor.json`)
Processes pending song requests from the queue.

**Trigger:** Every 30 seconds
**Flow:**
1. Fetch pending queue items from API
2. Prepare Suno generation request
3. Call Suno API for music generation
4. Update queue status via webhook

**Environment Variables:**
- `API_URL` - Base URL of the radio API
- `SUNO_API_URL` - Suno API endpoint

### 2. Telegram Bot Handler (`telegram_bot_handler.json`)
Handles incoming Telegram bot commands.

**Trigger:** Webhook (POST /telegram-webhook)
**Commands:**
- `/request <prompt>` - Submit a song request
- `/status` - View queue status

**Environment Variables:**
- `API_URL` - Base URL of the radio API

**Credentials Required:**
- Telegram Bot API credentials

### 3. Broadcast Director (`broadcast_director.json`)
Manages the broadcast queue and announces songs.

**Trigger:** Webhook (POST /broadcast-trigger)
**Flow:**
1. Get next generated song from queue
2. Prepare DJ intro text
3. Fetch full song details
4. Announce in Telegram chat
5. Queue in Liquidsoap for playback

**Environment Variables:**
- `API_URL` - Base URL of the radio API
- `TELEGRAM_CHAT_ID` - Chat ID for announcements
- `LIQUIDSOAP_URL` - Liquidsoap control endpoint

## Import Instructions

### Via n8n UI:
1. Open n8n dashboard
2. Go to Workflows
3. Click "Import from File"
4. Select the JSON file
5. Configure credentials and environment variables

### Via n8n CLI:
```bash
n8n import:workflow --input=queue_processor.json
n8n import:workflow --input=telegram_bot_handler.json
n8n import:workflow --input=broadcast_director.json
```

## Required Credentials

1. **Telegram Bot API**
   - Bot Token from @BotFather

2. **HTTP Request Authentication** (if API requires auth)
   - API Key or Bearer Token

## Environment Variables

Set these in n8n settings or docker-compose:

```env
API_URL=http://api:8000
SUNO_API_URL=https://your-suno-api.com
TELEGRAM_CHAT_ID=-1001234567890
LIQUIDSOAP_URL=http://liquidsoap:8080
```

## Workflow Tags

All workflows are tagged with:
- `radio` - Core radio functionality
- Specific tags: `queue`, `telegram`, `broadcast`, `suno`, `liquidsoap`
