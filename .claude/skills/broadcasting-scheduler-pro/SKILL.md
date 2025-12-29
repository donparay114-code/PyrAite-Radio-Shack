---
name: broadcasting-scheduler-pro
description: Advanced broadcast scheduling with multi-timezone support, event-based programming, seasonal adjustments, live request windows, and automatic fallback content. Use when planning broadcast schedules, managing themed events, or optimizing for global audiences.
---

# Broadcasting Scheduler Pro

Sophisticated broadcast scheduling for 24/7 radio automation with global reach and dynamic programming.

## Instructions

When creating broadcast schedules:

1. **Multi-Timezone Programming**
   - Identify listener timezone distribution
   - Create time-zone aware playlists
   - Schedule prime-time content for major regions
   - Rotate featured content across time zones
   - Balance local vs global programming

2. **Event-Based Scheduling**
   - Special programming for holidays (Christmas, New Year, etc.)
   - Themed nights (80s Night, EDM Friday, Classical Sunday)
   - Live request windows (listener choice hours)
   - Artist spotlights and genre deep-dives
   - Community events and celebrations

3. **Seasonal Programming Adjustments**
   - Summer vibes (upbeat, energetic, outdoor themes)
   - Winter moods (cozy, mellow, introspective)
   - Holiday seasons (festive, celebratory)
   - Back-to-school energy transitions
   - Weather-responsive programming

4. **Live vs Curated Balance**
   - Peak hours: Live user requests (6pm-10pm local)
   - Off-peak: Curated playlists (2am-6am)
   - Weekend flexibility: More live requests
   - Weekday structure: More scheduled programming
   - Emergency override for special broadcasts

5. **Fallback Content Management**
   - Automatically fill gaps during low-request periods
   - Pre-curated "safety playlists" by genre
   - Prevent dead air with buffer content
   - Seamless transition between modes
   - Quality-controlled fallback pool

## Timezone Management Schema

### Listener Timezone Distribution
```sql
CREATE TABLE listener_timezones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  telegram_id BIGINT,
  timezone VARCHAR(50),  -- e.g., 'America/New_York', 'Europe/London'
  utc_offset INT,  -- Hours from UTC
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME,

  FOREIGN KEY (telegram_id) REFERENCES radio_users(telegram_id),
  INDEX idx_timezone (timezone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Broadcast Schedule Templates
```sql
CREATE TABLE broadcast_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  schedule_name VARCHAR(100),
  schedule_type ENUM('daily', 'weekly', 'event', 'seasonal', 'holiday'),

  -- Time specification
  day_of_week INT,  -- 1=Monday, 7=Sunday, NULL=any day
  start_time TIME,
  end_time TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',

  -- Content rules
  programming_mode ENUM('live_requests', 'curated_playlist', 'hybrid', 'special_event'),
  genre_filter JSON,  -- Array of allowed genres, NULL=all
  energy_target INT,  -- 0-100 scale
  theme VARCHAR(255),

  -- Playlist settings
  playlist_id INT,  -- Reference to pre-built playlist
  min_songs INT DEFAULT 10,
  fallback_enabled BOOLEAN DEFAULT TRUE,

  -- Scheduling
  active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,  -- Higher priority overrides conflicts
  start_date DATE,
  end_date DATE,

  INDEX idx_active (active),
  INDEX idx_dow (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Event Calendar
```sql
CREATE TABLE broadcast_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_name VARCHAR(255),
  event_type ENUM('holiday', 'themed_night', 'artist_spotlight', 'genre_marathon', 'community', 'special'),

  -- Timing
  event_date DATE,
  start_time TIME,
  duration_hours INT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(100),  -- e.g., 'monthly:first_friday', 'yearly:12-25'

  -- Programming
  schedule_id INT,
  description TEXT,
  promotional_message TEXT,

  active BOOLEAN DEFAULT TRUE,

  FOREIGN KEY (schedule_id) REFERENCES broadcast_schedules(id),
  INDEX idx_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Smart Scheduling Queries

### Get Current Active Schedule
```sql
-- Determine what schedule is active right now
DELIMITER //
CREATE FUNCTION get_active_schedule()
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE active_schedule_id INT;

  -- Get highest priority active schedule for current time
  SELECT id INTO active_schedule_id
  FROM broadcast_schedules
  WHERE active = TRUE
    AND (start_date IS NULL OR start_date <= CURDATE())
    AND (end_date IS NULL OR end_date >= CURDATE())
    AND (day_of_week IS NULL OR day_of_week = DAYOFWEEK(NOW()))
    AND CURTIME() BETWEEN start_time AND end_time
  ORDER BY priority DESC
  LIMIT 1;

  RETURN active_schedule_id;
END//
DELIMITER ;
```

### Timezone-Aware Prime Time Detection
```sql
-- Identify if it's prime time in any major listener timezone
CREATE OR REPLACE VIEW global_prime_time_status AS
SELECT
  lt.timezone,
  COUNT(DISTINCT lt.telegram_id) as listener_count,
  CONVERT_TZ(NOW(), 'UTC', lt.timezone) as local_time,
  HOUR(CONVERT_TZ(NOW(), 'UTC', lt.timezone)) as local_hour,
  CASE
    WHEN HOUR(CONVERT_TZ(NOW(), 'UTC', lt.timezone)) BETWEEN 18 AND 22 THEN TRUE
    ELSE FALSE
  END as is_prime_time
FROM listener_timezones lt
WHERE lt.last_active >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY lt.timezone
HAVING listener_count >= 5  -- Minimum threshold
ORDER BY listener_count DESC;

-- Check if we should use prime-time programming
SELECT
  COUNT(*) as prime_time_zones,
  SUM(listener_count) as prime_time_listeners,
  SUM(listener_count) / (SELECT COUNT(*) FROM radio_users WHERE last_active >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as prime_time_percentage
FROM global_prime_time_status
WHERE is_prime_time = TRUE;
```

## Event-Based Programming

### Holiday Detection and Scheduling
```sql
-- Stored procedure to check for upcoming events
DELIMITER //
CREATE PROCEDURE get_upcoming_events(
  IN days_ahead INT
)
BEGIN
  SELECT
    be.event_name,
    be.event_type,
    be.event_date,
    be.start_time,
    be.duration_hours,
    bs.programming_mode,
    bs.theme,
    DATEDIFF(be.event_date, CURDATE()) as days_until
  FROM broadcast_events be
  JOIN broadcast_schedules bs ON be.schedule_id = bs.id
  WHERE be.active = TRUE
    AND be.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL days_ahead DAY)
  ORDER BY be.event_date, be.start_time;
END//
DELIMITER ;

-- Example usage
CALL get_upcoming_events(7);  -- Next week's events
```

### Themed Night Generator
```sql
-- Insert recurring themed nights
INSERT INTO broadcast_events (event_name, event_type, event_date, start_time, duration_hours, recurring, recurrence_pattern) VALUES
('80s Nostalgia Night', 'themed_night', '2025-01-17', '20:00:00', 4, TRUE, 'weekly:friday'),
('Classical Sunday Morning', 'themed_night', '2025-01-19', '09:00:00', 3, TRUE, 'weekly:sunday'),
('EDM Power Hour', 'themed_night', '2025-01-18', '21:00:00', 1, TRUE, 'weekly:saturday'),
('Lo-Fi Study Session', 'themed_night', '2025-01-20', '14:00:00', 4, TRUE, 'daily'),
('Metal Monday Meltdown', 'themed_night', '2025-01-20', '19:00:00', 2, TRUE, 'weekly:monday');
```

## Seasonal Programming

### Season Detection
```sql
-- Function to determine current season (Northern Hemisphere)
DELIMITER //
CREATE FUNCTION get_current_season()
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
  DECLARE current_month INT;
  DECLARE current_day INT;
  DECLARE season VARCHAR(20);

  SET current_month = MONTH(NOW());
  SET current_day = DAY(NOW());

  -- Simplified seasonal boundaries
  IF (current_month = 12 AND current_day >= 21) OR current_month IN (1, 2) OR (current_month = 3 AND current_day < 20) THEN
    SET season = 'winter';
  ELSEIF (current_month = 3 AND current_day >= 20) OR current_month IN (4, 5) OR (current_month = 6 AND current_day < 21) THEN
    SET season = 'spring';
  ELSEIF (current_month = 6 AND current_day >= 21) OR current_month IN (7, 8) OR (current_month = 9 AND current_day < 22) THEN
    SET season = 'summer';
  ELSE
    SET season = 'fall';
  END IF;

  RETURN season;
END//
DELIMITER ;
```

### Seasonal Playlist Adjustments
```sql
-- Adjust energy and genre mix by season
CREATE TABLE seasonal_programming_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  season ENUM('spring', 'summer', 'fall', 'winter'),
  time_slot VARCHAR(50),  -- 'morning', 'afternoon', 'evening', 'night'

  -- Genre preferences (percentage weights)
  genre_weights JSON,  -- {"EDM": 30, "Pop": 25, "Rock": 20, ...}

  -- Energy adjustments
  energy_modifier INT,  -- -10 to +10 adjustment to base energy
  tempo_preference VARCHAR(50),  -- 'faster', 'moderate', 'slower'

  -- Mood keywords
  preferred_moods JSON,  -- ["uplifting", "energetic", "warm"]

  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example seasonal rules
INSERT INTO seasonal_programming_rules (season, time_slot, genre_weights, energy_modifier, tempo_preference, preferred_moods, description) VALUES
('summer', 'morning', '{"Pop": 30, "Reggae": 20, "Tropical": 20, "Dance": 15, "Indie": 15}', 10, 'faster', '["uplifting", "sunny", "carefree"]', 'Summer morning energy'),
('winter', 'evening', '{"Classical": 25, "Jazz": 20, "Lo-Fi": 20, "Acoustic": 20, "Indie": 15}', -5, 'slower', '["cozy", "warm", "introspective"]', 'Winter evening wind-down'),
('spring', 'afternoon', '{"Pop": 25, "Indie": 25, "Rock": 20, "Electronic": 15, "Folk": 15}', 5, 'moderate', '["fresh", "optimistic", "renewing"]', 'Spring renewal energy');
```

## Live Request Windows

### Dynamic Request Mode Switching
```sql
-- Schedule showing when to accept live requests vs use curated content
CREATE OR REPLACE VIEW current_request_mode AS
SELECT
  bs.schedule_name,
  bs.programming_mode,
  bs.theme,
  CASE
    WHEN bs.programming_mode = 'live_requests' THEN TRUE
    WHEN bs.programming_mode = 'hybrid' AND (
      -- Hybrid mode: Live during peak hours
      SELECT COUNT(*) FROM global_prime_time_status WHERE is_prime_time = TRUE
    ) >= 1 THEN TRUE
    ELSE FALSE
  END as accept_live_requests,
  CASE
    WHEN bs.fallback_enabled = TRUE AND (
      SELECT COUNT(*) FROM radio_queue WHERE status = 'pending'
    ) < 5 THEN TRUE
    ELSE FALSE
  END as use_fallback
FROM broadcast_schedules bs
WHERE bs.id = get_active_schedule();
```

### Request Window Notifications
```sql
-- Notify users when live request windows open
CREATE EVENT notify_request_window_opening
ON SCHEDULE EVERY 30 MINUTE
DO
BEGIN
  DECLARE next_window_start TIME;
  DECLARE next_window_theme VARCHAR(255);

  -- Find next live request window
  SELECT start_time, theme INTO next_window_start, next_window_theme
  FROM broadcast_schedules
  WHERE programming_mode IN ('live_requests', 'hybrid')
    AND active = TRUE
    AND start_time > CURTIME()
    AND (day_of_week IS NULL OR day_of_week = DAYOFWEEK(NOW()))
  ORDER BY start_time ASC
  LIMIT 1;

  -- If window opens in next 30 minutes, could trigger notification
  -- (Actual notification would be handled by n8n workflow)
  IF next_window_start IS NOT NULL AND
     TIMEDIFF(next_window_start, CURTIME()) <= '00:30:00' THEN

    INSERT INTO notification_queue (message, scheduled_for)
    VALUES (
      CONCAT('🎵 Live request window opening soon! Theme: ', COALESCE(next_window_theme, 'Open requests')),
      CONCAT(CURDATE(), ' ', next_window_start)
    );
  END IF;
END;
```

## Fallback Content Management

### Curated Fallback Playlists
```sql
CREATE TABLE fallback_playlists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  playlist_name VARCHAR(100),
  genre VARCHAR(50),
  time_slot ENUM('morning', 'afternoon', 'evening', 'night', 'any'),
  energy_level INT,  -- 0-100

  -- Playlist composition
  song_ids JSON,  -- Array of song IDs from radio_history
  min_upvotes INT DEFAULT 5,  -- Only include quality songs
  auto_refresh BOOLEAN DEFAULT TRUE,

  -- Usage tracking
  times_used INT DEFAULT 0,
  last_used DATETIME,

  active BOOLEAN DEFAULT TRUE,

  INDEX idx_genre (genre),
  INDEX idx_time_slot (time_slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Auto-Generate Fallback Content
```sql
-- Stored procedure to build fallback playlists from top-rated content
DELIMITER //
CREATE PROCEDURE refresh_fallback_playlist(
  IN p_genre VARCHAR(50),
  IN p_time_slot VARCHAR(20),
  IN p_playlist_size INT
)
BEGIN
  DECLARE song_list JSON;

  -- Select top-rated songs matching criteria
  SELECT JSON_ARRAYAGG(id) INTO song_list
  FROM (
    SELECT rh.id
    FROM radio_history rh
    WHERE rh.status = 'completed'
      AND rh.genre = p_genre
      AND rh.upvotes >= 5
      -- Match energy to time slot
      AND CASE p_time_slot
        WHEN 'morning' THEN CAST(rh.metadata->>'$.energy' AS UNSIGNED) BETWEEN 60 AND 80
        WHEN 'afternoon' THEN CAST(rh.metadata->>'$.energy' AS UNSIGNED) BETWEEN 70 AND 90
        WHEN 'evening' THEN CAST(rh.metadata->>'$.energy' AS UNSIGNED) BETWEEN 50 AND 70
        WHEN 'night' THEN CAST(rh.metadata->>'$.energy' AS UNSIGNED) BETWEEN 30 AND 60
        ELSE TRUE
      END
    ORDER BY rh.upvotes DESC, RAND()
    LIMIT p_playlist_size
  ) top_songs;

  -- Update or insert playlist
  INSERT INTO fallback_playlists (playlist_name, genre, time_slot, song_ids, min_upvotes)
  VALUES (
    CONCAT(p_genre, ' - ', p_time_slot, ' Fallback'),
    p_genre,
    p_time_slot,
    song_list,
    5
  )
  ON DUPLICATE KEY UPDATE
    song_ids = song_list,
    last_used = NOW();
END//
DELIMITER ;

-- Refresh all fallback playlists weekly
CREATE EVENT refresh_all_fallbacks
ON SCHEDULE EVERY 1 WEEK
DO
BEGIN
  CALL refresh_fallback_playlist('EDM', 'afternoon', 50);
  CALL refresh_fallback_playlist('Classical', 'morning', 50);
  CALL refresh_fallback_playlist('Lo-Fi', 'night', 50);
  CALL refresh_fallback_playlist('Rock', 'evening', 50);
  -- Add more as needed
END;
```

## Programming Recommendations

### Optimal Schedule Template (24/7)
```sql
-- Insert comprehensive daily schedule
INSERT INTO broadcast_schedules (schedule_name, day_of_week, start_time, end_time, programming_mode, energy_target, theme, priority) VALUES
-- Weekday Schedule
('Weekday Early Morning', NULL, '05:00:00', '08:00:00', 'curated_playlist', 50, 'Gentle wake-up', 1),
('Weekday Morning Drive', NULL, '08:00:00', '10:00:00', 'hybrid', 70, 'Energizing start', 1),
('Weekday Midday', NULL, '10:00:00', '14:00:00', 'curated_playlist', 65, 'Productive vibes', 1),
('Weekday Afternoon', NULL, '14:00:00', '17:00:00', 'hybrid', 60, 'Afternoon groove', 1),
('Weekday Evening Drive', NULL, '17:00:00', '19:00:00', 'live_requests', 75, 'Rush hour energy', 1),
('Weekday Prime Time', NULL, '19:00:00', '23:00:00', 'live_requests', 80, 'Peak listening', 2),
('Weekday Late Night', NULL, '23:00:00', '02:00:00', 'hybrid', 50, 'Wind down', 1),
('Weekday Overnight', NULL, '02:00:00', '05:00:00', 'curated_playlist', 35, 'Ambient overnight', 1),

-- Weekend Overrides (Higher Priority)
('Weekend Morning', 6, '08:00:00', '12:00:00', 'hybrid', 60, 'Lazy weekend vibes', 3),
('Weekend Afternoon Party', 6, '14:00:00', '18:00:00', 'live_requests', 85, 'Weekend energy', 3),
('Weekend Night', 6, '20:00:00', '02:00:00', 'live_requests', 90, 'Party mode', 3);
```

## Examples

### Example 1: Multi-Timezone Prime Time
Current time: 20:00 UTC

Analysis:
- NYC (15:00 EST): Afternoon, not prime time
- London (20:00 GMT): Prime time (8pm)
- Tokyo (05:00 JST): Early morning, not prime time

Decision: Activate European prime-time programming (live requests, higher energy)

### Example 2: Holiday Special Event
Date: December 25, Christmas Day

Programming:
- 00:00-08:00: Peaceful Christmas classical music (curated)
- 08:00-12:00: Uplifting holiday favorites (hybrid mode)
- 12:00-18:00: Family-friendly festive playlist (live requests with genre filter: Holiday, Pop, Classical)
- 18:00-24:00: Community request hour (unrestricted live requests)

### Example 3: Low Request Period Fallback
Time: 03:30 AM, Queue depth: 2 songs

Action:
1. Check active schedule: "Overnight Ambient" mode
2. Queue too shallow for continuous broadcast
3. Activate fallback playlist: "Lo-Fi Night Fallback" (50 songs)
4. Insert top-rated lo-fi tracks to fill 3-hour window
5. Resume live requests when queue replenishes at 6 AM

## Best Practices

- **Test schedules in staging**: Don't disrupt live broadcast with untested changes
- **Overlap schedules slightly**: Prevent gaps during transitions
- **Monitor listener engagement by time slot**: Optimize based on actual data
- **Communicate schedule changes**: Notify listeners of special programming
- **Maintain fallback quality**: Regularly refresh with newest top-rated content
- **Balance structure and flexibility**: Scheduled framework with room for spontaneity
- **Consider cultural events**: Holidays vary by region
- **Track cross-timezone performance**: Which regions engage most when?
- **Automate routine tasks**: Event creation, playlist refresh, notifications
- **Have manual override**: Admins can break schedule for breaking news/special moments

## Integration Points

- **Playlist Optimization Engine**: Generate optimal fallback playlists
- **User Behavior Predictor**: Schedule based on predicted listener patterns
- **Broadcast Analytics**: Measure schedule effectiveness by engagement
- **Queue Optimizer**: Dynamic priority based on scheduled programming mode
