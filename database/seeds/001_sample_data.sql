-- Sample Data for Development and Testing
-- Only run this in development environment

-- Sample Users
INSERT INTO users (platform, platform_user_id, username, display_name, reputation_score, is_premium, subscription_tier, subscription_expires_at)
VALUES
    ('telegram', '123456789', 'musiclover', 'Music Lover', 150, TRUE, 'pro', NOW() + INTERVAL '30 days'),
    ('telegram', '987654321', 'beatmaker', 'BeatMaker', 200, TRUE, 'pro', NOW() + INTERVAL '60 days'),
    ('whatsapp', '1234567890', 'jazzfan', 'Jazz Fan', 120, FALSE, 'free', NULL),
    ('telegram', '111222333', 'rockstar', 'Rock Star', 180, FALSE, 'free', NULL),
    ('whatsapp', '444555666', 'edmproducer', 'EDM Producer', 250, TRUE, 'enterprise', NOW() + INTERVAL '365 days');

-- Sample Blocked Content (Global)
INSERT INTO blocked_content (channel_id, word, severity, is_regex)
VALUES
    (NULL, 'offensive_word1', 'high', FALSE),
    (NULL, 'offensive_word2', 'critical', FALSE),
    (NULL, 'spam_pattern', 'medium', TRUE);

-- Sample Song Requests for Rap Channel
INSERT INTO song_requests (
    channel_id,
    user_id,
    prompt,
    detected_genre,
    generation_status,
    moderation_status,
    queue_status,
    base_priority,
    calculated_priority
)
SELECT
    rc.id,
    u.id,
    'Create a chill lo-fi beat with piano and rain sounds',
    'Lo-Fi',
    'completed',
    'approved',
    'queued',
    100,
    150
FROM radio_channels rc
CROSS JOIN users u
WHERE rc.slug = 'lofi'
AND u.username = 'musiclover'
LIMIT 1;

INSERT INTO song_requests (
    channel_id,
    user_id,
    prompt,
    detected_genre,
    generation_status,
    moderation_status,
    queue_status,
    base_priority,
    calculated_priority
)
SELECT
    rc.id,
    u.id,
    'Upbeat jazz with saxophone solo and double bass',
    'Jazz',
    'completed',
    'approved',
    'queued',
    100,
    130
FROM radio_channels rc
CROSS JOIN users u
WHERE rc.slug = 'jazz'
AND u.username = 'jazzfan'
LIMIT 1;

INSERT INTO song_requests (
    channel_id,
    user_id,
    prompt,
    detected_genre,
    generation_status,
    moderation_status,
    queue_status,
    base_priority,
    calculated_priority
)
SELECT
    rc.id,
    u.id,
    'Heavy metal with electric guitar riffs and drums',
    'Rock',
    'completed',
    'approved',
    'queued',
    100,
    140
FROM radio_channels rc
CROSS JOIN users u
WHERE rc.slug = 'rock'
AND u.username = 'rockstar'
LIMIT 1;

-- Sample Private Channel
INSERT INTO radio_channels (
    channel_type,
    name,
    slug,
    description,
    icecast_mount,
    hls_path,
    owner_user_id,
    is_active,
    requires_approval,
    max_queue_size,
    ai_moderation_enabled,
    moderation_strictness,
    allow_explicit_lyrics
)
SELECT
    'private',
    'EDM Producers Club',
    'edm-club-' || substring(md5(random()::text), 1, 8),
    'Private channel for EDM producers and enthusiasts',
    '/private-edm-' || substring(md5(random()::text), 1, 8) || '.mp3',
    '/hls/private-edm-' || substring(md5(random()::text), 1, 8) || '/',
    u.id,
    TRUE,
    TRUE,
    30,
    TRUE,
    'high',
    FALSE
FROM users u
WHERE u.username = 'edmproducer'
LIMIT 1;

-- Add channel members to private channel
INSERT INTO channel_members (channel_id, user_id, role, can_submit)
SELECT
    rc.id,
    u.id,
    CASE
        WHEN u.username = 'edmproducer' THEN 'owner'
        WHEN u.username = 'beatmaker' THEN 'moderator'
        ELSE 'member'
    END,
    TRUE
FROM radio_channels rc
CROSS JOIN users u
WHERE rc.channel_type = 'private'
AND u.username IN ('edmproducer', 'beatmaker', 'musiclover')
LIMIT 3;

-- Sample Audit Log Entry
INSERT INTO moderation_audit_log (request_id, moderator_id, action, reason, new_status)
SELECT
    sr.id,
    u.id,
    'bypass_approval',
    'Content reviewed manually - approved',
    'bypassed'
FROM song_requests sr
CROSS JOIN users u
WHERE u.username = 'beatmaker'
LIMIT 1;

COMMIT;
