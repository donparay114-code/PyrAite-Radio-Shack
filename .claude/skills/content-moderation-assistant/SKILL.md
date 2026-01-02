---
name: content-moderation-assistant
description: Detects inappropriate lyrics, copyright-risky content, spam prompts, and brand safety issues. Validates prompts before generation and flags problematic content. Use when moderating user requests, preventing abuse, or maintaining content standards.
---

# Content Moderation Assistant

AI-powered content safety and quality control for user-generated music requests.

## Instructions

When moderating content:

1. **Pre-Generation Prompt Validation**
   - Detect inappropriate language and themes
   - Identify copyright infringement risks (artist names, song titles)
   - Flag spam and nonsense prompts
   - Validate genre-prompt alignment
   - Block malicious or abusive requests

2. **Lyric Content Analysis**
   - Scan for explicit content (profanity, violence, hate speech)
   - Detect sensitive topics (politics, religion, controversial themes)
   - Identify potential legal issues (defamation, threats)
   - Check for brand safety violations
   - Flag content requiring age restrictions

3. **Copyright and IP Protection**
   - Detect requests for specific copyrighted songs
   - Identify artist name copying attempts
   - Flag trademark violations
   - Prevent "soundalike" exploitation
   - Protect against style theft complaints

4. **Spam and Abuse Detection**
   - Identify repetitive prompts from same user
   - Detect automated/bot-generated requests
   - Flag nonsensical or gibberish prompts
   - Catch prompt injection attempts
   - Prevent system gaming through malicious requests

5. **Quality Standards Enforcement**
   - Ensure prompts meet minimum length/detail requirements
   - Validate genre tags are appropriate
   - Check for constructive, generative prompts
   - Flag low-effort or lazy requests
   - Maintain broadcast quality standards

## Moderation Rules Database

### Blocked Terms and Patterns
```sql
CREATE TABLE moderation_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rule_type ENUM(
    'profanity',
    'hate_speech',
    'violence',
    'copyright',
    'spam',
    'sexual_content',
    'political',
    'brand_unsafe'
  ),
  pattern VARCHAR(500),  -- Regex pattern or keyword
  severity ENUM('auto_block', 'flag_review', 'warning'),
  action ENUM('reject', 'quarantine', 'warn_user', 'auto_approve_with_flag'),
  description TEXT,

  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_type (rule_type),
  INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example rules
INSERT INTO moderation_rules (rule_type, pattern, severity, action, description) VALUES
('profanity', '\\b(f[*u]ck|sh[*i]t|b[*i]tch)\\b', 'flag_review', 'quarantine', 'Common profanity'),
('copyright', '\\b(taylor swift|beyonce|drake)\\b', 'auto_block', 'reject', 'Specific artist names'),
('spam', '(.)\\1{10,}', 'auto_block', 'reject', 'Repeated characters (spam pattern)'),
('hate_speech', '\\b(racist|homophobic|slur)\\b', 'auto_block', 'reject', 'Hate speech indicators'),
('sexual_content', '\\b(explicit|nsfw|xxx)\\b', 'flag_review', 'warn_user', 'Sexual content markers');
```

### Moderation Log
```sql
CREATE TABLE moderation_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT,
  telegram_id BIGINT,
  prompt TEXT,
  genre VARCHAR(50),

  -- Moderation results
  flagged BOOLEAN DEFAULT FALSE,
  flag_reasons JSON,  -- Array of matched rules
  severity ENUM('low', 'medium', 'high', 'critical'),
  action_taken ENUM('approved', 'rejected', 'quarantined', 'edited'),

  -- Review
  requires_review BOOLEAN DEFAULT FALSE,
  reviewed_by BIGINT,
  reviewed_at DATETIME,
  review_decision ENUM('approve', 'reject', 'edit'),

  moderated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (request_id) REFERENCES radio_queue(id),
  FOREIGN KEY (telegram_id) REFERENCES radio_users(telegram_id),
  INDEX idx_flagged (flagged),
  INDEX idx_requires_review (requires_review)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Content Analysis Functions

### Prompt Validation Function
```sql
DELIMITER //
CREATE FUNCTION validate_prompt(
  p_prompt TEXT,
  p_genre VARCHAR(50)
)
RETURNS JSON
DETERMINISTIC
BEGIN
  DECLARE result JSON;
  DECLARE flags JSON;
  DECLARE is_safe BOOLEAN DEFAULT TRUE;
  DECLARE severity_level VARCHAR(20) DEFAULT 'low';

  SET flags = JSON_ARRAY();

  -- Check for profanity
  IF p_prompt REGEXP '\\b(f[*u]ck|sh[*i]t|b[*i]tch|damn|hell)\\b' THEN
    SET flags = JSON_ARRAY_APPEND(flags, '$', 'profanity_detected');
    SET is_safe = FALSE;
    SET severity_level = 'medium';
  END IF;

  -- Check for copyright violations (artist names)
  IF p_prompt REGEXP '\\b(taylor swift|beyonce|drake|kanye|rihanna|ed sheeran)\\b' THEN
    SET flags = JSON_ARRAY_APPEND(flags, '$', 'copyright_artist_name');
    SET is_safe = FALSE;
    SET severity_level = 'high';
  END IF;

  -- Check for spam patterns
  IF p_prompt REGEXP '(.)\\1{10,}' OR LENGTH(p_prompt) < 10 THEN
    SET flags = JSON_ARRAY_APPEND(flags, '$', 'spam_pattern');
    SET is_safe = FALSE;
    SET severity_level = 'medium';
  END IF;

  -- Check for hate speech indicators
  IF p_prompt REGEXP '\\b(racist|hate|kill|murder|terrorist)\\b' THEN
    SET flags = JSON_ARRAY_APPEND(flags, '$', 'hate_speech');
    SET is_safe = FALSE;
    SET severity_level = 'critical';
  END IF;

  -- Check for sexual content
  IF p_prompt REGEXP '\\b(sex|porn|xxx|nsfw|explicit)\\b' THEN
    SET flags = JSON_ARRAY_APPEND(flags, '$', 'sexual_content');
    SET is_safe = FALSE;
    SET severity_level = 'high';
  END IF;

  -- Build result JSON
  SET result = JSON_OBJECT(
    'is_safe', is_safe,
    'severity', severity_level,
    'flags', flags,
    'flag_count', JSON_LENGTH(flags)
  );

  RETURN result;
END//
DELIMITER ;
```

### Check Prompt Before Queue Insertion
```sql
-- Stored procedure to validate before adding to queue
DELIMITER //
CREATE PROCEDURE add_request_with_moderation(
  IN p_telegram_id BIGINT,
  IN p_prompt TEXT,
  IN p_genre VARCHAR(50),
  OUT p_request_id INT,
  OUT p_moderation_result VARCHAR(50),
  OUT p_rejection_reason TEXT
)
BEGIN
  DECLARE validation_result JSON;
  DECLARE is_safe BOOLEAN;
  DECLARE flags JSON;
  DECLARE severity VARCHAR(20);

  -- Validate prompt
  SET validation_result = validate_prompt(p_prompt, p_genre);
  SET is_safe = JSON_EXTRACT(validation_result, '$.is_safe');
  SET severity = JSON_UNQUOTE(JSON_EXTRACT(validation_result, '$.severity'));
  SET flags = JSON_EXTRACT(validation_result, '$.flags');

  -- Auto-reject if critical severity
  IF severity = 'critical' OR is_safe = FALSE THEN
    SET p_moderation_result = 'REJECTED';
    SET p_rejection_reason = CONCAT('Content policy violation: ', JSON_UNQUOTE(flags));
    SET p_request_id = NULL;

    -- Log rejection
    INSERT INTO moderation_log (
      telegram_id, prompt, genre, flagged, flag_reasons, severity, action_taken
    ) VALUES (
      p_telegram_id, p_prompt, p_genre, TRUE, flags, severity, 'rejected'
    );

  ELSE
    -- Add to queue
    INSERT INTO radio_queue (telegram_id, prompt, genre, status)
    VALUES (p_telegram_id, p_prompt, p_genre, 'pending');

    SET p_request_id = LAST_INSERT_ID();
    SET p_moderation_result = 'APPROVED';
    SET p_rejection_reason = NULL;

    -- Log approval (with any warnings)
    INSERT INTO moderation_log (
      request_id, telegram_id, prompt, genre, flagged, flag_reasons, severity, action_taken
    ) VALUES (
      p_request_id, p_telegram_id, p_prompt, p_genre, JSON_LENGTH(flags) > 0, flags, severity, 'approved'
    );
  END IF;
END//
DELIMITER ;
```

## Copyright Detection

### Known Artist Database
```sql
CREATE TABLE known_artists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  artist_name VARCHAR(255),
  aliases JSON,  -- Array of alternate names/spellings
  block_level ENUM('strict', 'moderate', 'permissive'),
  reason VARCHAR(500),

  INDEX idx_name (artist_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Populate with top artists
INSERT INTO known_artists (artist_name, aliases, block_level, reason) VALUES
('Taylor Swift', '["t swift", "tay tay", "taylor"]', 'strict', 'Major copyright holder, high risk'),
('Beyoncé', '["beyonce", "queen bey"]', 'strict', 'Major copyright holder'),
('Drake', '["drizzy"]', 'strict', 'Major copyright holder'),
('Ed Sheeran', '["ed sheeran"]', 'moderate', 'Active in copyright enforcement');
```

### Song Title Detection
```sql
-- Check for specific song title references
CREATE TABLE known_song_titles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  song_title VARCHAR(255),
  artist VARCHAR(255),
  release_year INT,
  block_level ENUM('strict', 'moderate', 'permissive'),

  INDEX idx_title (song_title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Function to check for song title copying
DELIMITER //
CREATE FUNCTION contains_song_title(p_prompt TEXT)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
  DECLARE has_match BOOLEAN;

  SELECT EXISTS(
    SELECT 1 FROM known_song_titles
    WHERE LOWER(p_prompt) LIKE CONCAT('%', LOWER(song_title), '%')
      AND block_level IN ('strict', 'moderate')
  ) INTO has_match;

  RETURN has_match;
END//
DELIMITER ;
```

## Spam Detection

### Duplicate Request Detection
```sql
-- Find duplicate prompts from same user
SELECT
  telegram_id,
  prompt,
  COUNT(*) as request_count,
  GROUP_CONCAT(id) as request_ids,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM radio_queue
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY telegram_id, prompt
HAVING request_count >= 3
ORDER BY request_count DESC;
```

### Bot Detection Patterns
```sql
-- Identify potential bot activity
CREATE OR REPLACE VIEW suspicious_request_patterns AS
SELECT
  telegram_id,
  COUNT(*) as requests_last_hour,
  COUNT(DISTINCT prompt) as unique_prompts,
  COUNT(*) / NULLIF(COUNT(DISTINCT prompt), 0) as repetition_ratio,
  CASE
    WHEN COUNT(*) >= 20 AND COUNT(DISTINCT prompt) <= 3 THEN 'Likely Bot'
    WHEN COUNT(*) >= 10 AND AVG(LENGTH(prompt)) < 15 THEN 'Low Quality Spam'
    WHEN COUNT(*) / NULLIF(COUNT(DISTINCT prompt), 0) >= 5 THEN 'Repetitive Spam'
    ELSE 'Normal'
  END as pattern_type
FROM radio_queue
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY telegram_id
HAVING pattern_type != 'Normal';
```

## Quality Standards

### Minimum Prompt Quality Rules
```javascript
const QUALITY_RULES = {
  minLength: 10,  // Characters
  maxLength: 500,
  minWords: 3,
  requiredElements: {
    mood: ['happy', 'sad', 'energetic', 'calm', 'dark', 'uplifting'],
    structure: ['verse', 'chorus', 'bridge', 'intro', 'outro'],
    instruments: ['guitar', 'piano', 'drums', 'synth', 'bass', 'vocal']
  }
};

// Validate prompt quality
function validatePromptQuality(prompt, genre) {
  const issues = [];

  // Length check
  if (prompt.length < QUALITY_RULES.minLength) {
    issues.push('Prompt too short - provide more detail');
  }
  if (prompt.length > QUALITY_RULES.maxLength) {
    issues.push('Prompt too long - be more concise');
  }

  // Word count
  const wordCount = prompt.split(/\s+/).length;
  if (wordCount < QUALITY_RULES.minWords) {
    issues.push('Too few words - describe what you want');
  }

  // Check for constructive elements
  const hasElement = QUALITY_RULES.requiredElements.mood.some(word =>
    prompt.toLowerCase().includes(word)
  );
  if (!hasElement) {
    issues.push('Consider adding mood/feel description');
  }

  return {
    isValid: issues.length === 0,
    issues: issues,
    quality_score: Math.max(0, 100 - (issues.length * 25))
  };
}
```

## Moderation Dashboard Queries

### Flagged Content Report
```sql
-- View all flagged content requiring review
SELECT
  ml.id,
  ml.prompt,
  ml.genre,
  ru.username,
  ml.severity,
  ml.flag_reasons,
  ml.action_taken,
  ml.moderated_at,
  CASE
    WHEN ml.requires_review = TRUE THEN 'NEEDS REVIEW'
    ELSE 'AUTO-HANDLED'
  END as status
FROM moderation_log ml
JOIN radio_users ru ON ml.telegram_id = ru.telegram_id
WHERE ml.flagged = TRUE
  AND ml.moderated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY
  CASE ml.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  ml.moderated_at DESC;
```

### Moderation Statistics
```sql
-- Daily moderation metrics
SELECT
  DATE(moderated_at) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN flagged = TRUE THEN 1 END) as flagged_count,
  COUNT(CASE WHEN action_taken = 'rejected' THEN 1 END) as rejected_count,
  ROUND(COUNT(CASE WHEN flagged = TRUE THEN 1 END) / COUNT(*) * 100, 2) as flag_rate,
  GROUP_CONCAT(DISTINCT JSON_EXTRACT(flag_reasons, '$[0]')) as common_flags
FROM moderation_log
WHERE moderated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(moderated_at)
ORDER BY date DESC;
```

### Repeat Offenders
```sql
-- Identify users with multiple violations
SELECT
  ml.telegram_id,
  ru.username,
  COUNT(*) as total_flags,
  COUNT(CASE WHEN ml.severity = 'critical' THEN 1 END) as critical_flags,
  MAX(ml.moderated_at) as last_violation,
  GROUP_CONCAT(DISTINCT ml.rule_type) as violation_types
FROM moderation_log ml
JOIN radio_users ru ON ml.telegram_id = ru.telegram_id
WHERE ml.flagged = TRUE
  AND ml.moderated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ml.telegram_id
HAVING total_flags >= 3
ORDER BY critical_flags DESC, total_flags DESC;
```

## Examples

### Example 1: Block Copyright Violation
User prompt: "Make me a song that sounds like Taylor Swift's Shake It Off"

Moderation:
- Detect: "Taylor Swift" (artist name) + "Shake It Off" (song title)
- Severity: CRITICAL (copyright infringement)
- Action: AUTO-REJECT
- Message: "Sorry, we cannot create songs that copy specific artists or copyrighted works. Try describing a style instead!"

### Example 2: Flag for Review
User prompt: "Angry song about politics and corruption"

Moderation:
- Detect: "politics" (sensitive topic)
- Severity: MEDIUM
- Action: FLAG_FOR_REVIEW
- Allow generation but quarantine until admin approval

### Example 3: Spam Detection
User submits 15 requests in 5 minutes, all variations of "asdfasdf rock song"

Moderation:
- Detect: Repetitive pattern, nonsense text, high velocity
- Severity: HIGH
- Action: Rate limit user, require CAPTCHA
- Temporary 1-hour cooldown

## Best Practices

- **Start permissive, tighten gradually**: Don't over-moderate initially
- **Explain rejections clearly**: Help users understand what's acceptable
- **Provide alternatives**: "Instead of 'Taylor Swift style', try 'pop with catchy hooks'"
- **Log everything**: Track false positives to improve rules
- **Human review for edge cases**: AI moderation isn't perfect
- **Update blocklists regularly**: New slang, artists, trends emerge
- **Balance safety and creativity**: Don't stifle legitimate expression
- **Communicate policies**: Make content guidelines visible
- **Appeal process**: Allow users to contest rejections
- **Monitor effectiveness**: Track flag accuracy and user complaints

## Integration Points

- **Queue Optimizer**: Deprioritize flagged content for review
- **User Behavior Predictor**: Factor moderation history into churn risk
- **Cost Optimization**: Prevent wasted generation on rejected content
- **Broadcasting Scheduler**: Never auto-broadcast flagged content
