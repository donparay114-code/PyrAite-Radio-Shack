-- PYrte Radio Shack - Database Schema
-- This script runs automatically when PostgreSQL container starts

-- ===========================================
-- Users Table
-- ===========================================
CREATE TABLE IF NOT EXISTS radio_users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    reputation INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    total_plays INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    daily_request_count INTEGER DEFAULT 0,
    daily_request_limit INTEGER DEFAULT 5,
    last_request_date DATE,
    violation_count INTEGER DEFAULT 0,
    timeout_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_radio_users_telegram_id ON radio_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_radio_users_reputation ON radio_users(reputation DESC);

-- ===========================================
-- Song Requests Queue
-- ===========================================
CREATE TABLE IF NOT EXISTS radio_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES radio_users(id),
    original_prompt TEXT NOT NULL,
    sanitized_prompt TEXT,
    genre VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    priority_score DECIMAL(10,2) DEFAULT 0,
    suno_task_id VARCHAR(255),
    audio_url TEXT,
    audio_file_path TEXT,
    title VARCHAR(255),
    duration INTEGER,
    error_message TEXT,
    moderation_status VARCHAR(50),
    moderation_flags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    played_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_radio_queue_status ON radio_queue(status);
CREATE INDEX IF NOT EXISTS idx_radio_queue_user_id ON radio_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_radio_queue_priority ON radio_queue(priority_score DESC);

-- ===========================================
-- Broadcast History
-- ===========================================
CREATE TABLE IF NOT EXISTS radio_history (
    id SERIAL PRIMARY KEY,
    queue_id INTEGER REFERENCES radio_queue(id),
    user_id INTEGER REFERENCES radio_users(id),
    title VARCHAR(255),
    prompt TEXT,
    genre VARCHAR(100),
    duration INTEGER,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    listener_count INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_radio_history_played_at ON radio_history(played_at DESC);

-- ===========================================
-- Banned Words
-- ===========================================
CREATE TABLE IF NOT EXISTS banned_words (
    id SERIAL PRIMARY KEY,
    word VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    severity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- Moderation Logs
-- ===========================================
CREATE TABLE IF NOT EXISTS moderation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES radio_users(id),
    queue_id INTEGER REFERENCES radio_queue(id),
    action VARCHAR(100) NOT NULL,
    reason TEXT,
    moderator_id INTEGER,
    original_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_user_id ON moderation_logs(user_id);

-- ===========================================
-- User Violations
-- ===========================================
CREATE TABLE IF NOT EXISTS user_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES radio_users(id),
    violation_type VARCHAR(100) NOT NULL,
    content TEXT,
    action_taken VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_violations_user_id ON user_violations(user_id);

-- ===========================================
-- Reputation Logs
-- ===========================================
CREATE TABLE IF NOT EXISTS reputation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES radio_users(id),
    change_amount INTEGER NOT NULL,
    reason VARCHAR(255),
    old_reputation INTEGER,
    new_reputation INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- Functions
-- ===========================================

-- Upsert Telegram User
CREATE OR REPLACE FUNCTION upsert_telegram_user(
    p_telegram_id BIGINT,
    p_username VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR
) RETURNS TABLE(
    id INTEGER,
    telegram_id BIGINT,
    username VARCHAR,
    reputation INTEGER,
    is_banned BOOLEAN,
    is_premium BOOLEAN,
    is_admin BOOLEAN,
    daily_request_count INTEGER,
    daily_request_limit INTEGER,
    timeout_until TIMESTAMP
) AS $$
BEGIN
    -- Reset daily count if new day
    UPDATE radio_users
    SET daily_request_count = 0, last_request_date = CURRENT_DATE
    WHERE radio_users.telegram_id = p_telegram_id
      AND (last_request_date IS NULL OR last_request_date < CURRENT_DATE);

    -- Upsert user
    INSERT INTO radio_users (telegram_id, username, first_name, last_name)
    VALUES (p_telegram_id, p_username, p_first_name, p_last_name)
    ON CONFLICT (telegram_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, radio_users.username),
        first_name = COALESCE(EXCLUDED.first_name, radio_users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, radio_users.last_name),
        updated_at = CURRENT_TIMESTAMP;

    -- Return user data
    RETURN QUERY
    SELECT
        u.id,
        u.telegram_id,
        u.username,
        u.reputation,
        u.is_banned,
        u.is_premium,
        u.is_admin,
        u.daily_request_count,
        u.daily_request_limit,
        u.timeout_until
    FROM radio_users u
    WHERE u.telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql;

-- Check Rate Limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id INTEGER)
RETURNS TABLE(
    allowed BOOLEAN,
    remaining INTEGER,
    reset_time TIMESTAMP
) AS $$
DECLARE
    v_user radio_users%ROWTYPE;
BEGIN
    SELECT * INTO v_user FROM radio_users WHERE id = p_user_id;

    -- Admin/premium bypass
    IF v_user.is_admin OR v_user.is_premium THEN
        RETURN QUERY SELECT TRUE, 999, NULL::TIMESTAMP;
        RETURN;
    END IF;

    -- Check timeout
    IF v_user.timeout_until IS NOT NULL AND v_user.timeout_until > CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT FALSE, 0, v_user.timeout_until;
        RETURN;
    END IF;

    -- Check daily limit
    IF v_user.daily_request_count >= v_user.daily_request_limit THEN
        RETURN QUERY SELECT FALSE, 0, (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP;
        RETURN;
    END IF;

    RETURN QUERY SELECT TRUE, v_user.daily_request_limit - v_user.daily_request_count, NULL::TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Calculate Priority Score
CREATE OR REPLACE FUNCTION calculate_priority_score(p_user_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    v_user radio_users%ROWTYPE;
    v_score DECIMAL;
BEGIN
    SELECT * INTO v_user FROM radio_users WHERE id = p_user_id;

    -- Base score from reputation
    v_score := COALESCE(v_user.reputation, 0) * 0.1;

    -- Premium bonus
    IF v_user.is_premium THEN
        v_score := v_score + 50;
    END IF;

    -- Penalize frequent requesters
    v_score := v_score - (COALESCE(v_user.daily_request_count, 0) * 2);

    -- Ensure minimum score
    IF v_score < 0 THEN
        v_score := 0;
    END IF;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Check Banned Words
CREATE OR REPLACE FUNCTION check_banned_words(p_text TEXT)
RETURNS TABLE(
    is_clean BOOLEAN,
    matched_words TEXT[],
    max_severity INTEGER
) AS $$
DECLARE
    v_matches TEXT[];
    v_severity INTEGER := 0;
BEGIN
    SELECT
        ARRAY_AGG(word),
        COALESCE(MAX(severity), 0)
    INTO v_matches, v_severity
    FROM banned_words
    WHERE p_text ILIKE '%' || word || '%';

    RETURN QUERY SELECT
        (v_matches IS NULL OR ARRAY_LENGTH(v_matches, 1) IS NULL),
        COALESCE(v_matches, ARRAY[]::TEXT[]),
        v_severity;
END;
$$ LANGUAGE plpgsql;

-- Handle Violation (3-strike system)
CREATE OR REPLACE FUNCTION handle_violation(
    p_user_id INTEGER,
    p_violation_type VARCHAR,
    p_content TEXT
) RETURNS TABLE(
    action VARCHAR,
    timeout_until TIMESTAMP,
    total_violations INTEGER
) AS $$
DECLARE
    v_count INTEGER;
    v_timeout TIMESTAMP;
    v_action VARCHAR;
BEGIN
    -- Record violation
    INSERT INTO user_violations (user_id, violation_type, content)
    VALUES (p_user_id, p_violation_type, p_content);

    -- Get total violations
    SELECT violation_count + 1 INTO v_count
    FROM radio_users WHERE id = p_user_id;

    -- Determine action based on strike count
    CASE
        WHEN v_count >= 3 THEN
            v_action := 'ban';
            UPDATE radio_users
            SET is_banned = TRUE, ban_reason = 'Too many violations', violation_count = v_count
            WHERE id = p_user_id;
        WHEN v_count = 2 THEN
            v_action := 'timeout_24h';
            v_timeout := CURRENT_TIMESTAMP + INTERVAL '24 hours';
            UPDATE radio_users
            SET timeout_until = v_timeout, violation_count = v_count
            WHERE id = p_user_id;
        ELSE
            v_action := 'warning';
            UPDATE radio_users SET violation_count = v_count WHERE id = p_user_id;
    END CASE;

    RETURN QUERY SELECT v_action, v_timeout, v_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Seed Banned Words
-- ===========================================
INSERT INTO banned_words (word, category, severity) VALUES
    ('kill', 'violence', 2),
    ('murder', 'violence', 3),
    ('suicide', 'violence', 3),
    ('terrorist', 'violence', 3),
    ('bomb', 'violence', 2),
    ('n*gger', 'hate', 3),
    ('f*ggot', 'hate', 3),
    ('nazi', 'hate', 3),
    ('cocaine', 'drugs', 2),
    ('heroin', 'drugs', 2),
    ('meth', 'drugs', 2),
    ('porn', 'adult', 2),
    ('xxx', 'adult', 2),
    ('nude', 'adult', 1),
    ('http://', 'spam', 1),
    ('https://', 'spam', 1),
    ('t.me/', 'spam', 1),
    ('discord.gg', 'spam', 1),
    ('free money', 'spam', 1),
    ('click here', 'spam', 1)
ON CONFLICT (word) DO NOTHING;

-- ===========================================
-- Trigger for updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_radio_users_updated_at
    BEFORE UPDATE ON radio_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_radio_queue_updated_at
    BEFORE UPDATE ON radio_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
