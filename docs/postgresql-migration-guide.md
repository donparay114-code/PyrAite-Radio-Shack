# MySQL to PostgreSQL Migration Guide

## Overview

This guide walks through migrating the PYrte Radio Station database from MySQL 8.0 to PostgreSQL 14+, including schema conversion, data migration, and application code updates.

**Migration Benefits:**
- **JSONB Support**: Faster JSON operations with GIN indexes
- **Better Performance**: Advanced query optimization
- **Modern Features**: CTEs, window functions, full-text search
- **Type Safety**: Stronger type system
- **Standard SQL**: More standards-compliant

## Pre-Migration Checklist

- [ ] Backup MySQL database
- [ ] Install PostgreSQL 14+
- [ ] Test migration on staging environment
- [ ] Update all application code for PostgreSQL syntax
- [ ] Update n8n workflows for PostgreSQL nodes
- [ ] Verify all indexes are created
- [ ] Test all queries in PostgreSQL

---

## Phase 1: Backup and Analysis

### Step 1: Backup MySQL Database

```bash
# Full database backup
mysqldump -u root -p radio_station > backup_mysql_$(date +%Y%m%d).sql

# Schema only (for conversion)
mysqldump -u root -p --no-data radio_station > schema_mysql.sql

# Data only (for migration)
mysqldump -u root -p --no-create-info radio_station > data_mysql.sql
```

### Step 2: Analyze Current Schema

```sql
-- Count records in each table
SELECT
  table_name,
  table_rows
FROM information_schema.tables
WHERE table_schema = 'radio_station';

-- Check for JSON columns
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'radio_station'
  AND data_type = 'json';

-- List all indexes
SELECT
  table_name,
  index_name,
  column_name
FROM information_schema.statistics
WHERE table_schema = 'radio_station'
ORDER BY table_name, index_name;
```

---

## Phase 2: Schema Conversion

### Key Syntax Differences

| Feature | MySQL | PostgreSQL |
|---------|-------|------------|
| Auto Increment | `AUTO_INCREMENT` | `SERIAL` or `GENERATED ALWAYS AS IDENTITY` |
| JSON Type | `JSON` | `JSONB` |
| Date Math | `DATE_SUB(NOW(), INTERVAL 5 DAY)` | `NOW() - INTERVAL '5 days'` |
| String Concatenation | `CONCAT()` | `||` operator |
| Limit/Offset | `LIMIT 10` | `LIMIT 10` (same) |
| Case Insensitive | `LIKE` | `ILIKE` |
| JSON Functions | `JSON_CONTAINS()` | `@>` operator |
| Quotes | \`backticks\` | "double quotes" |
| Current User | `USER()` | `CURRENT_USER` |

### Example: Convert radio_users Table

**MySQL:**
```sql
CREATE TABLE `radio_users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `telegram_id` BIGINT UNIQUE NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `favorite_genres` JSON DEFAULT NULL,
  `reputation_score` INT DEFAULT 100,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_reputation` (`reputation_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**PostgreSQL:**
```sql
CREATE TABLE radio_users (
  user_id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  favorite_genres JSONB DEFAULT '[]'::jsonb,
  reputation_score INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index on reputation
CREATE INDEX idx_reputation ON radio_users(reputation_score);

-- GIN index for JSONB
CREATE INDEX idx_favorite_genres ON radio_users USING GIN (favorite_genres);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON radio_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Complete Schema Conversion Script

```sql
-- PostgreSQL Schema for PYrte Radio Station

-- Radio Users
CREATE TABLE radio_users (
  user_id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  favorite_genres JSONB DEFAULT '[]'::jsonb,
  reputation_score INTEGER DEFAULT 100,
  successful_generations INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  upvotes_received INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_telegram ON radio_users(telegram_id);
CREATE INDEX idx_users_reputation ON radio_users(reputation_score DESC);
CREATE INDEX idx_users_active ON radio_users(last_active_at DESC);
CREATE INDEX idx_users_genres ON radio_users USING GIN (favorite_genres);

-- Song Requests
CREATE TABLE song_requests (
  request_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES radio_users(user_id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  genre VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_requests_user ON song_requests(user_id);
CREATE INDEX idx_requests_status ON song_requests(status, created_at DESC);

-- Song Generations (new table for provider tracking)
CREATE TABLE song_generations (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES song_requests(request_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES radio_users(user_id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  audio_url TEXT,
  local_file_path TEXT,
  duration INTEGER,
  cost DECIMAL(10, 4),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_generations_provider ON song_generations(provider, status);
CREATE INDEX idx_generations_task ON song_generations(task_id);
CREATE INDEX idx_generations_cost ON song_generations(created_at, cost);
CREATE INDEX idx_generations_metadata ON song_generations USING GIN (metadata);

-- Radio Queue
CREATE TABLE radio_queue (
  queue_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES radio_users(user_id) ON DELETE CASCADE,
  generation_id INTEGER REFERENCES song_generations(id) ON DELETE SET NULL,
  song_title VARCHAR(255),
  genre VARCHAR(100),
  priority_score INTEGER DEFAULT 100,
  queue_position INTEGER,
  status VARCHAR(50) DEFAULT 'queued',
  provider VARCHAR(50),
  task_id VARCHAR(255),
  generation_started_at TIMESTAMP,
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_queue_status ON radio_queue(status, priority_score DESC);
CREATE INDEX idx_queue_user ON radio_queue(user_id);
CREATE INDEX idx_queue_provider ON radio_queue(provider, status);

-- Radio History
CREATE TABLE radio_history (
  history_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES radio_users(user_id) ON DELETE SET NULL,
  song_title VARCHAR(255),
  genre VARCHAR(100),
  provider VARCHAR(50),
  song_duration INTEGER,
  local_file_path TEXT,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_played ON radio_history(played_at DESC);
CREATE INDEX idx_history_user ON radio_history(user_id);
CREATE INDEX idx_history_genre ON radio_history(genre);
CREATE INDEX idx_history_provider ON radio_history(provider, played_at DESC);

-- Moderation Logs
CREATE TABLE moderation_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES radio_users(user_id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  decision VARCHAR(50) NOT NULL,
  blocklist_matched BOOLEAN DEFAULT FALSE,
  category_hate DECIMAL(3, 2),
  category_violence DECIMAL(3, 2),
  category_sexual DECIMAL(3, 2),
  category_harassment DECIMAL(3, 2),
  moderated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_moderation_user ON moderation_logs(user_id);
CREATE INDEX idx_moderation_decision ON moderation_logs(decision, moderated_at DESC);
CREATE INDEX idx_moderation_blocklist ON moderation_logs(blocklist_matched);

-- User Reputation Log
CREATE TABLE user_reputation_log (
  log_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES radio_users(user_id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  change_amount INTEGER NOT NULL,
  old_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reputation_log_user ON user_reputation_log(user_id, changed_at DESC);

-- Blocked Content (new table for local blocklist)
CREATE TABLE blocked_content (
  id SERIAL PRIMARY KEY,
  pattern TEXT NOT NULL,
  category VARCHAR(100),
  severity VARCHAR(50) DEFAULT 'medium',
  added_by VARCHAR(100) DEFAULT 'system',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_blocked_pattern ON blocked_content USING GIN (to_tsvector('english', pattern));

-- Migration History (track schema versions)
CREATE TABLE migration_history (
  migration_id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON radio_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Phase 3: Data Migration

### Option 1: pgloader (Recommended)

**Install pgloader:**
```bash
# Ubuntu/Debian
apt-get install pgloader

# macOS
brew install pgloader
```

**Create migration config:**
```lisp
LOAD DATABASE
  FROM mysql://root:password@localhost/radio_station
  INTO postgresql://postgres:password@localhost/radio_station

WITH include drop, create tables, create indexes, reset sequences,
     workers = 8, concurrency = 1,
     multiple readers per thread, rows per range = 50000

SET PostgreSQL PARAMETERS
  maintenance_work_mem to '512MB',
  work_mem to '128MB'

CAST type json to jsonb drop typemod

ALTER SCHEMA 'radio_station' RENAME TO 'public'

BEFORE LOAD DO
  $$ DROP SCHEMA IF EXISTS public CASCADE; $$,
  $$ CREATE SCHEMA public; $$;
```

**Run migration:**
```bash
pgloader mysql-to-postgresql.load
```

### Option 2: Manual Export/Import

**Export from MySQL:**
```bash
# Export as CSV
mysql -u root -p -e "
  SELECT * FROM radio_users
  INTO OUTFILE '/tmp/radio_users.csv'
  FIELDS TERMINATED BY ','
  ENCLOSED BY '\"'
  LINES TERMINATED BY '\n'
" radio_station

# Repeat for each table
```

**Import to PostgreSQL:**
```bash
psql -U postgres -d radio_station -c "
  COPY radio_users FROM '/tmp/radio_users.csv'
  WITH (FORMAT csv, HEADER true);
"
```

### Option 3: Python Migration Script

```python
import pymysql
import psycopg2
import json

# Connect to MySQL
mysql_conn = pymysql.connect(
    host='localhost',
    user='root',
    password='password',
    database='radio_station'
)

# Connect to PostgreSQL
pg_conn = psycopg2.connect(
    host='localhost',
    user='postgres',
    password='password',
    database='radio_station'
)

# Migrate radio_users
with mysql_conn.cursor(pymysql.cursors.DictCursor) as cursor:
    cursor.execute("SELECT * FROM radio_users")
    users = cursor.fetchall()

    with pg_conn.cursor() as pg_cursor:
        for user in users:
            # Convert JSON to JSONB
            if user['favorite_genres']:
                user['favorite_genres'] = json.dumps(user['favorite_genres'])

            pg_cursor.execute("""
                INSERT INTO radio_users (
                    user_id, telegram_id, username, favorite_genres,
                    reputation_score, created_at, updated_at
                ) VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s)
            """, (
                user['user_id'],
                user['telegram_id'],
                user['username'],
                user['favorite_genres'],
                user['reputation_score'],
                user['created_at'],
                user['updated_at']
            ))

pg_conn.commit()
print(f"Migrated {len(users)} users")
```

---

## Phase 4: Application Code Updates

### Update n8n MySQL Nodes to PostgreSQL

**Before (MySQL):**
```json
{
  "node": "MySQL",
  "operation": "executeQuery",
  "query": "SELECT * FROM radio_users WHERE favorite_genres @> ?",
  "parameters": "[\"rock\"]"
}
```

**After (PostgreSQL):**
```json
{
  "node": "PostgreSQL",
  "operation": "executeQuery",
  "query": "SELECT * FROM radio_users WHERE favorite_genres @> $1::jsonb",
  "parameters": {
    "parameters": [["rock"]]
  }
}
```

### Update Query Syntax

**Date Operations:**
```sql
-- MySQL
SELECT * FROM radio_queue
WHERE generation_started_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);

-- PostgreSQL
SELECT * FROM radio_queue
WHERE generation_started_at < NOW() - INTERVAL '10 minutes';
```

**JSON Operations:**
```sql
-- MySQL
SELECT * FROM radio_users
WHERE JSON_CONTAINS(favorite_genres, '["rock"]');

-- PostgreSQL
SELECT * FROM radio_users
WHERE favorite_genres @> '["rock"]';
```

**Upsert Operations:**
```sql
-- MySQL
INSERT INTO radio_users (telegram_id, username)
VALUES (123456, 'user1')
ON DUPLICATE KEY UPDATE
  last_active_at = NOW();

-- PostgreSQL
INSERT INTO radio_users (telegram_id, username)
VALUES (123456, 'user1')
ON CONFLICT (telegram_id) DO UPDATE SET
  last_active_at = NOW();
```

### Update Connection Strings

**Before (MySQL):**
```bash
DATABASE_URL="mysql://root:password@localhost:3306/radio_station"
```

**After (PostgreSQL):**
```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/radio_station"
```

---

## Phase 5: Performance Optimization

### Create Indexes

```sql
-- GIN indexes for JSONB
CREATE INDEX idx_users_genres_gin ON radio_users USING GIN (favorite_genres);
CREATE INDEX idx_generations_metadata_gin ON song_generations USING GIN (metadata);

-- Full-text search
CREATE INDEX idx_prompt_search ON song_requests
USING GIN (to_tsvector('english', prompt));

-- Partial indexes for active records
CREATE INDEX idx_queue_active ON radio_queue(priority_score DESC)
WHERE status IN ('queued', 'generating');

-- Covering indexes
CREATE INDEX idx_history_summary ON radio_history(played_at DESC, genre, provider)
INCLUDE (song_title, upvotes);
```

### Analyze Tables

```sql
-- Update statistics
VACUUM ANALYZE radio_users;
VACUUM ANALYZE song_requests;
VACUUM ANALYZE radio_queue;
VACUUM ANALYZE radio_history;

-- Auto-vacuum settings
ALTER TABLE radio_queue SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE radio_history SET (autovacuum_vacuum_scale_factor = 0.2);
```

---

## Phase 6: Testing

### Functional Tests

```sql
-- Test JSON queries
SELECT * FROM radio_users
WHERE favorite_genres @> '["rap"]';

-- Test date operations
SELECT * FROM radio_queue
WHERE queued_at > NOW() - INTERVAL '24 hours';

-- Test full-text search
SELECT * FROM song_requests
WHERE to_tsvector('english', prompt) @@ to_tsquery('english', 'lofi & chill');

-- Test upsert
INSERT INTO radio_users (telegram_id, username)
VALUES (999999, 'test_user')
ON CONFLICT (telegram_id) DO UPDATE SET
  last_active_at = NOW()
RETURNING *;
```

### Performance Tests

```sql
-- Compare query performance
EXPLAIN ANALYZE
SELECT * FROM radio_queue
WHERE status = 'queued'
ORDER BY priority_score DESC
LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## Phase 7: Cutover

### Pre-Cutover Checklist

- [ ] All data migrated successfully
- [ ] All indexes created
- [ ] All n8n workflows updated
- [ ] Application code updated and tested
- [ ] Performance tests passing
- [ ] Backup strategy in place

### Cutover Steps

1. **Stop all n8n workflows**
```bash
# Deactivate all radio workflows
```

2. **Final data sync**
```bash
# Export latest changes from MySQL
mysqldump radio_station > final_sync.sql

# Convert and import to PostgreSQL
# (use pgloader or manual process)
```

3. **Switch database connection**
```bash
# Update .env file
sed -i 's/mysql:/postgresql:/g' .env

# Restart services
systemctl restart n8n
systemctl restart radio-api
```

4. **Activate workflows**
```bash
# Reactivate all radio workflows in n8n
```

5. **Monitor**
```bash
# Watch PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log

# Monitor n8n execution
# Check n8n UI for errors
```

---

## Rollback Plan

If issues occur, rollback to MySQL:

1. **Stop all workflows**

2. **Restore database connection**
```bash
# Revert .env changes
git checkout .env

# Restart services
systemctl restart n8n
systemctl restart radio-api
```

3. **Verify MySQL is running**
```bash
systemctl status mysql
mysql -u root -p -e "SELECT COUNT(*) FROM radio_users" radio_station
```

4. **Reactivate workflows**

---

## Post-Migration

### Monitoring

```sql
-- Monitor database size
SELECT
  pg_size_pretty(pg_database_size('radio_station')) as db_size;

-- Monitor table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Backup Strategy

```bash
# Daily backup
0 2 * * * pg_dump -U postgres radio_station | gzip > /backups/radio_station_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup
0 3 * * 0 pg_basebackup -U postgres -D /backups/base_$(date +\%Y\%m\%d)
```

### Maintenance

```sql
-- Weekly vacuum
VACUUM ANALYZE;

-- Monthly full vacuum
VACUUM FULL;

-- Reindex if needed
REINDEX DATABASE radio_station;
```

---

## Troubleshooting

### Connection Issues

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U postgres -d radio_station -c "SELECT version();"

# Check pg_hba.conf for authentication
cat /etc/postgresql/14/main/pg_hba.conf
```

### Performance Issues

```sql
-- Find slow queries
SELECT
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds';

-- Kill slow query
SELECT pg_terminate_backend(pid);

-- Analyze query plan
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM radio_queue WHERE status = 'queued';
```

### Data Integrity

```sql
-- Verify record counts match
SELECT 'radio_users' as table_name, COUNT(*) FROM radio_users
UNION ALL
SELECT 'song_requests', COUNT(*) FROM song_requests
UNION ALL
SELECT 'radio_queue', COUNT(*) FROM radio_queue;

-- Check for null values
SELECT COUNT(*) FROM radio_users WHERE username IS NULL;

-- Verify foreign keys
SELECT COUNT(*) FROM song_requests sr
LEFT JOIN radio_users ru ON sr.user_id = ru.user_id
WHERE ru.user_id IS NULL;
```

---

## Reference

- [PostgreSQL 14 Documentation](https://www.postgresql.org/docs/14/)
- [pgloader Documentation](https://pgloader.io/)
- [MySQL to PostgreSQL Migration](https://wiki.postgresql.org/wiki/Converting_from_other_Databases_to_PostgreSQL)

For skill documentation, see:
- `.claude/skills/postgresql-query-helper/SKILL.md`
- `.claude/skills/database-migrator/SKILL.md`
- `.claude/agents/07-database-specialist.md`
