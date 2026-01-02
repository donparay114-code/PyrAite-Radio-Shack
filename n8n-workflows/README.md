# n8n Workflows for PYrte Radio Shack

This directory contains the n8n workflow definitions for the AI Community Radio platform.

## Workflows Overview

### 1. Message Ingestion (`01-message-ingestion.json`)
- **Purpose**: Receive and normalize messages from WhatsApp and Telegram
- **Triggers**: Webhook endpoints for both platforms
- **Key Functions**:
  - Normalize message format across platforms
  - Check user timeout/ban status
  - Route commands vs music prompts

### 2. Genre Detection & Channel Routing (`02-genre-detection.json`)
- **Purpose**: Classify music requests and route to appropriate channels
- **Key Functions**:
  - Use Claude API for genre classification
  - Map genre to channel ID
  - Validate channel membership for private channels

### 3. Content Moderation Pipeline (`03-content-moderation.json`)
- **Purpose**: Multi-layer AI moderation system
- **Layers**:
  1. Prompt injection detection
  2. OpenAI Moderation API
  3. Claude contextual analysis
  4. Local blocklist check
- **Features**:
  - Respects channel moderation settings
  - Allows moderator bypass
  - Three-strike violation tracking

### 4. Suno Music Generation (`04-suno-generation.json`)
- **Purpose**: Submit prompts to Suno API and track generation
- **Key Functions**:
  - Submit generation request
  - Poll for completion (or use webhook)
  - Download and upload to S3
  - Update database with audio URL

### 5. Queue Management (`05-queue-management.json`)
- **Purpose**: Calculate priority and manage broadcast queue
- **Key Functions**:
  - Priority calculation (wait time + reputation + premium status)
  - Update queue positions
  - Send confirmation to users with ETA

### 6. Liquidsoap Stream Controller (`06-stream-controller.json`)
- **Purpose**: Push tracks to Liquidsoap for broadcast
- **Key Functions**:
  - Query next track from weighted queue
  - Push to Liquidsoap via telnet
  - Update now_playing table
  - Broadcast Socket.io events
  - Update user reputation

### 7. Channel Lifecycle Management (`07-channel-lifecycle.json`)
- **Purpose**: Create and manage private channels
- **Key Functions**:
  - Initialize new private channels
  - Configure Liquidsoap and Icecast
  - Set up HLS output
  - Send credentials to owner

## Setup Instructions

### Prerequisites
- n8n instance (self-hosted or cloud)
- PostgreSQL database connection configured
- Redis connection configured (for queue mode)
- API credentials:
  - Anthropic API key
  - OpenAI API key
  - Suno API key
  - Telegram Bot Token
  - WhatsApp API credentials

### Importing Workflows

1. **Via n8n UI**:
   - Open n8n interface
   - Click "New" → "Import Workflow"
   - Select the JSON file
   - Configure credentials and environment variables

2. **Via n8n CLI**:
   ```bash
   n8n import:workflow --input=./n8n-workflows/01-message-ingestion.json
   ```

### Environment Variables Required

Add these to your n8n instance:

```env
# Database
POSTGRES_HOST=your-rds-endpoint
POSTGRES_DB=radio_station
POSTGRES_USER=radio_user
POSTGRES_PASSWORD=your_password

# Redis
REDIS_HOST=your-elasticache-endpoint
REDIS_PORT=6379

# AI APIs
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
SUNO_API_KEY=your_suno_key

# Messaging
TELEGRAM_BOT_TOKEN=your_token
WHATSAPP_API_TOKEN=your_token

# AWS
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=radio-audio-files

# Streaming
ICECAST_HOST=your_icecast_host
ICECAST_PORT=8000
ICECAST_PASSWORD=your_password
```

### Activating Workflows

After importing, activate each workflow in this order:

1. Message Ingestion (always listening)
2. Content Moderation Pipeline
3. Genre Detection & Channel Routing
4. Suno Music Generation
5. Queue Management
6. Stream Controller (set to cron every 30 seconds)
7. Channel Lifecycle (manual trigger or webhook)

## Workflow Connections

Workflows communicate through:
- **Database**: Shared PostgreSQL tables
- **Redis**: Job queues and session data
- **Webhooks**: Trigger other workflows
- **Direct HTTP calls**: Between workflow nodes

## Monitoring

- View execution history in n8n UI
- Check logs for errors
- Monitor queue depth in Redis
- Track moderation stats in database

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**:
   - Verify webhook URL is publicly accessible
   - Check firewall/security group rules
   - Test with curl or Postman

2. **Moderation failing**:
   - Verify API keys are correct
   - Check rate limits
   - Review channel moderation settings

3. **Queue not processing**:
   - Ensure Stream Controller workflow is active
   - Check Liquidsoap telnet connection
   - Verify queue calculation logic

4. **S3 upload errors**:
   - Verify AWS credentials
   - Check bucket permissions
   - Ensure bucket exists in correct region

## Development

### Testing Workflows

Use n8n's built-in testing:
1. Click "Execute Workflow" with sample data
2. Inspect each node's output
3. Debug with "Function" nodes

### Sample Test Data

```json
{
  "platform": "telegram",
  "platformUserId": "123456789",
  "username": "testuser",
  "messageText": "Create a chill lo-fi beat with piano",
  "channelId": "uuid-of-lofi-channel"
}
```

## Performance Optimization

- Enable n8n queue mode for high throughput
- Use Redis for caching
- Implement exponential backoff for API retries
- Batch database operations where possible

## Security Notes

- Never commit API keys to version control
- Use n8n's credential encryption
- Restrict webhook access with validation
- Implement rate limiting on public webhooks
