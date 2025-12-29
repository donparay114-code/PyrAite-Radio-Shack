---
name: n8n-radio-station
description: Manage and troubleshoot the AI Community Radio Station n8n workflows. Use when the user mentions radio, music generation, queue, broadcasting, DJ, Telegram bot, reputation, or radio station workflows.
---

# AI Community Radio Station Manager

## Purpose
Manage the complete AI Community Radio Station system including 4 n8n workflows, database operations, and troubleshooting.

## System Overview

The radio station consists of 4 integrated n8n workflows:

1. **AI Radio - Music Generator v2 (MySQL)** - Telegram bot for song requests
2. **Radio Queue Processor** - Suno music generation & download
3. **Radio Station Director (Broadcaster)** - DJ intros + audio stitching
4. **Radio Reputation Calculator** - User reputation & priority management

### File Locations

```
C:\Users\Jesse\.gemini\antigravity\radio\n8n_workflows\
├── ai_radio_mysql_v2.json          # Telegram request handler
├── queue_processor.json             # Suno generation
├── radio_station_director.json      # Broadcasting
├── reputation_calculator.json       # Reputation system
└── README.md                        # Setup guide

C:\Users\Jesse\.gemini\antigravity\radio\
├── songs\                           # Generated MP3 files
├── temp\                            # DJ intro audio files
└── broadcast\                       # Stitched audio (intro + song)
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

### Monitor Queue

```sql
-- Check current queue
SELECT
  rq.queue_id,
  ru.username,
  rq.song_title,
  rq.priority_score,
  rq.queue_position,
  rq.suno_status
FROM radio_station.radio_queue rq
JOIN radio_station.radio_users ru ON rq.user_id = ru.user_id
WHERE rq.suno_status != 'failed'
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
  sr.status,
  sr.created_at
FROM radio_station.song_requests sr
JOIN radio_station.radio_users ru ON sr.user_id = ru.user_id
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
FROM radio_station.radio_users
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
  song_duration,
  played_at
FROM radio_station.radio_history
ORDER BY played_at DESC
LIMIT 20;
```

## Troubleshooting Guide

### Issue: Songs Not Generating

**Check:**
1. Queue Processor workflow is active
2. Suno API is accessible
3. Check execution logs in n8n

```sql
-- Find stuck songs
SELECT * FROM radio_station.radio_queue
WHERE suno_status = 'generating'
AND generation_started_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

**Fix:**
```sql
-- Reset stuck songs
UPDATE radio_station.radio_queue
SET suno_status = 'queued',
    generation_started_at = NULL
WHERE suno_status = 'generating'
AND generation_started_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

### Issue: Broadcasting Not Working

**Check:**
1. Radio Station Director workflow is active
2. Songs with status 'completed' exist in queue
3. FFmpeg is available in PATH
4. Directories exist: `temp/` and `broadcast/`

```sql
-- Check ready songs
SELECT * FROM radio_station.radio_queue
WHERE suno_status = 'completed';
```

### Issue: Telegram Bot Not Responding

**Check:**
1. AI Radio workflow is active
2. Telegram credentials are valid
3. Bot token is correct

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
FROM radio_station.user_reputation_log url
JOIN radio_station.radio_users ru ON url.user_id = ru.user_id
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
  ml.category_hate,
  ml.category_violence,
  ml.category_sexual,
  ml.category_harassment
FROM radio_station.moderation_logs ml
JOIN radio_station.radio_users ru ON ml.user_id = ru.user_id
WHERE ml.decision = 'rejected'
ORDER BY ml.moderated_at DESC
LIMIT 10;
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

### Update Suno API URL

When Suno API URL changes, update in queue_processor.json:

1. Read the workflow file
2. Find "Suno API - Generate" and "Check Suno Status" nodes
3. Update URL fields
4. Use MCP to update workflow

### Monitor System Health

```sql
-- Get statistics
SELECT
  (SELECT COUNT(*) FROM radio_station.radio_users WHERE is_banned = FALSE) as active_users,
  (SELECT COUNT(*) FROM radio_station.radio_users WHERE is_premium = TRUE) as premium_users,
  (SELECT COUNT(*) FROM radio_station.radio_queue WHERE suno_status = 'queued') as queued_songs,
  (SELECT COUNT(*) FROM radio_station.radio_queue WHERE suno_status = 'generating') as generating_songs,
  (SELECT COUNT(*) FROM radio_station.radio_queue WHERE suno_status = 'completed') as ready_to_broadcast,
  (SELECT AVG(reputation_score) FROM radio_station.radio_users WHERE is_banned = FALSE) as avg_reputation;
```

## Database Schema Reference

### Key Tables

- **radio_users** - User accounts, reputation, premium status
- **song_requests** - All song requests (approved and rejected)
- **radio_queue** - Active queue with priority scores
- **radio_history** - Broadcast history
- **moderation_logs** - OpenAI moderation decisions
- **user_reputation_log** - Reputation change history

## Best Practices

1. **Monitor regularly**: Check queue status and workflow executions
2. **Clean up**: Archive old history records periodically
3. **Backup**: Regularly backup the radio_station database
4. **Test changes**: Use manual triggers in n8n before activating
5. **Check logs**: Review n8n execution logs for errors

## Quick Commands

```bash
# Start n8n
cd C:\Users\Jesse\.gemini\antigravity
start_n8n.bat

# Connect to MySQL
mysql -u root -p radio_station

# Check if songs directory has files
ls C:\Users\Jesse\.gemini\antigravity\radio\songs\

# Check broadcast directory
ls C:\Users\Jesse\.gemini\antigravity\radio\broadcast\
```

## Priority Score Formula

```
priority_score = 100
  + (reputation_score * 0.5)
  + (upvotes * 10)
  + (is_premium ? 50 : 0)
```

## Reputation Changes

- Song request approved: 0 (neutral)
- Song generated successfully: +5
- Song upvoted by other user: +2 (to requester)
- Moderation rejection: -10
- Daily activity bonus: +1
- 3+ flags: 24-hour temp ban
- 5+ flags: permanent ban

## When to Use This Skill

- Checking radio station status
- Troubleshooting workflow issues
- Managing the queue
- Investigating user reputation problems
- Setting up or updating workflows
- Monitoring system health
- Understanding how the radio system works
