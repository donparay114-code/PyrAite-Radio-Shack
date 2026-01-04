"""Add PostgreSQL functions for moderation operations.

Revision ID: 003
Revises: 002
Create Date: 2024-12-30

Creates PostgreSQL functions:
- check_rate_limit: Check if user is within daily request limit
- handle_violation: Process a content violation and apply penalties
- reset_daily_limits: Reset daily request counters
- calculate_priority_score: Calculate queue priority based on reputation
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create PostgreSQL functions for moderation."""
    bind = op.get_bind()
    if bind.engine.name == "sqlite":
        # Skip Postgres-specific functions for SQLite
        return

    # Function to check rate limit and increment counter if allowed
    op.execute(
        """
        CREATE OR REPLACE FUNCTION check_rate_limit(p_telegram_user_id BIGINT)
        RETURNS TABLE(
            allowed BOOLEAN,
            requests_used INTEGER,
            requests_limit INTEGER,
            resets_at TIMESTAMP
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_user_id INTEGER;
            v_daily_limit INTEGER;
            v_requests_today INTEGER;
            v_reset_at TIMESTAMP;
            v_is_admin BOOLEAN;
            v_is_banned BOOLEAN;
            v_timeout_until TIMESTAMP;
        BEGIN
            -- Get user info
            SELECT
                u.id, u.daily_request_limit, u.requests_today,
                u.requests_reset_at, u.is_admin, u.is_banned, u.timeout_until
            INTO
                v_user_id, v_daily_limit, v_requests_today,
                v_reset_at, v_is_admin, v_is_banned, v_timeout_until
            FROM users u
            WHERE u.telegram_id = p_telegram_user_id;

            -- User not found
            IF v_user_id IS NULL THEN
                RETURN QUERY SELECT
                    TRUE::BOOLEAN,
                    0::INTEGER,
                    10::INTEGER,
                    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP;
                RETURN;
            END IF;

            -- Check if banned
            IF v_is_banned THEN
                RETURN QUERY SELECT
                    FALSE::BOOLEAN,
                    v_requests_today,
                    v_daily_limit,
                    v_reset_at;
                RETURN;
            END IF;

            -- Check if timed out
            IF v_timeout_until IS NOT NULL AND v_timeout_until > CURRENT_TIMESTAMP THEN
                RETURN QUERY SELECT
                    FALSE::BOOLEAN,
                    v_requests_today,
                    v_daily_limit,
                    v_reset_at;
                RETURN;
            END IF;

            -- Admins have no limit (daily_request_limit = 0 means unlimited)
            IF v_is_admin OR v_daily_limit = 0 THEN
                -- Increment counter for tracking
                UPDATE users
                SET requests_today = requests_today + 1,
                    last_request_at = CURRENT_TIMESTAMP
                WHERE id = v_user_id;

                RETURN QUERY SELECT
                    TRUE::BOOLEAN,
                    v_requests_today + 1,
                    0::INTEGER,
                    NULL::TIMESTAMP;
                RETURN;
            END IF;

            -- Reset counter if new day
            IF v_reset_at IS NULL OR v_reset_at < CURRENT_DATE THEN
                UPDATE users
                SET requests_today = 1,
                    requests_reset_at = CURRENT_DATE + INTERVAL '1 day',
                    last_request_at = CURRENT_TIMESTAMP
                WHERE id = v_user_id;

                RETURN QUERY SELECT
                    TRUE::BOOLEAN,
                    1::INTEGER,
                    v_daily_limit,
                    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP;
                RETURN;
            END IF;

            -- Check if within limit
            IF v_requests_today < v_daily_limit THEN
                UPDATE users
                SET requests_today = requests_today + 1,
                    last_request_at = CURRENT_TIMESTAMP
                WHERE id = v_user_id;

                RETURN QUERY SELECT
                    TRUE::BOOLEAN,
                    v_requests_today + 1,
                    v_daily_limit,
                    v_reset_at;
                RETURN;
            END IF;

            -- Limit reached
            RETURN QUERY SELECT
                FALSE::BOOLEAN,
                v_requests_today,
                v_daily_limit,
                v_reset_at;
        END;
        $$;
    """
    )

    # Function to handle content violations
    op.execute(
        """
        CREATE OR REPLACE FUNCTION handle_violation(
            p_telegram_user_id BIGINT,
            p_violation_type VARCHAR(50) DEFAULT 'blocklist',
            p_triggered_word VARCHAR(255) DEFAULT NULL,
            p_original_content TEXT DEFAULT NULL,
            p_severity VARCHAR(50) DEFAULT 'warning'
        )
        RETURNS TABLE(
            action VARCHAR(50),
            warnings INTEGER,
            timeout_hours INTEGER,
            reputation_penalty INTEGER,
            timeout_until TIMESTAMP
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_user_id INTEGER;
            v_current_warnings INTEGER;
            v_new_warnings INTEGER;
            v_action VARCHAR(50);
            v_timeout_hours INTEGER := 0;
            v_rep_penalty INTEGER := 0;
            v_timeout_ts TIMESTAMP := NULL;
            v_previous_rep FLOAT;
            v_new_rep FLOAT;
        BEGIN
            -- Get user info
            SELECT u.id, u.warnings_count, u.reputation_score
            INTO v_user_id, v_current_warnings, v_previous_rep
            FROM users u
            WHERE u.telegram_id = p_telegram_user_id;

            -- User not found - create them
            IF v_user_id IS NULL THEN
                INSERT INTO users (telegram_id, warnings_count, reputation_score)
                VALUES (p_telegram_user_id, 1, -5.0)
                RETURNING id, warnings_count INTO v_user_id, v_new_warnings;

                v_action := 'warning';
                v_rep_penalty := 5;
                v_previous_rep := 0.0;
                v_new_rep := -5.0;
            ELSE
                v_new_warnings := v_current_warnings + 1;

                -- Determine action based on warning count
                IF v_new_warnings >= 3 THEN
                    v_action := 'timeout';
                    v_timeout_hours := 6;
                    v_rep_penalty := 25;
                    v_timeout_ts := CURRENT_TIMESTAMP + INTERVAL '6 hours';

                    -- Reset warnings after timeout
                    UPDATE users
                    SET warnings_count = 0,
                        moderation_flags = moderation_flags + 1,
                        timeout_until = v_timeout_ts,
                        reputation_score = GREATEST(-100, reputation_score - v_rep_penalty)
                    WHERE id = v_user_id
                    RETURNING reputation_score INTO v_new_rep;
                ELSE
                    v_action := 'warning';
                    v_rep_penalty := 10;

                    UPDATE users
                    SET warnings_count = v_new_warnings,
                        moderation_flags = moderation_flags + 1,
                        reputation_score = GREATEST(-100, reputation_score - v_rep_penalty)
                    WHERE id = v_user_id
                    RETURNING reputation_score INTO v_new_rep;
                END IF;
            END IF;

            -- Log the violation
            INSERT INTO user_violations (
                user_id, telegram_user_id, violation_type, severity,
                triggered_word, original_content, action_taken,
                warning_number, resulted_in_timeout, timeout_until,
                reputation_penalty
            ) VALUES (
                v_user_id, p_telegram_user_id, p_violation_type, p_severity,
                p_triggered_word, p_original_content, v_action,
                v_new_warnings, v_timeout_ts IS NOT NULL, v_timeout_ts,
                v_rep_penalty
            );

            -- Log reputation change
            INSERT INTO reputation_logs (
                user_id, telegram_user_id, change_amount,
                previous_score, new_score, reason, reason_type
            ) VALUES (
                v_user_id, p_telegram_user_id, -v_rep_penalty,
                v_previous_rep, v_new_rep,
                'Content violation: ' || p_violation_type,
                'violation'
            );

            RETURN QUERY SELECT
                v_action,
                v_new_warnings,
                v_timeout_hours,
                v_rep_penalty,
                v_timeout_ts;
        END;
        $$;
    """
    )

    # Function to calculate priority score
    op.execute(
        """
        CREATE OR REPLACE FUNCTION calculate_priority_score(
            p_user_id INTEGER,
            p_base_priority FLOAT DEFAULT 100.0
        )
        RETURNS FLOAT
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_reputation FLOAT;
            v_is_premium BOOLEAN;
            v_priority FLOAT;
        BEGIN
            SELECT reputation_score, is_premium
            INTO v_reputation, v_is_premium
            FROM users
            WHERE id = p_user_id;

            IF v_reputation IS NULL THEN
                v_reputation := 0;
            END IF;

            -- Base priority + reputation bonus (0.5 per point)
            v_priority := p_base_priority + (v_reputation * 0.5);

            -- Premium users get 50% boost
            IF v_is_premium THEN
                v_priority := v_priority * 1.5;
            END IF;

            -- Ensure minimum priority of 1
            RETURN GREATEST(1.0, v_priority);
        END;
        $$;
    """
    )

    # Function to check banned words
    op.execute(
        """
        CREATE OR REPLACE FUNCTION check_banned_words(p_content TEXT)
        RETURNS TABLE(
            found BOOLEAN,
            word VARCHAR(255),
            severity VARCHAR(50),
            category VARCHAR(100)
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
            RETURN QUERY
            SELECT
                TRUE::BOOLEAN,
                bw.word,
                bw.severity,
                bw.category
            FROM banned_words bw
            WHERE bw.is_active = TRUE
              AND (
                  (bw.is_regex = FALSE AND POSITION(LOWER(bw.word) IN LOWER(p_content)) > 0)
                  OR
                  (bw.is_regex = TRUE AND LOWER(p_content) ~ LOWER(bw.word))
              )
            LIMIT 1;

            -- If no rows returned, return not found
            IF NOT FOUND THEN
                RETURN QUERY SELECT
                    FALSE::BOOLEAN,
                    NULL::VARCHAR(255),
                    NULL::VARCHAR(50),
                    NULL::VARCHAR(100);
            END IF;
        END;
        $$;
    """
    )

    # Function to upsert user from Telegram data
    op.execute(
        """
        CREATE OR REPLACE FUNCTION upsert_telegram_user(
            p_telegram_id BIGINT,
            p_username VARCHAR(255) DEFAULT NULL,
            p_first_name VARCHAR(255) DEFAULT NULL,
            p_last_name VARCHAR(255) DEFAULT NULL
        )
        RETURNS TABLE(
            user_id INTEGER,
            reputation_score FLOAT,
            is_banned BOOLEAN,
            is_premium BOOLEAN,
            is_admin BOOLEAN,
            timeout_until TIMESTAMP
        )
        LANGUAGE plpgsql
        AS $$
        DECLARE
            v_user_id INTEGER;
        BEGIN
            -- Try to insert or update user
            INSERT INTO users (
                telegram_id, telegram_username,
                telegram_first_name, telegram_last_name,
                last_active_at
            ) VALUES (
                p_telegram_id, p_username,
                p_first_name, p_last_name,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (telegram_id) DO UPDATE SET
                telegram_username = COALESCE(EXCLUDED.telegram_username, users.telegram_username),
                telegram_first_name = COALESCE(EXCLUDED.telegram_first_name, users.telegram_first_name),
                telegram_last_name = COALESCE(EXCLUDED.telegram_last_name, users.telegram_last_name),
                last_active_at = CURRENT_TIMESTAMP
            RETURNING users.id INTO v_user_id;

            -- Return user info
            RETURN QUERY
            SELECT
                u.id,
                u.reputation_score,
                u.is_banned,
                u.is_premium,
                u.is_admin,
                u.timeout_until
            FROM users u
            WHERE u.id = v_user_id;
        END;
        $$;
    """
    )


def downgrade() -> None:
    """Drop PostgreSQL functions."""
    op.execute(
        "DROP FUNCTION IF EXISTS upsert_telegram_user(BIGINT, VARCHAR, VARCHAR, VARCHAR);"
    )
    op.execute("DROP FUNCTION IF EXISTS check_banned_words(TEXT);")
    op.execute("DROP FUNCTION IF EXISTS calculate_priority_score(INTEGER, FLOAT);")
    op.execute(
        "DROP FUNCTION IF EXISTS handle_violation(BIGINT, VARCHAR, VARCHAR, TEXT, VARCHAR);"
    )
    op.execute("DROP FUNCTION IF EXISTS check_rate_limit(BIGINT);")
