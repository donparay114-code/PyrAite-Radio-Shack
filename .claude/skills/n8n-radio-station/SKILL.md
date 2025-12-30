---
name: n8n-radio-station
description: Manage and troubleshoot the AI Community Radio Station n8n workflows. Use when the user mentions radio, music generation, queue, broadcasting, DJ, Telegram bot, reputation, or radio station workflows.
---

# AI Community Radio Station Manager

## Purpose
Manage the complete AI Community Radio Station system including n8n workflows, PostgreSQL database operations, provider adapter, and HTTP-based Liquidsoap control.

## System Overview

The radio station consists of 4 integrated n8n workflows:

1. **AI Radio - Request Handler (PostgreSQL)** - Telegram bot for song requests
2. **Radio Queue Processor** - Multi-provider music generation & download
3. **Radio Station Director (Broadcaster)** - DJ intros + audio stitching + HTTP broadcast
4. **Radio Reputation Calculator** - User reputation & priority management

### Architecture Components

**Database**: PostgreSQL 14+ with JSONB support
**Music Providers**: Suno, Stable Audio, Mubert (with failover)
**Broadcast Control**: HTTP API (replacing SSH telnet)
**Moderation**: Local blocklist → OpenAI moderation (cost-optimized)

### File Locations

```
/var/radio/
├── n8n_workflows/
│   ├── ai_radio_postgresql.json        # Telegram request handler
│   ├── queue_processor.json            # Provider adapter generation
│   ├── radio_station_director.json     # HTTP-based broadcasting
│   ├── reputation_calculator.json      # Reputation system
│   └── README.md                       # Setup guide
├── tracks/                             # Generated MP3 files
├── temp/                               # DJ intro audio files
└── broadcast/                          # Stitched audio (intro + song)
```

## Common Tasks

### Check Workflow Status

Use the MCP n8n tools to check workflow status:

```javascript
// List all workflows
mcp__n8n__list_workflows()

// Get specific workflow
mcp__n8n__get_workflow("workflow_id")

// Check if active
mcp__n8n__list_workflows({ active: true })
```

### Monitor Queue (PostgreSQL)

```sql
-- Check current queue
SELECT
  rq.queue_id,
  ru.username,
  rq.song_title,
  rq.priority_score,
  rq.queue_position,
  rq.provider,
  rq.status
FROM radio_queue rq
JOIN radio_users ru ON rq.user_id = ru.user_id
WHERE rq.status != 'failed'
ORDER BY rq.priority_score DESC;
```

### View Recent Requests

```sql
-- Recent song requests
SELECT
  sr.request_id,
  ru.username,
  sr.prompt,
  sr.genre,
  sr.provider,
  sr.status,
  sr.created_at
FROM song_requests sr
JOIN radio_users ru ON sr.user_id = ru.user_id
ORDER BY sr.created_at DESC
LIMIT 10;
```

### Check User Reputation

```sql
-- Top users by reputation
SELECT
  username,
  reputation_score,
  successful_generations,
  upvotes_received,
  is_premium,
  is_banned
FROM radio_users
WHERE is_banned = FALSE
ORDER BY reputation_score DESC
LIMIT 10;
```

### View Broadcast History

```sql
-- Recently played songs
SELECT
  history_id,
  song_title,
  genre,
  provider,
  song_duration,
  played_at
FROM radio_history
ORDER BY played_at DESC
LIMIT 20;
```

### Check Provider Health

```sql
-- Provider performance statistics
SELECT
  provider,
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as avg_generation_time_minutes,
  AVG(cost) as avg_cost
FROM song_generations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY successful DESC;
```

## Troubleshooting Guide

### Issue: Songs Not Generating

**Check:**
1. Queue Processor workflow is active
2. Music providers are accessible (Suno, Stable Audio, Mubert)
3. Check execution logs in n8n
4. Check provider circuit breaker status

```sql
-- Find stuck songs (PostgreSQL syntax)
SELECT * FROM radio_queue
WHERE status = 'generating'
AND generation_started_at < NOW() - INTERVAL '10 minutes';
```

**Fix:**
```sql
-- Reset stuck songs
UPDATE radio_queue
SET status = 'queued',
    generation_started_at = NULL,
    task_id = NULL
WHERE status = 'generating'
AND generation_started_at < NOW() - INTERVAL '10 minutes';
```

**Check Provider Status:**
```javascript
// In n8n workflow or console
const health = musicFailover.getProviderHealth();
console.log(health);
// Output shows which providers have open circuit breakers
```

### Issue: All Providers Failing

**Diagnosis:**
```bash
# Test each provider manually
curl -X POST http://localhost:3000/api/test-providers

# Check environment variables
echo $SUNO_API_KEY
echo $STABILITY_API_KEY
echo $MUBERT_API_KEY

# Check circuit breaker redis cache
redis-cli GET circuit_breaker:suno
```

**Fix:**
1. Check API keys in environment variables
2. Verify provider API endpoints are up
3. Reset circuit breakers if needed
4. Check rate limits

### Issue: Broadcasting Not Working

**Check:**
1. Radio Station Director workflow is active
2. Songs with status 'completed' exist in queue
3. Liquidsoap HTTP API is accessible
4. FFmpeg is available in PATH
5. Directories exist: `temp/` and `broadcast/`

```sql
-- Check ready songs
SELECT * FROM radio_queue
WHERE status = 'completed';
```

**Test HTTP API:**
```bash
# Check Liquidsoap API health
curl http://localhost:3001/health

# Get queue status
curl http://localhost:3001/channels/main/queue/status

# Manually push track
curl -X POST http://localhost:3001/channels/main/queue/push \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $CONTROL_API_KEY" \
  -d '{"trackPath": "/var/radio/tracks/test.mp3"}'
```

### Issue: Telegram Bot Not Responding

**Check:**
1. AI Radio workflow is active
2. Telegram credentials are valid
3. Bot token is correct
4. Local blocklist check is working

**Test manually:**
- Send message to bot
- Check n8n execution history
- Look for error messages

### Issue: Reputation Not Updating

**Check:**
1. Reputation Calculator workflow is active (runs every 5 minutes)
2. Check execution history

```sql
-- View recent reputation changes
SELECT
  url.user_id,
  ru.username,
  url.change_type,
  url.change_amount,
  url.old_score,
  url.new_score,
  url.reason,
  url.changed_at
FROM user_reputation_log url
JOIN radio_users ru ON url.user_id = ru.user_id
ORDER BY url.changed_at DESC
LIMIT 20;
```

### Issue: Moderation Rejecting Valid Requests

**Check moderation logs:**
```sql
SELECT
  ml.moderated_at,
  ru.username,
  ml.prompt,
  ml.decision,
  ml.blocklist_matched,
  ml.category_hate,
  ml.category_violence,
  ml.category_sexual,
  ml.category_harassment
FROM moderation_logs ml
JOIN radio_users ru ON ml.user_id = ru.user_id
WHERE ml.decision = 'rejected'
ORDER BY ml.moderated_at DESC
LIMIT 10;
```

**Check local blocklist:**
```sql
-- View blocklist entries
SELECT * FROM blocked_content
ORDER BY added_at DESC;

-- Find false positives
SELECT * FROM blocked_content
WHERE pattern ILIKE '%word%';
```

### Issue: High API Costs

**Check cost by provider:**
```sql
-- Cost analysis
SELECT
  provider,
  DATE(created_at) as date,
  COUNT(*) as tracks_generated,
  SUM(cost) as daily_cost
FROM song_generations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY provider, DATE(created_at)
ORDER BY date DESC, daily_cost DESC;
```

**Optimize provider routing:**
```sql
-- Check genre distribution
SELECT
  genre,
  COUNT(*) as requests,
  MODE() WITHIN GROUP (ORDER BY provider) as most_used_provider
FROM song_requests
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY genre
ORDER BY requests DESC;
```

## Workflow Operations

### Activate All Radio Workflows

```javascript
// Use MCP to activate workflows
mcp__n8n__activate_workflow("ai_radio_workflow_id")
mcp__n8n__activate_workflow("queue_processor_workflow_id")
mcp__n8n__activate_workflow("broadcaster_workflow_id")
mcp__n8n__activate_workflow("reputation_workflow_id")
```

### Update Music Provider Configuration

When provider configuration changes:

1. Read the workflow file
2. Find "Music Provider - Generate" node
3. Update environment variables:
   - `MUSIC_PROVIDER` (primary: suno/stable-audio/mubert)
   - `MUSIC_PROVIDER_FALLBACK` (secondary)
4. Use MCP to update workflow

### Configure Genre-Based Routing

Update `queue_processor.json` to route genres optimally:

```javascript
// In "Select Provider" node
const genreRouting = {
  'rap': 'suno',
  'hip-hop': 'suno',
  'lofi': 'mubert',
  'ambient': 'mubert',
  'electronic': 'stable-audio'
};

const provider = genreRouting[$json.genre] || 'suno';
```

### Monitor System Health

```sql
-- Get statistics
SELECT
  (SELECT COUNT(*) FROM radio_users WHERE is_banned = FALSE) as active_users,
  (SELECT COUNT(*) FROM radio_users WHERE is_premium = TRUE) as premium_users,
  (SELECT COUNT(*) FROM radio_queue WHERE status = 'queued') as queued_songs,
  (SELECT COUNT(*) FROM radio_queue WHERE status = 'generating') as generating_songs,
  (SELECT COUNT(*) FROM radio_queue WHERE status = 'completed') as ready_to_broadcast,
  (SELECT AVG(reputation_score) FROM radio_users WHERE is_banned = FALSE) as avg_reputation;
```

## HTTP API Integration

### Liquidsoap Control API

The Radio Station Director workflow uses HTTP API instead of SSH telnet:

**Push Track to Queue:**
```javascript
// In n8n HTTP Request node
{
  "method": "POST",
  "url": "http://localhost:3001/channels/main/queue/push",
  "headers": {
    "Content-Type": "application/json",
    "X-API-Key": "{{$env.CONTROL_API_KEY}}"
  },
  "body": {
    "trackPath": "/var/radio/tracks/{{$json.filename}}"
  }
}
```

**Get Queue Status:**
```javascript
{
  "method": "GET",
  "url": "http://localhost:3001/channels/main/queue/status"
}
```

**Skip Current Track:**
```javascript
{
  "method": "POST",
  "url": "http://localhost:3001/channels/main/skip"
}
```

**Benefits over SSH:**
- 20ms latency vs 300ms
- Automatic retry logic
- Structured error responses
- No shell injection risks
- Health check endpoint

## Database Schema Reference

### Key Tables (PostgreSQL)

- **radio_users** - User accounts, reputation, premium status
- **song_requests** - All song requests (approved and rejected)
- **song_generations** - Track provider, task_id, cost, metadata
- **radio_queue** - Active queue with priority scores
- **radio_history** - Broadcast history
- **moderation_logs** - Moderation decisions (local + OpenAI)
- **user_reputation_log** - Reputation change history
- **blocked_content** - Local blocklist for cost optimization

### JSONB Fields

```sql
-- favorite_genres (radio_users)
SELECT username, favorite_genres
FROM radio_users
WHERE favorite_genres @> '["rap"]';

-- metadata (song_generations)
SELECT
  song_title,
  metadata->>'bpm' as bpm,
  metadata->>'energy' as energy,
  metadata->>'provider_model' as model
FROM song_generations
WHERE metadata ? 'bpm';
```

## Best Practices

1. **Monitor providers**: Check circuit breaker status regularly
2. **Cost optimization**: Route genres to cheapest suitable provider
3. **Local blocklist**: Add common inappropriate terms to save API costs
4. **Clean up**: Archive old history records periodically
5. **Backup**: Regularly backup PostgreSQL database with `pg_dump`
6. **Test changes**: Use manual triggers in n8n before activating
7. **Check logs**: Review n8n execution logs for errors
8. **Use HTTP API**: Always use HTTP endpoints for Liquidsoap control

## Quick Commands

```bash
# Start n8n
cd /var/radio
./start_n8n.sh

# Connect to PostgreSQL
psql -U postgres -d radio_station

# Check if tracks directory has files
ls -lh /var/radio/tracks/

# Check broadcast directory
ls -lh /var/radio/broadcast/

# Test Liquidsoap HTTP API
curl http://localhost:3001/health

# Backup database
pg_dump -U postgres radio_station > backup_$(date +%Y%m%d).sql
```

## Priority Score Formula

```
priority_score = 100
  + (reputation_score * 0.5)
  + (upvotes * 10)
  + (is_premium ? 50 : 0)
```

## Reputation Changes

- Song request approved (passed moderation): 0 (neutral)
- Song generated successfully: +5
- Song upvoted by other user: +2 (to requester)
- Local blocklist rejection: -5 (soft)
- OpenAI moderation rejection: -10 (hard)
- Daily activity bonus: +1
- 3+ flags: 24-hour temp ban
- 5+ flags: permanent ban

## Moderation Pipeline (Cost-Optimized)

**Order of checks (saves ~$51/month):**

1. **Local Blocklist** (free, instant)
   - Check against `blocked_content` table
   - Pattern matching on user prompt
   - Reject immediately if matched

2. **OpenAI Moderation** (only if passed blocklist)
   - POST to OpenAI moderation endpoint
   - Check category scores
   - Reject if any category > 0.5

**Cost Savings:**
- Before: 1700 requests/month @ $0.03 = $51
- After: ~600 requests/month @ $0.03 = $18 (70% caught by blocklist)

## Provider Cost Tracking

```sql
-- Monthly cost by provider
SELECT
  provider,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as tracks,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost
FROM song_generations
WHERE created_at > NOW() - INTERVAL '3 months'
GROUP BY provider, DATE_TRUNC('month', created_at)
ORDER BY month DESC, total_cost DESC;
```

## When to Use This Skill

- Checking radio station status
- Troubleshooting workflow issues
- Managing the queue
- Investigating user reputation problems
- Setting up or updating workflows
- Monitoring system health
- Understanding how the radio system works
- Optimizing provider costs
- Configuring HTTP API integration
- Managing PostgreSQL database
