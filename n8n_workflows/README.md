# n8n Workflows for PYrte Radio Shack

This directory contains exported n8n workflows for the AI radio station automation.

## Workflows

### 1. Telegram Bot Handler (`telegram_bot_handler.json`)

Full-featured Telegram bot for song requests with comprehensive moderation.

**Trigger:** Telegram Trigger (message events)

**Features:**
- User management (auto-create/update on first message)
- Ban and timeout enforcement
- Local blocklist checking
- OpenAI content moderation
- Rate limiting with daily quotas
- Violation tracking with 3-strike system
- Reputation-based queue priority
- Multiple bot commands

**Commands:**
- `/request <prompt>` - Submit a song request
- `/status` - View queue status
- `/me` - View your stats (reputation, requests, etc.)
- `/help` or `/start` - Show help message
- Plain text messages are also treated as song requests

**Flow:**
```
Telegram Trigger
    → Parse Message
    → Upsert User
    → Ban Check → [banned] → Send Ban Notice
    → Timeout Check → [timed out] → Send Timeout Notice
    → Command Router
        → /request or plain text:
            → Check Blocklist → [hit] → Register Violation → Warn/Timeout
            → Check Rate Limit → [exceeded] → Send Limit Notice
            → OpenAI Moderation → [flagged] → Log & Reject
            → Add to Queue → Send Confirmation
        → /status → Get Stats → Send Status
        → /me → Get User Stats → Send User Stats
        → /help, /start → Send Help
```

**PostgreSQL Functions Used:**
- `upsert_telegram_user()` - Create or update user
- `check_banned_words()` - Local blocklist check
- `handle_violation()` - Process violations and apply penalties
- `check_rate_limit()` - Check and increment daily limit
- `calculate_priority_score()` - Calculate queue priority

**Credentials Required:**
- `Telegram Bot` - Telegram Bot API credentials
- `PostgreSQL Radio` - PostgreSQL database connection
- `OpenAI API` - OpenAI API key for content moderation

### 2. Queue Processor (`queue_processor.json`)

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

## Database Requirements

### Required Tables

The workflows require these PostgreSQL tables (created via Alembic migrations):

| Table | Purpose |
|-------|---------|
| `users` | User accounts with reputation and moderation fields |
| `radio_queue` | Pending and processed song requests |
| `songs` | Generated song metadata |
| `radio_history` | Broadcast history |
| `votes` | User votes on queue items |
| `banned_words` | Local content blocklist |
| `moderation_logs` | Audit trail for moderation actions |
| `user_violations` | Track user violations and strikes |
| `reputation_logs` | Track reputation changes |

### Required Functions

PostgreSQL functions used by the workflows:

| Function | Purpose |
|----------|---------|
| `upsert_telegram_user(telegram_id, username, first_name, last_name)` | Create or update user from Telegram data |
| `check_banned_words(content)` | Check content against local blocklist |
| `handle_violation(telegram_user_id, type, word, content, severity)` | Process violation and apply penalties |
| `check_rate_limit(telegram_user_id)` | Check and increment daily request limit |
| `calculate_priority_score(user_id, base_priority)` | Calculate queue priority from reputation |

## Import Instructions

### Via n8n UI:
1. Open n8n dashboard
2. Go to Workflows
3. Click "Import from File"
4. Select the JSON file
5. Configure credentials and environment variables

### Via n8n CLI:
```bash
n8n import:workflow --input=telegram_bot_handler.json
n8n import:workflow --input=queue_processor.json
n8n import:workflow --input=broadcast_director.json
```

## Required Credentials

### 1. Telegram Bot API
- Bot Token from @BotFather
- Credential name: `Telegram Bot`

### 2. PostgreSQL Database
- Host, port, database, user, password
- Credential name: `PostgreSQL Radio`

### 3. OpenAI API
- API Key from OpenAI
- Credential name: `OpenAI API`

## Environment Variables

Set these in n8n settings or docker-compose:

```env
API_URL=http://api:8000
SUNO_API_URL=https://your-suno-api.com
TELEGRAM_CHAT_ID=-1001234567890
LIQUIDSOAP_URL=http://liquidsoap:8080
```

## Moderation System

### Local Blocklist

The `banned_words` table stores prohibited terms:

```sql
INSERT INTO banned_words (word, severity, category) VALUES
('prohibited_term', 'warning', 'offensive'),
('bad_pattern.*', 'critical', 'spam');
```

Severity levels:
- `warning` - Adds a strike, -10 reputation
- `critical` - Immediate timeout consideration

### OpenAI Moderation

Uses OpenAI's Moderation API to check prompts for:
- Hate speech
- Violence
- Self-harm
- Sexual content
- And other categories

### Strike System

1. First violation: Warning, -10 reputation
2. Second violation: Warning, -10 reputation
3. Third violation: 6-hour timeout, -25 reputation, warnings reset

## Security Features

- **Parameterized Queries**: All SQL uses `$1, $2, ...` placeholders
- **Input Validation**: Message parsing validates all fields
- **Rate Limiting**: Configurable daily request limits per user
- **Audit Logging**: All moderation actions logged to `moderation_logs`
- **Reputation Tracking**: All reputation changes logged to `reputation_logs`

## Workflow Tags

All workflows are tagged with:
- `radio` - Core radio functionality
- Specific tags: `telegram`, `bot`, `moderation`, `queue`, `broadcast`, `suno`, `liquidsoap`

## Troubleshooting

### Common Issues

1. **User not found errors**
   - Ensure `upsert_telegram_user` function exists
   - Check PostgreSQL connection credentials

2. **Moderation not working**
   - Verify OpenAI API credentials
   - Check `banned_words` table has entries

3. **Rate limit always exceeded**
   - Check `requests_reset_at` column values
   - Verify `check_rate_limit` function logic

4. **Queue position incorrect**
   - Ensure `priority_score` is being calculated
   - Verify `calculate_priority_score` function exists

### Logs

Check n8n execution logs for detailed error messages:
- Go to Executions in n8n dashboard
- Filter by workflow name
- Check failed executions for error details
