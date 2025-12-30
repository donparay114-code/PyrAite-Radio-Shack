---
name: mysql-query-helper
description: "[DEPRECATED] Use postgresql-query-helper instead. The radio station database has migrated to PostgreSQL 14+ with JSONB support and better performance."
allowed-tools: Read, Grep, Glob
---

# MySQL Query Helper (DEPRECATED)

> **⚠️ DEPRECATED**: This skill has been replaced by `postgresql-query-helper`. The PYrte Radio Station database now uses PostgreSQL 14+ for better performance, JSONB support, and modern features.

## Migration Guide

**Key Differences:**

| MySQL | PostgreSQL |
|-------|------------|
| `AUTO_INCREMENT` | `SERIAL` |
| `JSON` column type | `JSONB` column type |
| `JSON_CONTAINS()` | `@>` operator |
| `JSON_OVERLAPS()` | `?|` operator |
| `DATE_SUB(NOW(), INTERVAL 5 DAY)` | `NOW() - INTERVAL '5 days'` |
| \`backticks\` | "double quotes" |
| `SHOW PROCESSLIST` | `pg_stat_activity` |

**Migration Steps:**
1. Export data: `mysqldump radio_station > backup.sql`
2. Convert schema to PostgreSQL syntax
3. Import to PostgreSQL: `psql radio_station < converted.sql`
4. Update all application code to use PostgreSQL syntax
5. Use `postgresql-query-helper` skill for future queries

See `postgresql-migration-guide.md` for detailed migration instructions.

---

# Legacy MySQL Documentation

## Purpose
Legacy documentation for MySQL operations. **Use postgresql-query-helper for current database.**

## Database Overview

### Your Databases

**radio_station** - AI Community Radio
- radio_users
- song_requests
- radio_queue
- radio_history
- moderation_logs
- user_reputation_log

### Connection Info

**Host**: localhost
**Port**: 3306
**User**: root
**Password**: Hunter0hunter2207

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
  TIMESTAMPDIFF(MINUTE, rq.queued_at, NOW()) as minutes_in_queue
FROM radio_station.radio_queue rq
JOIN radio_station.radio_users ru ON rq.user_id = ru.user_id
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
FROM radio_station.radio_users
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
FROM radio_station.moderation_logs ml
JOIN radio_station.radio_users ru ON ml.user_id = ru.user_id
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
  GROUP_CONCAT(DISTINCT genre SEPARATOR ', ') as genres
FROM radio_station.radio_history
GROUP BY DATE(played_at)
ORDER BY broadcast_date DESC
LIMIT 30;
```

## JSON Functions Guide

### JSON_OVERLAPS (MySQL 8.0.17+)

Check if two JSON arrays have common elements:

```sql
-- Check if arrays overlap
SELECT JSON_OVERLAPS(
  '["rock", "pop"]',
  '["pop", "jazz"]'
) as has_overlap;  -- Returns 1 (true)

-- Example usage in WHERE clause
SELECT * FROM radio_station.radio_users
WHERE JSON_OVERLAPS(
  favorite_genres,
  '["rock", "metal"]'
);
```

### JSON_CONTAINS

Check if a JSON document contains a value:

```sql
-- Check if array contains specific value
SELECT * FROM radio_station.song_requests
WHERE JSON_CONTAINS(
  tags,
  '"upbeat"'
);

-- Check with path
SELECT * FROM radio_station.radio_users
WHERE JSON_CONTAINS(
  favorite_genres,
  '"rock"',
  '$'
);
```

### JSON_ARRAY_APPEND

Add element to JSON array:

```sql
-- Add new genre to user's favorites
UPDATE radio_station.radio_users
SET favorite_genres = JSON_ARRAY_APPEND(
  favorite_genres,
  '$',
  'electronic'
)
WHERE user_id = 1;
```

### JSON_EXTRACT

Extract values from JSON:

```sql
-- Get specific element
SELECT
  username,
  JSON_EXTRACT(favorite_genres, '$[0]') as first_genre,
  JSON_EXTRACT(favorite_genres, '$[1]') as second_genre
FROM radio_station.radio_users;

-- Using -> operator (shorthand)
SELECT
  username,
  favorite_genres->'$[0]' as first_genre
FROM radio_station.radio_users;
```

### JSON_VALID

Check if string is valid JSON:

```sql
-- Find invalid JSON
SELECT * FROM radio_station.radio_users
WHERE JSON_VALID(favorite_genres) = 0;
```

## Query Optimization

### Using Indexes

```sql
-- Create index on frequently queried columns
CREATE INDEX idx_queue_status ON radio_station.radio_queue(suno_status);
CREATE INDEX idx_user_reputation ON radio_station.radio_users(reputation_score DESC);
CREATE INDEX idx_history_played ON radio_station.radio_history(played_at DESC);

-- Check index usage
EXPLAIN SELECT * FROM radio_station.radio_queue
WHERE suno_status = 'queued';
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
FROM radio_station.radio_queue rq
JOIN radio_station.radio_users ru ON rq.user_id = ru.user_id;
```

### Limit Results

```sql
-- Always use LIMIT for large tables
SELECT * FROM radio_station.radio_history
ORDER BY played_at DESC
LIMIT 100;

-- Pagination
SELECT * FROM radio_station.radio_history
ORDER BY played_at DESC
LIMIT 100 OFFSET 100;  -- Page 2
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
mysql -h localhost -P 3306 -u root -p

# Check if MySQL is running
# Windows:
tasklist | findstr mysqld
net start | findstr MySQL

# Start MySQL if not running
net start MySQL
```

### Slow Queries

**Enable slow query log:**
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- Log queries over 2 seconds
```

**Find slow queries:**
```sql
SHOW PROCESSLIST;
```

**Analyze query:**
```sql
EXPLAIN SELECT * FROM radio_station.radio_queue
WHERE suno_status = 'queued';
```

### Lock Issues

**Check for locks:**
```sql
SHOW OPEN TABLES WHERE In_use > 0;

-- Check InnoDB status
SHOW ENGINE INNODB STATUS;
```

**Kill stuck query:**
```sql
SHOW PROCESSLIST;
KILL [process_id];
```

### JSON Issues

**Fix invalid JSON:**
```sql
-- Check what's invalid
SELECT user_id, favorite_genres
FROM radio_station.radio_users
WHERE JSON_VALID(favorite_genres) = 0;

-- Fix by re-creating array
UPDATE radio_station.radio_users
SET favorite_genres = JSON_ARRAY('rock', 'pop')
WHERE user_id = [bad_id];
```

## Useful Utilities

### Backup Database

```bash
# Backup radio_station
mysqldump -u root -p radio_station > C:\Users\Jesse\.gemini\antigravity\backups\radio_station_$(date +%Y%m%d).sql

# Restore from backup
mysql -u root -p radio_station < backup.sql
```

### Export Query Results

```sql
-- Export to CSV
SELECT * FROM radio_station.radio_users
INTO OUTFILE 'C:/Users/Jesse/.gemini/antigravity/exports/users.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

### Database Statistics

```sql
-- Table sizes
SELECT
  TABLE_NAME,
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS Size_MB,
  TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'radio_station'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

## Useful Queries File

Location: `C:\Users\Jesse\.gemini\antigravity\useful_queries.sql`

This file contains pre-written queries for common tasks.

## Query Templates

### Insert with Duplicate Key Update

```sql
INSERT INTO radio_station.radio_users (
  user_id,
  username,
  reputation_score
) VALUES (
  123,
  'username',
  100
)
ON DUPLICATE KEY UPDATE
  last_active_at = NOW(),
  reputation_score = VALUES(reputation_score);
```

### Conditional Updates

```sql
UPDATE radio_station.radio_users
SET
  reputation_score = CASE
    WHEN is_premium THEN reputation_score + 10
    WHEN successful_generations > 10 THEN reputation_score + 5
    ELSE reputation_score + 1
  END,
  updated_at = NOW()
WHERE is_banned = FALSE;
```

### Window Functions

```sql
-- Running total
SELECT
  played_at,
  song_title,
  SUM(song_duration) OVER (ORDER BY played_at) as cumulative_duration
FROM radio_station.radio_history;

-- Rank by reputation with ties
SELECT
  username,
  reputation_score,
  RANK() OVER (ORDER BY reputation_score DESC) as rank,
  DENSE_RANK() OVER (ORDER BY reputation_score DESC) as dense_rank
FROM radio_station.radio_users;
```

### Subqueries

```sql
-- Get users above average reputation
SELECT username, reputation_score
FROM radio_station.radio_users
WHERE reputation_score > (
  SELECT AVG(reputation_score)
  FROM radio_station.radio_users
);

-- Correlated subquery
SELECT
  ru.username,
  (
    SELECT COUNT(*)
    FROM radio_station.radio_queue rq
    WHERE rq.user_id = ru.user_id
  ) as songs_in_queue
FROM radio_station.radio_users ru;
```

## Best Practices

1. **Always use WHERE clauses**: Prevent accidental full table scans
2. **Use JOINs instead of subqueries**: Generally faster
3. **Add indexes strategically**: On foreign keys and WHERE columns
4. **Use LIMIT**: Prevent overwhelming result sets
5. **Backup before major changes**: Can't undo UPDATE/DELETE
6. **Test on development first**: Don't experiment on production
7. **Use transactions**: For multi-step operations
8. **Monitor slow queries**: Identify bottlenecks

## Transaction Example

```sql
START TRANSACTION;

-- Multiple related updates
UPDATE radio_station.radio_queue
SET suno_status = 'completed'
WHERE queue_id = 123;

UPDATE radio_station.radio_users
SET successful_generations = successful_generations + 1,
    reputation_score = reputation_score + 5
WHERE user_id = 456;

INSERT INTO radio_station.user_reputation_log (...)
VALUES (...);

-- If all succeeded
COMMIT;

-- If anything failed
-- ROLLBACK;
```

## When to Use This Skill

- Writing SQL queries for radio database
- Troubleshooting database connection issues
- Working with JSON fields and functions
- Optimizing slow queries
- Understanding database schema
- Backing up or restoring databases
- Fixing data integrity issues
- Generating reports from database
- Learning MySQL best practices
