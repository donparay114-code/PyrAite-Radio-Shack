---
name: database-migrator
description: Create, manage, and run MySQL database migrations with version control and rollback support. Use when the user mentions database migrations, schema changes, database versioning, or database updates.
---

# Database Migrator

## Purpose
Safely manage database schema changes through versioned migration files with automatic rollback capabilities.

## Your Databases

**radio_station** - AI Community Radio
- Active production database
- Frequent schema updates

## Migration System

### Directory Structure

```
C:\Users\Jesse\.gemini\antigravity\
├── migrations\
│   ├── radio_station\
│   │   ├── 001_initial_setup.sql
│   │   ├── 001_initial_setup_rollback.sql
│   │   ├── 002_add_reputation_log.sql
│   │   ├── 002_add_reputation_log_rollback.sql
│   │   └── ...
│   └── migration_tracker.sql
```

### Migration Tracker Table

```sql
-- Create migration tracking table
CREATE TABLE IF NOT EXISTS migration_history (
  migration_id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  database_name VARCHAR(100) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_by VARCHAR(100) DEFAULT USER(),
  checksum VARCHAR(64),
  INDEX idx_database (database_name),
  INDEX idx_version (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Creating Migrations

### Migration File Template

```sql
-- Migration: 003_add_broadcasting_tables
-- Database: radio_station
-- Description: Add tables for broadcasting and DJ intros
-- Date: 2025-12-25
-- Author: Jesse

-- ==================================================
-- UP MIGRATION
-- ==================================================

START TRANSACTION;

-- Create new table
CREATE TABLE IF NOT EXISTS radio_station.broadcast_schedule (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  queue_id INT NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  broadcast_status ENUM('pending', 'broadcasting', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (queue_id) REFERENCES radio_queue(queue_id) ON DELETE CASCADE,
  INDEX idx_scheduled_time (scheduled_time),
  INDEX idx_status (broadcast_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add new column to existing table
ALTER TABLE radio_station.radio_queue
ADD COLUMN broadcast_ready BOOLEAN DEFAULT FALSE AFTER suno_status;

-- Update existing data
UPDATE radio_station.radio_queue
SET broadcast_ready = TRUE
WHERE suno_status = 'completed';

-- Record migration
INSERT INTO migration_history (version, description, database_name, checksum)
VALUES ('003', 'Add broadcasting tables', 'radio_station', SHA2('003_add_broadcasting_tables', 256));

COMMIT;
```

### Rollback File Template

```sql
-- Rollback Migration: 003_add_broadcasting_tables
-- Database: radio_station

-- ==================================================
-- DOWN MIGRATION (ROLLBACK)
-- ==================================================

START TRANSACTION;

-- Remove column
ALTER TABLE radio_station.radio_queue
DROP COLUMN broadcast_ready;

-- Drop table
DROP TABLE IF EXISTS radio_station.broadcast_schedule;

-- Remove migration record
DELETE FROM migration_history
WHERE version = '003' AND database_name = 'radio_station';

COMMIT;
```

## Running Migrations

### Manual Execution

```bash
# Run migration
mysql -u root -pHunter0hunter2207 radio_station < migrations/radio_station/003_add_broadcasting_tables.sql

# Rollback if needed
mysql -u root -pHunter0hunter2207 radio_station < migrations/radio_station/003_add_broadcasting_tables_rollback.sql
```

### Automated Migration Script

```bash
#!/bin/bash
# migrate.sh

DB_USER="root"
DB_PASS="Hunter0hunter2207"
DB_NAME="$1"
MIGRATION_FILE="$2"

if [ -z "$DB_NAME" ] || [ -z "$MIGRATION_FILE" ]; then
  echo "Usage: ./migrate.sh <database> <migration_file>"
  echo "Example: ./migrate.sh radio_station migrations/radio_station/003_add_broadcasting_tables.sql"
  exit 1
fi

echo "=== Running Migration ==="
echo "Database: $DB_NAME"
echo "File: $MIGRATION_FILE"
echo ""

# Check if migration already applied
VERSION=$(basename "$MIGRATION_FILE" | cut -d'_' -f1)
APPLIED=$(mysql -u $DB_USER -p$DB_PASS -se "SELECT COUNT(*) FROM migration_history WHERE version = '$VERSION' AND database_name = '$DB_NAME'")

if [ "$APPLIED" -gt 0 ]; then
  echo "⚠ Migration $VERSION already applied to $DB_NAME"
  echo "Run rollback first if you want to re-apply"
  exit 1
fi

# Backup before migration
BACKUP_FILE="backups/${DB_NAME}_pre_${VERSION}_$(date +%Y%m%d_%H%M%S).sql"
echo "Creating backup: $BACKUP_FILE"
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# Run migration
echo "Applying migration..."
mysql -u $DB_USER -p$DB_PASS $DB_NAME < $MIGRATION_FILE

if [ $? -eq 0 ]; then
  echo "✓ Migration applied successfully"
else
  echo "✗ Migration failed"
  echo "Restoring from backup..."
  mysql -u $DB_USER -p$DB_PASS $DB_NAME < $BACKUP_FILE
  exit 1
fi
```

### Rollback Script

```bash
#!/bin/bash
# rollback.sh

DB_USER="root"
DB_PASS="Hunter0hunter2207"
DB_NAME="$1"
VERSION="$2"

if [ -z "$DB_NAME" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./rollback.sh <database> <version>"
  echo "Example: ./rollback.sh radio_station 003"
  exit 1
fi

ROLLBACK_FILE="migrations/${DB_NAME}/${VERSION}_*_rollback.sql"

echo "=== Rolling Back Migration ==="
echo "Database: $DB_NAME"
echo "Version: $VERSION"
echo ""

# Find rollback file
ROLLBACK_FILE=$(ls migrations/${DB_NAME}/${VERSION}_*_rollback.sql 2>/dev/null | head -1)

if [ -z "$ROLLBACK_FILE" ]; then
  echo "✗ Rollback file not found for version $VERSION"
  exit 1
fi

echo "Rollback file: $ROLLBACK_FILE"

# Backup before rollback
BACKUP_FILE="backups/${DB_NAME}_pre_rollback_${VERSION}_$(date +%Y%m%d_%H%M%S).sql"
echo "Creating backup: $BACKUP_FILE"
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE

# Run rollback
echo "Rolling back..."
mysql -u $DB_USER -p$DB_PASS $DB_NAME < $ROLLBACK_FILE

if [ $? -eq 0 ]; then
  echo "✓ Rollback completed successfully"
else
  echo "✗ Rollback failed"
  exit 1
fi
```

## Migration Status

### Check Applied Migrations

```sql
-- View all applied migrations
SELECT
  version,
  description,
  database_name,
  applied_at,
  applied_by
FROM migration_history
ORDER BY database_name, version;

-- Check specific database
SELECT
  version,
  description,
  applied_at
FROM migration_history
WHERE database_name = 'radio_station'
ORDER BY version DESC;

-- Get latest migration
SELECT
  version,
  description,
  applied_at
FROM migration_history
WHERE database_name = 'radio_station'
ORDER BY applied_at DESC
LIMIT 1;
```

### Pending Migrations

```bash
#!/bin/bash
# check_pending.sh

DB_NAME="$1"

# List all migration files
echo "=== Migration Status for $DB_NAME ==="
echo ""

for file in migrations/${DB_NAME}/*.sql; do
  # Skip rollback files
  if [[ $file == *"_rollback.sql" ]]; then
    continue
  fi

  VERSION=$(basename "$file" | cut -d'_' -f1)

  # Check if applied
  APPLIED=$(mysql -u root -pHunter0hunter2207 -se "SELECT COUNT(*) FROM migration_history WHERE version = '$VERSION' AND database_name = '$DB_NAME'")

  if [ "$APPLIED" -gt 0 ]; then
    echo "✓ $VERSION - $(basename $file)"
  else
    echo "⏳ $VERSION - $(basename $file) [PENDING]"
  fi
done
```

## Best Practices

### Naming Convention

```
<version>_<description>.sql
<version>_<description>_rollback.sql

Examples:
001_initial_setup.sql
001_initial_setup_rollback.sql
002_add_reputation_log.sql
002_add_reputation_log_rollback.sql
003_add_broadcasting_tables.sql
003_add_broadcasting_tables_rollback.sql
```

### Version Numbering

- **001-099**: Initial setup and core tables
- **100-199**: Feature additions
- **200-299**: Performance optimizations
- **300-399**: Data migrations
- **400+**: Major refactors

### Migration Guidelines

1. **Always create rollback**: Every migration needs a rollback file
2. **Use transactions**: Wrap changes in START TRANSACTION/COMMIT
3. **Backup first**: Always backup before applying migrations
4. **Test rollback**: Test the rollback before deploying
5. **Idempotent**: Use IF NOT EXISTS, IF EXISTS clauses
6. **Small changes**: One logical change per migration
7. **Never edit applied migrations**: Create new migration instead

### Safety Checks

```sql
-- Template with safety checks
START TRANSACTION;

-- Check table doesn't exist
SELECT COUNT(*) INTO @table_exists
FROM information_schema.tables
WHERE table_schema = 'radio_station'
  AND table_name = 'new_table';

-- Conditional creation
SET @create_sql = IF(@table_exists = 0,
  'CREATE TABLE new_table (...)',
  'SELECT "Table already exists" as message'
);

PREPARE stmt FROM @create_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;
```

## Complex Migrations

### Data Migration Example

```sql
-- Migration: 010_migrate_queue_priorities
-- Database: radio_station

START TRANSACTION;

-- Add new column
ALTER TABLE radio_station.radio_queue
ADD COLUMN new_priority_score DECIMAL(10,2) DEFAULT 0;

-- Migrate data
UPDATE radio_station.radio_queue rq
JOIN radio_station.radio_users ru ON rq.user_id = ru.user_id
SET rq.new_priority_score =
  100 +
  (ru.reputation_score * 0.5) +
  (ru.upvotes_received * 10) +
  (IF(ru.is_premium, 50, 0));

-- Verify migration
SELECT
  COUNT(*) as total_rows,
  COUNT(CASE WHEN new_priority_score > 0 THEN 1 END) as migrated_rows,
  MIN(new_priority_score) as min_priority,
  MAX(new_priority_score) as max_priority
FROM radio_station.radio_queue;

-- If verification passes, swap columns
ALTER TABLE radio_station.radio_queue
DROP COLUMN priority_score,
CHANGE COLUMN new_priority_score priority_score DECIMAL(10,2) NOT NULL DEFAULT 100;

COMMIT;
```

### JSON Schema Migration

```sql
-- Migration: 015_add_favorite_genres
-- Database: radio_station

START TRANSACTION;

-- Add favorite_genres JSON column to users
ALTER TABLE radio_users
ADD COLUMN favorite_genres JSON DEFAULT NULL;

-- Initialize with empty arrays for existing users
UPDATE radio_users
SET favorite_genres = JSON_ARRAY()
WHERE favorite_genres IS NULL;

-- Verify JSON validity
SELECT COUNT(*) as invalid_json
FROM radio_users
WHERE JSON_VALID(favorite_genres) = 0;

COMMIT;
```

## Troubleshooting

### Migration Failed Mid-Transaction

```sql
-- Check for incomplete transactions
SHOW PROCESSLIST;

-- Kill stuck process if needed
KILL <process_id>;

-- Restore from backup
-- mysql -u root -p radio_station < backup.sql
```

### Rollback Not Working

```sql
-- Manually undo changes
-- Review the migration file and reverse each step

-- Example: If migration added column
ALTER TABLE table_name DROP COLUMN column_name;

-- Remove from migration history
DELETE FROM migration_history WHERE version = 'XXX';
```

### Checksum Mismatch

```sql
-- Recalculate checksum
UPDATE migration_history
SET checksum = SHA2('migration_content', 256)
WHERE version = 'XXX';
```

## Utility Queries

### Compare Schemas

```sql
-- Get table structure
SHOW CREATE TABLE radio_station.radio_queue;

-- Compare columns between environments
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'radio_station'
  AND TABLE_NAME = 'radio_queue'
ORDER BY ORDINAL_POSITION;
```

### Generate Rollback from Schema

```sql
-- List all tables (for drop statements)
SELECT CONCAT('DROP TABLE IF EXISTS ', TABLE_NAME, ';')
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'radio_station';

-- List all columns (for drop column statements)
SELECT CONCAT('ALTER TABLE ', TABLE_NAME, ' DROP COLUMN ', COLUMN_NAME, ';')
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'radio_station'
  AND TABLE_NAME = 'your_table';
```

## Integration with Version Control

### Git Workflow

```bash
# Create feature branch for migration
git checkout -b migration/add-broadcasting-tables

# Create migration files
# ... create 003_add_broadcasting_tables.sql and rollback

# Commit migration files
git add migrations/radio_station/003_*
git commit -m "feat: add broadcasting tables migration"

# Push and create PR
git push origin migration/add-broadcasting-tables
```

### Migration Checklist

Before merging migration PR:
- [ ] Migration file created
- [ ] Rollback file created
- [ ] Tested on development database
- [ ] Rollback tested
- [ ] Backup created
- [ ] Schema documentation updated
- [ ] Team notified

## When to Use This Skill

- Creating new database tables or columns
- Modifying existing schema
- Data migrations and transformations
- Rolling back schema changes
- Checking migration status
- Creating database backups before changes
- Generating rollback scripts
- Managing database versions across environments
