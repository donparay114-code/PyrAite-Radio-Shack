# Radio Station Database Schema Manager

**Purpose**: Manage complete database schema for multi-channel AI radio station including migrations, indexes, stored procedures, and data integrity for radio_channels, song_requests, users, and all related tables.

**When to use**: Database setup, schema migrations, adding new tables/columns, creating indexes, optimizing queries, data integrity validation, backup/restore procedures.

## Complete Database Schema

### Core Tables

#### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('telegram', 'whatsapp')),
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  platform_chat_id VARCHAR(255),
  display_name VARCHAR(255),

  -- Premium & Subscription
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_tier VARCHAR(50) CHECK (subscription_tier IN ('pro', 'enterprise')),
  subscription_started_at TIMESTAMP,
  subscription_expires_at TIMESTAMP,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),

  -- Reputation & Gamification
  reputation_score INT DEFAULT 50 CHECK (reputation_score BETWEEN 0 AND 100),
  total_requests INT DEFAULT 0,
  successful_plays INT DEFAULT 0,
  total_upvotes_received INT DEFAULT 0,

  -- Security
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMP,
  banned_until TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(platform, platform_user_id)
);

CREATE INDEX idx_users_platform_user ON users(platform, platform_user_id);
CREATE INDEX idx_users_premium ON users(is_premium, subscription_expires_at)
  WHERE is_premium = TRUE;
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);
```

#### 2. radio_channels
```sql
CREATE TABLE radio_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type VARCHAR(20) DEFAULT 'public' CHECK (channel_type IN ('public', 'private', 'unlisted')),

  -- Channel Identity
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  genre VARCHAR(50),
  artwork_url TEXT,

  -- Ownership (for private channels)
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_members INT DEFAULT 100,

  -- Streaming Configuration
  icecast_mount VARCHAR(255) UNIQUE,
  hls_path VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,

  -- Moderation Settings
  ai_moderation_enabled BOOLEAN DEFAULT TRUE,
  strictness_level VARCHAR(20) DEFAULT 'medium' CHECK (strictness_level IN ('low', 'medium', 'high')),
  allow_explicit_lyrics BOOLEAN DEFAULT FALSE,
  custom_moderation_rules JSONB,

  -- Statistics
  total_tracks_played INT DEFAULT 0,
  total_listeners_alltime INT DEFAULT 0,
  current_listeners INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_channels_active ON radio_channels(is_active, channel_type);
CREATE INDEX idx_channels_owner ON radio_channels(owner_user_id)
  WHERE channel_type = 'private';
CREATE INDEX idx_channels_slug ON radio_channels(slug);
```

#### 3. channel_members (for private channels)
```sql
CREATE TABLE channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),

  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  UNIQUE(channel_id, user_id)
);

CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
```

#### 4. song_requests
```sql
CREATE TABLE song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Request Details
  prompt TEXT NOT NULL,
  detected_genre VARCHAR(50),
  base_priority INT DEFAULT 5 CHECK (base_priority BETWEEN 1 AND 10),
  calculated_priority DECIMAL(10,2) DEFAULT 0.0,

  -- Generation Status
  generation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed', 'rejected')),
  queue_status VARCHAR(20) DEFAULT 'queued'
    CHECK (queue_status IN ('queued', 'playing', 'played', 'skipped', 'removed')),

  -- Suno API Integration
  suno_task_id VARCHAR(255),
  suno_clip_ids JSONB,
  audio_url TEXT,
  audio_duration_seconds INT,
  audio_metadata JSONB,

  -- Moderation
  moderation_status VARCHAR(20) DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_reason TEXT,
  moderation_layer VARCHAR(50), -- Which layer flagged it
  moderator_override_by UUID REFERENCES users(id),
  moderator_override_reason TEXT,

  -- Engagement
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  skip_count INT DEFAULT 0,

  -- Playback
  played_at TIMESTAMP,
  playback_duration_seconds INT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  generation_started_at TIMESTAMP,
  generation_completed_at TIMESTAMP,
  moderation_completed_at TIMESTAMP
);

CREATE INDEX idx_requests_queue ON song_requests(channel_id, queue_status, calculated_priority DESC)
  WHERE queue_status = 'queued';
CREATE INDEX idx_requests_user ON song_requests(user_id, created_at DESC);
CREATE INDEX idx_requests_status ON song_requests(generation_status, queue_status);
CREATE INDEX idx_requests_played ON song_requests(channel_id, played_at DESC)
  WHERE played_at IS NOT NULL;
```

#### 5. user_violations
```sql
CREATE TABLE user_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES radio_channels(id) ON DELETE SET NULL,

  violation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  flagged_content TEXT,

  -- Timeout Management
  timeout_until TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,

  -- Related Request
  song_request_id UUID REFERENCES song_requests(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_violations_user ON user_violations(user_id, created_at DESC);
CREATE INDEX idx_violations_active ON user_violations(user_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_violations_timeout ON user_violations(user_id, timeout_until)
  WHERE timeout_until > NOW();
```

#### 6. rate_limits
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,

  window_start TIMESTAMP NOT NULL,
  request_count INT DEFAULT 0,
  daily_limit INT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, channel_id, window_start)
);

CREATE INDEX idx_rate_limits_window ON rate_limits(user_id, channel_id, window_start DESC);
```

#### 7. blocked_content
```sql
CREATE TABLE blocked_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  channel_id UUID REFERENCES radio_channels(id) ON DELETE CASCADE,

  is_regex BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(word, channel_id)
);

CREATE INDEX idx_blocked_content_channel ON blocked_content(channel_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_blocked_content_global ON blocked_content(is_active)
  WHERE channel_id IS NULL AND is_active = TRUE;
```

#### 8. now_playing
```sql
CREATE TABLE now_playing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
  song_request_id UUID REFERENCES song_requests(id) ON DELETE SET NULL,

  title VARCHAR(255),
  artist VARCHAR(255),
  audio_url TEXT,
  artwork_url TEXT,

  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,

  UNIQUE(channel_id)
);

CREATE INDEX idx_now_playing_channel ON now_playing(channel_id);
```

#### 9. moderation_audit_log
```sql
CREATE TABLE moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES radio_channels(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(50) NOT NULL,
  details JSONB,
  old_values JSONB,
  new_values JSONB,

  performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_channel ON moderation_audit_log(channel_id, created_at DESC);
CREATE INDEX idx_audit_user ON moderation_audit_log(user_id, created_at DESC);
```

## Critical Stored Procedures

### 1. Calculate Priority
```sql
CREATE OR REPLACE FUNCTION calculate_priority_v2(
  p_base_priority INT,
  p_user_reputation INT,
  p_upvotes INT,
  p_is_premium BOOLEAN,
  p_created_at TIMESTAMP,
  p_request_count_today INT,
  p_total_user_plays INT
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  wait_hours DECIMAL;
  fairness_boost DECIMAL;
  priority DECIMAL;
BEGIN
  wait_hours := EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600;

  fairness_boost := CASE
    WHEN p_total_user_plays < 5 THEN 15.0
    WHEN p_total_user_plays < 20 THEN 8.0
    WHEN p_total_user_plays < 50 THEN 3.0
    ELSE 0.0
  END;

  priority :=
    (p_base_priority * 0.25) +
    (p_user_reputation * 0.20) +
    (p_upvotes * 4.0) +
    (CASE WHEN p_is_premium THEN 18.0 ELSE 0.0 END) +
    (wait_hours * 1.5) +
    (CASE WHEN p_request_count_today <= 3 THEN 10.0 ELSE 0.0 END) +
    fairness_boost;

  RETURN LEAST(priority, 200.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 2. Check Rate Limit
```sql
CREATE OR REPLACE FUNCTION check_rate_limit_safe(
  p_user_id UUID,
  p_channel_id UUID
) RETURNS TABLE(allowed BOOLEAN, current_count INT, limit_value INT) AS $$
DECLARE
  v_current_count INT;
  v_user_limit INT;
BEGIN
  -- Get user's limit based on premium status
  SELECT CASE WHEN is_premium THEN 50 ELSE 10 END
  INTO v_user_limit
  FROM users WHERE id = p_user_id;

  -- Get current usage in this hour
  SELECT COALESCE(request_count, 0)
  INTO v_current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND channel_id = p_channel_id
    AND window_start = DATE_TRUNC('hour', NOW());

  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  -- Return result
  RETURN QUERY SELECT
    v_current_count < v_user_limit AS allowed,
    v_current_count AS current_count,
    v_user_limit AS limit_value;
END;
$$ LANGUAGE plpgsql;
```

### 3. Handle Violation
```sql
CREATE OR REPLACE FUNCTION handle_violation_safe(
  p_user_id UUID,
  p_channel_id UUID,
  p_severity VARCHAR
) RETURNS TABLE(action VARCHAR, strike_count INT, timeout_until TIMESTAMP) AS $$
DECLARE
  v_strike_count INT;
  v_timeout_duration INTERVAL;
  v_timeout_until TIMESTAMP;
BEGIN
  -- Count recent violations (last 7 days)
  SELECT COUNT(*)
  INTO v_strike_count
  FROM user_violations
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '7 days';

  -- Determine timeout based on severity and strike count
  v_timeout_duration := CASE p_severity
    WHEN 'critical' THEN INTERVAL '24 hours'
    WHEN 'high' THEN CASE
      WHEN v_strike_count >= 1 THEN INTERVAL '3 hours'
      ELSE INTERVAL '1 hour'
    END
    WHEN 'medium' THEN CASE
      WHEN v_strike_count >= 2 THEN INTERVAL '1 hour'
      ELSE NULL
    END
    ELSE NULL
  END;

  IF v_timeout_duration IS NOT NULL THEN
    v_timeout_until := NOW() + v_timeout_duration;

    -- Insert violation with timeout
    INSERT INTO user_violations (user_id, channel_id, violation_type, severity, timeout_until)
    VALUES (p_user_id, p_channel_id, 'content_violation', p_severity, v_timeout_until);

    -- Update user reputation
    UPDATE users
    SET reputation_score = GREATEST(0, reputation_score - (CASE p_severity
      WHEN 'critical' THEN 20
      WHEN 'high' THEN 15
      WHEN 'medium' THEN 10
      ELSE 5
    END))
    WHERE id = p_user_id;

    RETURN QUERY SELECT 'timeout'::VARCHAR, v_strike_count + 1, v_timeout_until;
  ELSE
    -- Warning only
    INSERT INTO user_violations (user_id, channel_id, violation_type, severity)
    VALUES (p_user_id, p_channel_id, 'content_violation', p_severity);

    UPDATE users
    SET reputation_score = GREATEST(0, reputation_score - 5)
    WHERE id = p_user_id;

    RETURN QUERY SELECT 'warning'::VARCHAR, v_strike_count + 1, NULL::TIMESTAMP;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4. Update Reputation
```sql
CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  new_reputation INT;
BEGIN
  SELECT GREATEST(0, LEAST(100,
    50 +  -- Base
    (successful_plays * 2) +
    (total_upvotes_received * 3) +
    (CASE WHEN is_premium THEN
      EXTRACT(MONTH FROM AGE(subscription_expires_at, subscription_started_at)) * 5
    ELSE 0 END) +
    (-COALESCE((SELECT COUNT(*) FROM user_violations WHERE user_id = p_user_id), 0) * 10)
  )) INTO new_reputation
  FROM users
  WHERE id = p_user_id;

  UPDATE users SET reputation_score = new_reputation WHERE id = p_user_id;
  RETURN new_reputation;
END;
$$ LANGUAGE plpgsql;
```

## Migrations

### Initial Migration
```sql
-- migrations/001_initial_schema.sql
BEGIN;

-- Create all tables in correct order
-- (users first, then dependent tables)

-- Add triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON radio_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

### Adding Moderation Features
```sql
-- migrations/002_add_moderation_settings.sql
BEGIN;

ALTER TABLE radio_channels
ADD COLUMN ai_moderation_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN strictness_level VARCHAR(20) DEFAULT 'medium'
  CHECK (strictness_level IN ('low', 'medium', 'high')),
ADD COLUMN allow_explicit_lyrics BOOLEAN DEFAULT FALSE,
ADD COLUMN custom_moderation_rules JSONB;

CREATE TABLE IF NOT EXISTS moderation_audit_log (
  -- ... (see above)
);

COMMIT;
```

## Seed Data

### Default Public Channels
```sql
INSERT INTO radio_channels (id, channel_type, name, slug, genre, icecast_mount, hls_path) VALUES
  (gen_random_uuid(), 'public', 'Rap Vibes', 'rap', 'Rap', '/rap.mp3', '/hls/rap/'),
  (gen_random_uuid(), 'public', 'Smooth Jazz', 'jazz', 'Jazz', '/jazz.mp3', '/hls/jazz/'),
  (gen_random_uuid(), 'public', 'Lo-Fi Beats', 'lofi', 'Lo-Fi', '/lofi.mp3', '/hls/lofi/'),
  (gen_random_uuid(), 'public', 'Electronic Waves', 'electronic', 'Electronic', '/electronic.mp3', '/hls/electronic/'),
  (gen_random_uuid(), 'public', 'Rock Classics', 'rock', 'Rock', '/rock.mp3', '/hls/rock/'),
  (gen_random_uuid(), 'public', 'Classical Harmony', 'classical', 'Classical', '/classical.mp3', '/hls/classical/'),
  (gen_random_uuid(), 'public', 'Indie Discoveries', 'indie', 'Indie', '/indie.mp3', '/hls/indie/'),
  (gen_random_uuid(), 'public', 'Pop Hits', 'pop', 'Pop', '/pop.mp3', '/hls/pop/'),
  (gen_random_uuid(), 'public', 'Country Roads', 'country', 'Country', '/country.mp3', '/hls/country/'),
  (gen_random_uuid(), 'public', 'R&B Soul', 'rnb', 'R&B', '/rnb.mp3', '/hls/rnb/');
```

### Blocked Content Seed
```sql
INSERT INTO blocked_content (word, severity, channel_id) VALUES
  -- Critical (hate speech, slurs)
  ('n-word-example', 'critical', NULL),
  ('f-slur-example', 'critical', NULL),
  -- High (explicit violence)
  ('kill yourself', 'high', NULL),
  ('terrorist', 'high', NULL),
  -- Medium (profanity)
  ('fuck', 'medium', NULL),
  ('shit', 'medium', NULL);
  -- Add 200+ more terms
```

## Backup & Restore

```bash
# Backup
pg_dump -h $RDS_HOST -U $RDS_USER -d radio_station -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -h $RDS_HOST -U $RDS_USER -d radio_station_restored backup_20251230.dump

# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier radio-db \
  --target-db-instance-identifier radio-db-recovered \
  --restore-time 2025-12-30T10:00:00Z
```

## Maintenance Queries

```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Find bloated tables
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Rebuild indexes
REINDEX TABLE song_requests;

-- Update statistics
ANALYZE song_requests;
```

## Performance Tuning

```sql
-- Explain query plans
EXPLAIN ANALYZE
SELECT * FROM song_requests
WHERE channel_id = '...' AND queue_status = 'queued'
ORDER BY calculated_priority DESC LIMIT 10;

-- Check slow queries
SELECT calls, total_time, mean_time, query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

Use this skill for all database schema management, migrations, and optimization tasks!
