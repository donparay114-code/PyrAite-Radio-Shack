---
name: database-migrations-seeding
description: Manage database schema changes, migrations, and seed data. Use for creating migrations, writing seed scripts, managing schema versions, and handling rollbacks.
---

# Database Migrations and Seeding

## Instructions

1. Use migration tools (Prisma, TypeORM, or custom SQL scripts)
2. Write backward-compatible migrations when possible
3. Test migrations on staging/dev database first
4. Create seed scripts for development data
5. Document schema changes in migration files
6. Handle rollback procedures
7. Version control all migration files

## Best practices

- **One change per migration file** - Makes rollback easier
- **Use transactions** - Ensures atomic operations
- **Test with production-like data** - Catch edge cases
- **Add indexes after data insertion** - Faster for large datasets
- **Document breaking changes** - Help team understand impact
- **Never modify executed migrations** - Create new ones instead

## Migration file naming convention

```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Example: `20231225_add_premium_subscriptions_table.sql`

## For AI Radio Station migrations

**Location:** `C:\Users\Jesse\.gemini\antigravity\radio\migrations\`

**Existing migrations (12 files):**
1. `01_radio_users.sql` - User profiles with reputation
2. `02_song_requests.sql` - Request tracking
3. `03_radio_queue.sql` - Active queue with Suno integration
4. `04_radio_history.sql` - Played songs archive
5. `05_user_reputation_log.sql` - Reputation audit trail
6. `06_moderation_logs.sql` - AI moderation decisions
7. `07_song_upvotes.sql` - User engagement
8. `08_radio_settings.sql` - Global configuration
9. `09_listener_stats.sql` - Analytics
10. `10_chat_messages.sql` - Live chat with GIFs
11. `11_chat_reactions.sql` - Emoji reactions
12. `12_chat_banned_words.sql` - Auto-moderation

**Master script:** `00_run_all_migrations.sql`

## Running migrations

```bash
# Run all migrations
mysql -h localhost -u root -pHunter0hunter2207 radio_station < 00_run_all_migrations.sql

# Run individual migration
mysql -h localhost -u root -pHunter0hunter2207 radio_station < 01_radio_users.sql

# Verify tables created
mysql -h localhost -u root -pHunter0hunter2207 -e "USE radio_station; SHOW TABLES;"
```

## Creating a new migration

```sql
-- migrations/13_add_feature_name.sql
-- Description: Add new feature to radio station

-- Add column to existing table
ALTER TABLE radio_users
ADD COLUMN new_field VARCHAR(255) NULL AFTER existing_field;

-- Create index
CREATE INDEX idx_new_field ON radio_users(new_field);

-- Populate default values
UPDATE radio_users SET new_field = 'default_value' WHERE new_field IS NULL;
```

## Rollback strategy

```sql
-- rollbacks/13_rollback_feature_name.sql
-- Rollback for migration 13

-- Remove index
DROP INDEX idx_new_field ON radio_users;

-- Remove column
ALTER TABLE radio_users DROP COLUMN new_field;
```

## Seed data for development

```sql
-- seeds/dev_users.sql
-- Create test users for development

INSERT INTO radio_users (user_id, username, reputation_score, is_premium, joined_at)
VALUES
  (123456789, 'test_user_1', 150, FALSE, NOW()),
  (987654321, 'test_user_premium', 200, TRUE, NOW()),
  (111222333, 'test_user_banned', 50, FALSE, NOW());

UPDATE radio_users SET is_banned = TRUE WHERE username = 'test_user_banned';
```

## Database backup before migrations

```bash
# Backup before migration
mysqldump -u root -pHunter0hunter2207 radio_station > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
mysql -u root -pHunter0hunter2207 radio_station < backup_20231225_120000.sql
```

## Validation queries

```sql
-- Check table structure
DESCRIBE radio_users;

-- Verify indexes
SHOW INDEX FROM radio_users;

-- Count records
SELECT COUNT(*) FROM radio_users;

-- Check for duplicates
SELECT user_id, COUNT(*) as count
FROM radio_users
GROUP BY user_id
HAVING count > 1;
```
