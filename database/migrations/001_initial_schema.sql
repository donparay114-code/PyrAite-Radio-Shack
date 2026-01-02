-- PYrte Radio Shack - Initial Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- USERS AND AUTHENTICATION
-- =============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('telegram', 'whatsapp')),
    platform_user_id VARCHAR(100) NOT NULL,
    username VARCHAR(50),
    display_name VARCHAR(100),
    reputation_score INTEGER DEFAULT 100 CHECK (reputation_score >= 0),
    is_premium BOOLEAN DEFAULT FALSE,
    subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    subscription_expires_at TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    successful_plays INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, platform_user_id)
);

CREATE INDEX idx_users_premium_active ON users(is_premium, subscription_expires_at)
    WHERE is_premium = TRUE;
CREATE INDEX idx_users_platform ON users(platform, platform_user_id);

-- =============================================================================
-- RADIO CHANNELS
-- =============================================================================

CREATE TABLE radio_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('public', 'private')),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    genre VARCHAR(50),
    description TEXT,

    -- Streaming configuration
    icecast_mount VARCHAR(100) NOT NULL UNIQUE,
    hls_path VARCHAR(200) NOT NULL,
    stream_url TEXT,

    -- Private channel settings
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    max_queue_size INTEGER DEFAULT 50,

    -- AI Moderation settings
    ai_moderation_enabled BOOLEAN DEFAULT TRUE,
    moderation_strictness VARCHAR(20) DEFAULT 'medium'
        CHECK (moderation_strictness IN ('low', 'medium', 'high')),
    allow_explicit_lyrics BOOLEAN DEFAULT FALSE,
    custom_moderation_prompt TEXT,

    -- Metadata
    listener_count INTEGER DEFAULT 0,
    total_plays INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_public_channels ON radio_channels(channel_type, is_active)
    WHERE channel_type = 'public';
CREATE INDEX idx_owner_channels ON radio_channels(owner_user_id, is_active);
CREATE INDEX idx_channels_slug ON radio_channels(slug);

-- =============================================================================
-- CHANNEL MEMBERSHIPS
-- =============================================================================

CREATE TABLE channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    can_submit BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(channel_id, user_id)
);

CREATE INDEX idx_channel_access ON channel_members(channel_id, user_id, can_submit);
CREATE INDEX idx_user_memberships ON channel_members(user_id, role);

-- =============================================================================
-- SONG REQUESTS AND QUEUE
-- =============================================================================

CREATE TABLE song_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Request details
    prompt TEXT NOT NULL,
    detected_genre VARCHAR(50),
    custom_title VARCHAR(200),
    custom_style_tags TEXT,

    -- Suno integration
    suno_task_id VARCHAR(100),
    suno_clip_id VARCHAR(100),
    audio_url TEXT,
    duration_seconds INTEGER,
    generation_status VARCHAR(20) DEFAULT 'pending'
        CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),

    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'pending'
        CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'bypassed')),
    moderation_reason TEXT,
    moderation_score JSONB,
    moderation_bypassed BOOLEAN DEFAULT FALSE,
    bypassed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Queue management
    queue_status VARCHAR(20) DEFAULT 'queued'
        CHECK (queue_status IN ('queued', 'playing', 'played', 'skipped')),
    base_priority INTEGER DEFAULT 100,
    calculated_priority INTEGER,

    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    moderated_at TIMESTAMP,
    queued_at TIMESTAMP,
    played_at TIMESTAMP
);

CREATE INDEX idx_channel_queue ON song_requests(channel_id, queue_status, calculated_priority DESC)
    WHERE queue_status = 'queued';
CREATE INDEX idx_user_requests ON song_requests(user_id, requested_at DESC);
CREATE INDEX idx_suno_tasks ON song_requests(suno_task_id)
    WHERE generation_status = 'generating';
CREATE INDEX idx_moderation_pending ON song_requests(channel_id, moderation_status)
    WHERE moderation_status = 'pending';
CREATE INDEX idx_queue_status ON song_requests(queue_status, played_at DESC);

-- =============================================================================
-- RATE LIMITING
-- =============================================================================

CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
    window_start TIMESTAMP NOT NULL,
    request_count INTEGER DEFAULT 1,
    daily_limit INTEGER NOT NULL,

    UNIQUE(user_id, channel_id, window_start)
);

CREATE INDEX idx_rate_limits_window ON rate_limits(user_id, channel_id, window_start);

-- =============================================================================
-- CONTENT MODERATION
-- =============================================================================

CREATE TABLE blocked_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES radio_channels(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_regex BOOLEAN DEFAULT FALSE,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_channel_blocks ON blocked_content(channel_id, severity);
CREATE INDEX idx_global_blocks ON blocked_content(channel_id) WHERE channel_id IS NULL;

-- =============================================================================
-- USER VIOLATIONS
-- =============================================================================

CREATE TABLE user_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES radio_channels(id) ON DELETE SET NULL,
    violation_type VARCHAR(50) NOT NULL,
    details TEXT,
    timeout_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_violations ON user_violations(user_id, created_at DESC);
CREATE INDEX idx_active_timeouts ON user_violations(user_id, timeout_until)
    WHERE timeout_until > CURRENT_TIMESTAMP;

-- =============================================================================
-- MODERATION AUDIT LOG
-- =============================================================================

CREATE TABLE moderation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES song_requests(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL
        CHECK (action IN ('bypass_approval', 'force_reject', 'settings_change')),
    reason TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_request ON moderation_audit_log(request_id, created_at DESC);
CREATE INDEX idx_audit_moderator ON moderation_audit_log(moderator_id, created_at DESC);

-- =============================================================================
-- CHANNEL MODERATION HISTORY
-- =============================================================================

CREATE TABLE channel_moderation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    setting_name VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_channel_mod_history ON channel_moderation_history(channel_id, created_at DESC);

-- =============================================================================
-- NOW PLAYING
-- =============================================================================

CREATE TABLE now_playing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES radio_channels(id) ON DELETE CASCADE,
    song_request_id UUID REFERENCES song_requests(id) ON DELETE SET NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP,
    listener_count INTEGER DEFAULT 0,

    UNIQUE(channel_id)
);

CREATE INDEX idx_now_playing_channel ON now_playing(channel_id);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update user reputation on successful play
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.queue_status = 'played' AND OLD.queue_status != 'played' THEN
        UPDATE users
        SET reputation_score = LEAST(reputation_score + 5, 1000),
            successful_plays = successful_plays + 1
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_reputation
AFTER UPDATE ON song_requests
FOR EACH ROW
EXECUTE FUNCTION update_user_reputation();

-- Function to update channel total plays
CREATE OR REPLACE FUNCTION update_channel_plays()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.queue_status = 'played' AND OLD.queue_status != 'played' THEN
        UPDATE radio_channels
        SET total_plays = total_plays + 1
        WHERE id = NEW.channel_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_channel_plays
AFTER UPDATE ON song_requests
FOR EACH ROW
EXECUTE FUNCTION update_channel_plays();

-- Function to update user last_active
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET last_active = CURRENT_TIMESTAMP,
        total_requests = total_requests + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_last_active
AFTER INSERT ON song_requests
FOR EACH ROW
EXECUTE FUNCTION update_user_last_active();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for queue with user details
CREATE OR REPLACE VIEW queue_with_details AS
SELECT
    sr.id,
    sr.channel_id,
    sr.prompt,
    sr.custom_title,
    sr.audio_url,
    sr.duration_seconds,
    sr.queue_status,
    sr.calculated_priority,
    sr.requested_at,
    u.username,
    u.display_name,
    u.reputation_score,
    u.is_premium,
    rc.name AS channel_name,
    rc.genre AS channel_genre
FROM song_requests sr
JOIN users u ON sr.user_id = u.id
JOIN radio_channels rc ON sr.channel_id = rc.id;

-- View for active channels
CREATE OR REPLACE VIEW active_channels AS
SELECT
    rc.*,
    COUNT(DISTINCT cm.user_id) AS member_count,
    COUNT(DISTINCT sr.id) FILTER (WHERE sr.queue_status = 'queued') AS queued_tracks
FROM radio_channels rc
LEFT JOIN channel_members cm ON rc.id = cm.channel_id
LEFT JOIN song_requests sr ON rc.id = sr.channel_id
WHERE rc.is_active = TRUE
GROUP BY rc.id;

-- =============================================================================
-- SEED DATA FOR PUBLIC CHANNELS
-- =============================================================================

INSERT INTO radio_channels (channel_type, name, slug, genre, icecast_mount, hls_path, description) VALUES
    ('public', 'Rap Radio', 'rap', 'Rap', '/rap.mp3', '/hls/rap/', 'AI-generated rap and hip-hop tracks'),
    ('public', 'Jazz Lounge', 'jazz', 'Jazz', '/jazz.mp3', '/hls/jazz/', 'Smooth jazz and improvisational sounds'),
    ('public', 'Lo-Fi Beats', 'lofi', 'Lo-Fi', '/lofi.mp3', '/hls/lofi/', 'Chill lo-fi beats to study and relax'),
    ('public', 'Electronic Dreams', 'electronic', 'Electronic', '/electronic.mp3', '/hls/electronic/', 'Electronic, EDM, and synth music'),
    ('public', 'Rock Station', 'rock', 'Rock', '/rock.mp3', '/hls/rock/', 'Classic and modern rock tracks'),
    ('public', 'Classical Concert', 'classical', 'Classical', '/classical.mp3', '/hls/classical/', 'Orchestral and classical compositions'),
    ('public', 'Indie Vibes', 'indie', 'Indie', '/indie.mp3', '/hls/indie/', 'Independent and alternative music'),
    ('public', 'Pop Hits', 'pop', 'Pop', '/pop.mp3', '/hls/pop/', 'Popular and chart-topping tracks'),
    ('public', 'Country Roads', 'country', 'Country', '/country.mp3', '/hls/country/', 'Country and folk music'),
    ('public', 'R&B Soul', 'rnb', 'R&B', '/rnb.mp3', '/hls/rnb/', 'Rhythm and blues, soul music');

-- Grant permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO radio_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO radio_user;
