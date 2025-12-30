---
name: postgresql-query-helper
description: Help with PostgreSQL queries, database operations, JSONB functions, and troubleshooting for the radio_station database. Use when the user mentions PostgreSQL, database queries, SQL, or database troubleshooting.
allowed-tools: Read, Grep, Glob
---

# PostgreSQL Query Helper

## Purpose
Assist with PostgreSQL database operations for the radio_station database, including query writing, optimization, JSONB operations, and troubleshooting.

## Database Overview

### Your Database

**radio_station** - AI Community Radio (PostgreSQL 14+)
- radio_users
- song_requests
- radio_queue
- radio_history
- moderation_logs
- user_reputation_log
- blocked_content

### Connection Info

**Host**: localhost
**Port**: 5432
**User**: postgres
**Database**: radio_station
**Connection String**: `postgresql://postgres:password@localhost:5432/radio_station`

## Common Queries

### Radio Station Queries

**Active Queue Status:**
```sql
SELECT
  rq.queue_id,
  ru.username,
  rq.song_title,
  rq.genre,
  rq.priority_score,
  rq.queue_position,
  rq.suno_status,
  EXTRACT(EPOCH FROM (NOW() - rq.queued_at)) / 60 AS minutes_in_queue
FROM radio_queue rq
JOIN radio_users ru ON rq.user_id = ru.user_id
WHERE rq.suno_status IN ('queued', 'generating', 'completed')
ORDER BY rq.priority_score DESC;
```

**User Reputation Leaderboard:**
```sql
SELECT
  username,
  reputation_score,
  successful_generations,
  total_requests,
  upvotes_received,
  is_premium,
  RANK() OVER (ORDER BY reputation_score DESC) as rank
FROM radio_users
WHERE is_banned = FALSE
ORDER BY reputation_score DESC
LIMIT 20;
```

**Recent Moderation Activity:**
```sql
SELECT
  ml.moderated_at,
  ru.username,
  ml.prompt,
  ml.decision,
  CASE
    WHEN ml.category_hate > 0.5 THEN 'Hate'
    WHEN ml.category_violence > 0.5 THEN 'Violence'
    WHEN ml.category_sexual > 0.5 THEN 'Sexual'
    WHEN ml.category_harassment > 0.5 THEN 'Harassment'
    ELSE 'Other'
  END as primary_flag
FROM moderation_logs ml
JOIN radio_users ru ON ml.user_id = ru.user_id
ORDER BY ml.moderated_at DESC
LIMIT 20;
```

**Broadcast History with Stats:**
```sql
SELECT
  DATE(played_at) as broadcast_date,
  COUNT(*) as songs_played,
  COUNT(DISTINCT user_id) as unique_artists,
  AVG(song_duration) as avg_duration,
  STRING_AGG(DISTINCT genre, ', ') as genres
FROM radio_history
GROUP BY DATE(played_at)
ORDER BY broadcast_date DESC
LIMIT 30;
```

## JSONB Functions Guide

### Why JSONB over JSON?
- **Binary storage** = faster queries
- **Indexable** with GIN indexes
- **Supports operators** like `@>`, `?`, `?|`

### JSONB Containment (@>)

Check if JSONB contains another JSONB:

```sql
-- Check if favorite_genres contains 'rock'
SELECT * FROM radio_users
WHERE favorite_genres @> '["rock"]';

-- Check if metadata has specific key-value
SELECT * FROM song_requests
WHERE audio_metadata @> '{"bpm": 128}';
```

### JSONB Existence (?, ?|, ?&)

```sql
-- Check if key exists
SELECT * FROM song_requests
WHERE audio_metadata ? 'bpm';

-- Check if ANY of these keys exist
SELECT * FROM song_requests
WHERE audio_metadata ?| ARRAY['bpm', 'energy', 'tempo'];

-- Check if ALL of these keys exist
SELECT * FROM song_requests
WHERE audio_metadata ?& ARRAY['bpm', 'genre'];
```

### JSONB Path Operators (->>, ->)

```sql
-- Extract as text (->>)
SELECT
  username,
  favorite_genres->>0 AS first_genre,
  favorite_genres->>1 AS second_genre
FROM radio_users;

-- Extract as JSONB (->)
SELECT
  song_title,
  audio_metadata->'bpm' AS bpm_json,
  (audio_metadata->>'bpm')::int AS bpm_int
FROM song_requests;
```

### JSONB Array Functions

```sql
-- Append to array
UPDATE radio_users
SET favorite_genres = favorite_genres || '["electronic"]'::jsonb
WHERE user_id = 1;

-- Remove from array
UPDATE radio_users
SET favorite_genres = favorite_genres - 'rock'
WHERE user_id = 1;

-- Get array length
SELECT username, jsonb_array_length(favorite_genres) AS genre_count
FROM radio_users;
```

### JSONB Aggregation

```sql
-- Build JSONB object from query
SELECT jsonb_build_object(
  'user_id', user_id,
  'username', username,
  'reputation', reputation_score
) AS user_json
FROM radio_users
WHERE is_premium = TRUE;

-- Aggregate rows into JSONB array
SELECT jsonb_agg(
  jsonb_build_object(
    'genre', genre,
    'count', count
  )
) AS genre_stats
FROM (
  SELECT genre, COUNT(*) as count
  FROM song_requests
  GROUP BY genre
) stats;
```

## PostgreSQL-Specific Features

### Full-Text Search with GIN Index

```sql
-- Create GIN index for text search
CREATE INDEX idx_prompt_search ON song_requests
USING GIN (to_tsvector('english', prompt));

-- Search for prompts
SELECT song_title, prompt
FROM song_requests
WHERE to_tsvector('english', prompt) @@ to_tsquery('english', 'rap & beats');
```

### Case-Insensitive Pattern Matching (ILIKE)

```sql
-- Much faster than LOWER(column) LIKE
SELECT * FROM blocked_content
WHERE user_prompt ILIKE '%badword%';

-- With index support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_prompt_trgm ON song_requests
USING GIN (prompt gin_trgm_ops);

SELECT * FROM song_requests
WHERE prompt ILIKE '%lofi%';
```

### Array Operations

```sql
-- Array contains
SELECT * FROM radio_users
WHERE 'rock' = ANY(string_to_array(favorite_genres::text, ','));

-- Array overlap
SELECT * FROM song_requests
WHERE tags && ARRAY['upbeat', 'energetic'];

-- Array to JSONB
SELECT username, array_to_json(ARRAY['rock', 'pop'])::jsonb AS genres
FROM radio_users;
```

### Window Functions

```sql
-- Running total
SELECT
  played_at,
  song_title,
  SUM(song_duration) OVER (ORDER BY played_at) as cumulative_duration
FROM radio_history;

-- Rank with partition
SELECT
  genre,
  username,
  successful_generations,
  RANK() OVER (PARTITION BY genre ORDER BY successful_generations DESC) as genre_rank
FROM radio_users
JOIN song_requests ON radio_users.user_id = song_requests.user_id;
```

### Date/Time Functions

```sql
-- Current day's violations
SELECT COUNT(*) FROM user_violations
WHERE user_id = $1
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';

-- Time calculations
SELECT
  song_title,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS minutes_ago
FROM song_requests;

-- Date truncation
SELECT
  DATE_TRUNC('hour', played_at) AS hour,
  COUNT(*) AS songs_per_hour
FROM radio_history
GROUP BY DATE_TRUNC('hour', played_at);
```

## Query Optimization

### Using Indexes

```sql
-- B-tree index for exact matches
CREATE INDEX idx_queue_status ON radio_queue(suno_status);

-- Partial index for active queue only
CREATE INDEX idx_active_queue ON radio_queue(priority_score DESC)
WHERE suno_status IN ('queued', 'generating');

-- GIN index for JSONB
CREATE INDEX idx_metadata_gin ON song_requests
USING GIN (audio_metadata);

-- GIN trigram index for pattern matching
CREATE INDEX idx_prompt_trgm ON song_requests
USING GIN (prompt gin_trgm_ops);
```

### Parameterized Queries (Prevent SQL Injection)

```sql
-- Use $1, $2, etc. (not ? or string interpolation)
-- Good:
SELECT * FROM radio_users WHERE user_id = $1;

-- Bad (vulnerable):
SELECT * FROM radio_users WHERE user_id = '${userId}';
```

### EXPLAIN ANALYZE

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM radio_queue
WHERE suno_status = 'queued'
ORDER BY priority_score DESC
LIMIT 10;

-- Look for:
-- - Seq Scan (bad) → add index
-- - Index Scan (good)
-- - Execution time
```

### Avoid N+1 Queries

**Bad:**
```sql
-- Multiple queries (slow)
SELECT * FROM radio_queue; -- Then loop and query users
```

**Good:**
```sql
-- Single JOIN query (fast)
SELECT rq.*, ru.username
FROM radio_queue rq
JOIN radio_users ru ON rq.user_id = ru.user_id;
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql -h localhost -p 5432 -U postgres -d radio_station

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check active connections
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'radio_station';
```

### Slow Queries

**Enable logging:**
```sql
-- In postgresql.conf or via SQL
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();
```

**Find slow queries:**
```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Analyze specific query:**
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM radio_queue
WHERE suno_status = 'queued';
```

### Lock Issues

**Check for locks:**
```sql
SELECT
  pid,
  usename,
  pg_blocking_pids(pid) AS blocked_by,
  query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

**Kill stuck query:**
```sql
-- Find PID
SELECT pid, query FROM pg_stat_activity WHERE state = 'active';

-- Terminate
SELECT pg_terminate_backend(12345);
```

### JSONB Issues

**Validate JSONB:**
```sql
-- Check for invalid JSONB (rare in PostgreSQL)
SELECT user_id, favorite_genres
FROM radio_users
WHERE jsonb_typeof(favorite_genres) != 'array';
```

**Fix malformed JSONB:**
```sql
-- Convert text to JSONB
UPDATE radio_users
SET favorite_genres = '["rock", "pop"]'::jsonb
WHERE user_id = 123;
```

## Useful Utilities

### Backup Database

```bash
# Backup radio_station
pg_dump -U postgres -d radio_station -F c -f backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -U postgres -d radio_station -c backup_20231215.dump
```

### Export Query Results

```sql
-- Export to CSV
COPY (SELECT * FROM radio_users) TO '/tmp/users.csv' WITH CSV HEADER;

-- Or use psql
\copy (SELECT * FROM radio_users) TO 'users.csv' WITH CSV HEADER
```

### Database Statistics

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Common Patterns

### Upsert (INSERT ... ON CONFLICT)

```sql
INSERT INTO radio_users (
  user_id,
  username,
  reputation_score
) VALUES (
  123,
  'username',
  100
)
ON CONFLICT (user_id) DO UPDATE SET
  last_active_at = NOW(),
  reputation_score = EXCLUDED.reputation_score;
```

### Conditional Updates

```sql
UPDATE radio_users
SET
  reputation_score = CASE
    WHEN is_premium THEN reputation_score + 10
    WHEN successful_generations > 10 THEN reputation_score + 5
    ELSE reputation_score + 1
  END,
  updated_at = NOW()
WHERE is_banned = FALSE;
```

### Common Table Expressions (WITH)

```sql
WITH top_users AS (
  SELECT user_id, username, reputation_score
  FROM radio_users
  WHERE reputation_score > 100
),
recent_requests AS (
  SELECT user_id, COUNT(*) as request_count
  FROM song_requests
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY user_id
)
SELECT
  tu.username,
  tu.reputation_score,
  COALESCE(rr.request_count, 0) as recent_requests
FROM top_users tu
LEFT JOIN recent_requests rr ON tu.user_id = rr.user_id;
```

### Subqueries

```sql
-- Get users above average reputation
SELECT username, reputation_score
FROM radio_users
WHERE reputation_score > (
  SELECT AVG(reputation_score)
  FROM radio_users
);

-- Correlated subquery
SELECT
  ru.username,
  (
    SELECT COUNT(*)
    FROM radio_queue rq
    WHERE rq.user_id = ru.user_id
  ) as songs_in_queue
FROM radio_users ru;
```

## Transaction Best Practices

```sql
BEGIN;

-- Multiple related updates
UPDATE radio_queue
SET suno_status = 'completed'
WHERE queue_id = 123;

UPDATE radio_users
SET successful_generations = successful_generations + 1,
    reputation_score = reputation_score + 5
WHERE user_id = 456;

INSERT INTO user_reputation_log (user_id, change_amount, reason)
VALUES (456, 5, 'Successful song generation');

-- If all succeeded
COMMIT;

-- If anything failed
-- ROLLBACK;
```

## Performance Tips

1. **Use JSONB not JSON** - Indexable and faster
2. **Create GIN indexes** for JSONB and text search
3. **Use parameterized queries** ($1, $2) always
4. **Avoid SELECT *** - Specify columns
5. **Use LIMIT** to prevent huge result sets
6. **Use pg_trgm** for ILIKE performance
7. **Monitor with pg_stat_statements**
8. **Vacuum regularly** - `VACUUM ANALYZE table_name;`

## When to Use This Skill

- Writing SQL queries for radio database (PostgreSQL)
- Troubleshooting database connection issues
- Working with JSONB fields and functions
- Optimizing slow queries
- Understanding PostgreSQL-specific features
- Backing up or restoring databases
- Fixing data integrity issues
- Generating reports from database
- Learning PostgreSQL best practices
