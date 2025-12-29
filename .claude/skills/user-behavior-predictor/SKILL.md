---
name: user-behavior-predictor
description: Predicts user behavior patterns including churn risk, premium upgrade potential, genre preferences, and listening habits. Uses historical data for personalized recommendations and retention strategies. Use when analyzing user lifecycle, predicting engagement, or personalizing content.
---

# User Behavior Predictor

Predictive analytics for user engagement, retention, and monetization using machine learning patterns.

## Instructions

When predicting user behavior:

1. **User Lifecycle Segmentation**
   - New users (0-7 days): Onboarding phase
   - Active users (7-30 days): Engagement building
   - Power users (30+ days, high activity): Core audience
   - At-risk users (declining activity): Churn prevention
   - Churned users (30+ days inactive): Reactivation campaigns

2. **Churn Risk Prediction**
   - Track activity decay (requests, upvotes, listening time)
   - Calculate recency, frequency, monetary (RFM) scores
   - Identify warning signs (skipped prompts, no upvotes)
   - Predict churn probability (0-100%)
   - Trigger retention interventions

3. **Premium Upgrade Potential**
   - Identify users hitting free tier limits frequently
   - Track request timing (frustrated by daily cap?)
   - Measure engagement quality (upvotes given/received)
   - Calculate lifetime value potential
   - Score conversion probability

4. **Genre Preference Learning**
   - Track requested vs listened genres
   - Identify exploration patterns (genre diversity)
   - Predict next genre interest
   - Recommend personalized playlists
   - Detect taste evolution over time

5. **Listening Pattern Analysis**
   - Identify peak listening hours per user
   - Predict daily/weekly request patterns
   - Forecast queue demand by user cohort
   - Optimize content timing for engagement
   - Personalize notification timing

## User Segmentation Queries

### RFM Analysis (Recency, Frequency, Monetary)
```sql
-- Calculate RFM scores for all users
CREATE OR REPLACE VIEW user_rfm_scores AS
SELECT
  ru.telegram_id,
  ru.username,

  -- Recency Score (1-5, higher = more recent)
  CASE
    WHEN DATEDIFF(NOW(), ru.last_active) <= 1 THEN 5
    WHEN DATEDIFF(NOW(), ru.last_active) <= 7 THEN 4
    WHEN DATEDIFF(NOW(), ru.last_active) <= 30 THEN 3
    WHEN DATEDIFF(NOW(), ru.last_active) <= 90 THEN 2
    ELSE 1
  END as recency_score,

  -- Frequency Score (1-5, based on request count)
  CASE
    WHEN ru.total_requests >= 100 THEN 5
    WHEN ru.total_requests >= 50 THEN 4
    WHEN ru.total_requests >= 20 THEN 3
    WHEN ru.total_requests >= 5 THEN 2
    ELSE 1
  END as frequency_score,

  -- Monetary Score (1-5, based on tier and engagement)
  CASE
    WHEN ru.tier = 'admin' THEN 5
    WHEN ru.tier = 'premium' THEN 4
    WHEN ru.reputation_score >= 200 THEN 3
    WHEN ru.reputation_score >= 50 THEN 2
    ELSE 1
  END as monetary_score,

  -- Overall RFM Score
  CONCAT(
    CASE WHEN DATEDIFF(NOW(), ru.last_active) <= 7 THEN 5 ELSE 3 END,
    CASE WHEN ru.total_requests >= 20 THEN 5 ELSE 2 END,
    CASE WHEN ru.tier IN ('premium', 'admin') THEN 5 ELSE 1 END
  ) as rfm_segment

FROM radio_users ru;
```

### Churn Risk Prediction
```sql
-- Identify users at risk of churning
CREATE OR REPLACE VIEW churn_risk_users AS
SELECT
  ru.telegram_id,
  ru.username,
  ru.last_active,
  DATEDIFF(NOW(), ru.last_active) as days_inactive,

  -- Activity trend (last 7 days vs previous 7 days)
  (
    SELECT COUNT(*)
    FROM radio_queue
    WHERE telegram_id = ru.telegram_id
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  ) as requests_last_7d,

  (
    SELECT COUNT(*)
    FROM radio_queue
    WHERE telegram_id = ru.telegram_id
      AND created_at BETWEEN DATE_SUB(NOW(), INTERVAL 14 DAY) AND DATE_SUB(NOW(), INTERVAL 7 DAY)
  ) as requests_prev_7d,

  -- Engagement quality
  ru.reputation_score,
  (SELECT COUNT(*) FROM upvotes WHERE upvoter_telegram_id = ru.telegram_id) as upvotes_given,

  -- Churn probability score (0-100)
  LEAST(100, GREATEST(0,
    (DATEDIFF(NOW(), ru.last_active) * 5)  -- Days inactive penalty
    + IF(ru.total_requests < 5, 20, 0)  -- Low engagement penalty
    + IF(ru.reputation_score < 10, 15, 0)  -- Low reputation penalty
    - IF((SELECT COUNT(*) FROM upvotes WHERE upvoter_telegram_id = ru.telegram_id) > 10, 20, 0)  -- Active participant bonus
  )) as churn_risk_score,

  CASE
    WHEN DATEDIFF(NOW(), ru.last_active) > 30 THEN 'Churned'
    WHEN DATEDIFF(NOW(), ru.last_active) > 14 THEN 'High Risk'
    WHEN DATEDIFF(NOW(), ru.last_active) > 7 THEN 'Medium Risk'
    WHEN (SELECT COUNT(*) FROM radio_queue WHERE telegram_id = ru.telegram_id AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) = 0
      AND ru.total_requests > 0 THEN 'Low Risk'
    ELSE 'Active'
  END as risk_category

FROM radio_users ru
WHERE ru.created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)  -- Exclude brand new users
HAVING risk_category IN ('High Risk', 'Medium Risk', 'Churned')
ORDER BY churn_risk_score DESC;
```

### Premium Upgrade Potential
```sql
-- Score users likely to upgrade to premium
CREATE OR REPLACE VIEW premium_upgrade_candidates AS
SELECT
  ru.telegram_id,
  ru.username,
  ru.tier,
  ru.total_requests,
  ru.requests_today,
  ru.daily_limit,

  -- How often they hit limits
  (
    SELECT COUNT(DISTINCT DATE(created_at))
    FROM radio_queue
    WHERE telegram_id = ru.telegram_id
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND (
        SELECT COUNT(*)
        FROM radio_queue rq2
        WHERE rq2.telegram_id = ru.telegram_id
          AND DATE(rq2.created_at) = DATE(radio_queue.created_at)
      ) >= 5  -- Days they hit/approached free limit
  ) as days_hit_limit_last_30,

  -- Engagement quality
  ru.reputation_score,
  (SELECT COUNT(*) FROM upvotes WHERE upvoter_telegram_id = ru.telegram_id) as upvotes_given,

  -- Value indicators
  (SELECT AVG(upvotes) FROM radio_history WHERE telegram_id = ru.telegram_id) as avg_upvotes_per_song,

  -- Conversion score (0-100)
  LEAST(100, GREATEST(0,
    (
      SELECT COUNT(DISTINCT DATE(created_at))
      FROM radio_queue
      WHERE telegram_id = ru.telegram_id
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND (SELECT COUNT(*) FROM radio_queue rq2 WHERE rq2.telegram_id = ru.telegram_id AND DATE(rq2.created_at) = DATE(radio_queue.created_at)) >= 5
    ) * 3  -- Days hitting limit (strong signal)
    + IF(ru.reputation_score > 100, 20, 0)  -- High engagement
    + IF(ru.total_requests > 50, 15, 0)  -- Frequent user
    + IF((SELECT AVG(upvotes) FROM radio_history WHERE telegram_id = ru.telegram_id) > 5, 10, 0)  -- Quality content
  )) as conversion_score

FROM radio_users ru
WHERE ru.tier = 'free'
  AND ru.total_requests >= 10  -- Minimum engagement threshold
HAVING days_hit_limit_last_30 >= 3 OR conversion_score >= 40
ORDER BY conversion_score DESC;
```

## Genre Preference Prediction

### User Taste Profile
```sql
-- Build comprehensive genre preference profile
CREATE OR REPLACE VIEW user_genre_preferences AS
SELECT
  rq.telegram_id,
  rq.genre,
  COUNT(*) as times_requested,
  AVG(rh.upvotes) as avg_upvotes_received,

  -- Listening preference
  (
    SELECT COUNT(*)
    FROM listener_stats ls
    JOIN radio_history rh2 ON ls.song_id = rh2.id
    WHERE ls.telegram_id = rq.telegram_id
      AND rh2.genre = rq.genre
      AND ls.action = 'listened'
  ) as times_listened,

  -- Engagement score
  COUNT(*) * 2 +  -- Request weight
  AVG(rh.upvotes) * 5 +  -- Quality weight
  (SELECT COUNT(*) FROM listener_stats ls JOIN radio_history rh2 ON ls.song_id = rh2.id WHERE ls.telegram_id = rq.telegram_id AND rh2.genre = rq.genre) * 3  -- Listen weight
  as preference_score

FROM radio_queue rq
LEFT JOIN radio_history rh ON rq.id = rh.id
WHERE rq.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY rq.telegram_id, rq.genre
ORDER BY rq.telegram_id, preference_score DESC;
```

### Predict Next Genre Interest
```sql
-- Recommend genres based on user's taste profile and exploration pattern
DELIMITER //
CREATE PROCEDURE recommend_next_genre(
  IN p_telegram_id BIGINT,
  OUT p_recommended_genre VARCHAR(50),
  OUT p_confidence_score INT
)
BEGIN
  DECLARE user_top_genre VARCHAR(50);
  DECLARE user_diversity_score INT;

  -- Get user's top genre
  SELECT genre INTO user_top_genre
  FROM user_genre_preferences
  WHERE telegram_id = p_telegram_id
  ORDER BY preference_score DESC
  LIMIT 1;

  -- Calculate genre diversity (how many genres they've tried)
  SELECT COUNT(DISTINCT genre) INTO user_diversity_score
  FROM radio_queue
  WHERE telegram_id = p_telegram_id;

  -- Recommendation logic
  IF user_diversity_score < 3 THEN
    -- New user: Recommend popular complementary genre
    SELECT rh.genre, 75 INTO p_recommended_genre, p_confidence_score
    FROM radio_history rh
    WHERE rh.genre != user_top_genre
      AND rh.genre IN (
        -- Similar energy/mood genres
        SELECT g2.genre
        FROM genre_settings gs1
        JOIN genre_settings gs2 ON ABS(gs1.target_lufs - gs2.target_lufs) <= 3
        WHERE gs1.genre = user_top_genre
      )
    GROUP BY rh.genre
    ORDER BY AVG(rh.upvotes) DESC
    LIMIT 1;

  ELSE
    -- Experienced user: Find unexplored genre with high potential
    SELECT rh.genre, 85 INTO p_recommended_genre, p_confidence_score
    FROM radio_history rh
    WHERE rh.genre NOT IN (
      SELECT genre FROM radio_queue WHERE telegram_id = p_telegram_id
    )
    GROUP BY rh.genre
    ORDER BY AVG(rh.upvotes) DESC, COUNT(*) DESC
    LIMIT 1;
  END IF;
END//
DELIMITER ;
```

## Listening Pattern Analysis

### Peak Activity Hours by User
```sql
-- Identify when each user is most active
CREATE OR REPLACE VIEW user_peak_hours AS
SELECT
  telegram_id,
  HOUR(created_at) as hour_of_day,
  COUNT(*) as requests_count,
  RANK() OVER (PARTITION BY telegram_id ORDER BY COUNT(*) DESC) as hour_rank
FROM radio_queue
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY telegram_id, HOUR(created_at)
HAVING hour_rank <= 3;  -- Top 3 peak hours per user
```

### Predict Daily Request Pattern
```sql
-- Forecast expected requests by user and day
CREATE OR REPLACE VIEW user_request_forecast AS
SELECT
  ru.telegram_id,
  ru.username,

  -- Historical averages
  AVG(daily_counts.requests) as avg_requests_per_day,
  STDDEV(daily_counts.requests) as stddev_requests,

  -- Predicted range for today
  GREATEST(0, AVG(daily_counts.requests) - STDDEV(daily_counts.requests)) as predicted_min,
  AVG(daily_counts.requests) as predicted_avg,
  AVG(daily_counts.requests) + STDDEV(daily_counts.requests) as predicted_max,

  -- Day of week pattern
  MAX(CASE WHEN daily_counts.day_of_week = DAYOFWEEK(NOW()) THEN daily_counts.requests END) as typical_for_today

FROM radio_users ru
LEFT JOIN (
  SELECT
    telegram_id,
    DATE(created_at) as request_date,
    DAYOFWEEK(created_at) as day_of_week,
    COUNT(*) as requests
  FROM radio_queue
  WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  GROUP BY telegram_id, DATE(created_at)
) daily_counts ON ru.telegram_id = daily_counts.telegram_id
WHERE ru.total_requests >= 10  -- Minimum data for prediction
GROUP BY ru.telegram_id;
```

## Retention Intervention Triggers

### Automated Re-engagement Campaigns
```sql
-- Trigger retention actions based on behavior signals
CREATE TABLE retention_interventions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  telegram_id BIGINT,
  intervention_type ENUM(
    'welcome_series',
    'churn_prevention',
    'premium_offer',
    'reactivation',
    'genre_discovery',
    'engagement_boost'
  ),
  trigger_reason VARCHAR(255),
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (telegram_id) REFERENCES radio_users(telegram_id),
  INDEX idx_type (intervention_type),
  INDEX idx_triggered (triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Identify users needing interventions
INSERT INTO retention_interventions (telegram_id, intervention_type, trigger_reason)
SELECT telegram_id, 'churn_prevention', 'High churn risk detected'
FROM churn_risk_users
WHERE risk_category = 'High Risk'
  AND telegram_id NOT IN (
    SELECT telegram_id FROM retention_interventions
    WHERE intervention_type = 'churn_prevention'
      AND triggered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  );
```

## Examples

### Example 1: Identify Churn Risks
User: "Who's likely to stop using the radio station?"

Process:
1. Query churn_risk_users view
2. Find users with >50 churn_risk_score
3. Analyze decline patterns (requests decreasing)
4. Segment by reason (hit limits? Bad content?)
5. Trigger retention campaign (Telegram message, special offer)

### Example 2: Target Premium Upgrades
User: "Which free users should we offer premium to?"

Analyze:
1. Query premium_upgrade_candidates
2. Find users hitting daily limit 10+ days/month
3. Check engagement quality (reputation >100)
4. Calculate LTV potential
5. Send personalized upgrade offer at peak hour
6. Track conversion rate

### Example 3: Personalized Genre Recommendation
User requests "EDM" song, predict next interest:

Calculate:
- User has requested: EDM (40%), Trap (30%), Pop (20%), Rock (10%)
- High energy preference detected (avg BPM 135)
- Suggest: House (similar to EDM, high energy, unexplored)
- Confidence: 82%

## Predictive Model Performance

### Track Prediction Accuracy
```sql
CREATE TABLE prediction_accuracy_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prediction_type ENUM('churn', 'upgrade', 'genre', 'activity'),
  predicted_at DATE,
  telegram_id BIGINT,
  predicted_value VARCHAR(100),
  predicted_probability DECIMAL(5,2),
  actual_outcome VARCHAR(100),
  correct BOOLEAN,

  INDEX idx_type (prediction_type),
  INDEX idx_date (predicted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Calculate model accuracy
SELECT
  prediction_type,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN correct = TRUE THEN 1 ELSE 0 END) as correct_predictions,
  ROUND(SUM(CASE WHEN correct = TRUE THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as accuracy_percent
FROM prediction_accuracy_log
WHERE predicted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY prediction_type;
```

## Best Practices

- **Require minimum data**: Don't predict on <10 requests or <7 days activity
- **Update predictions daily**: Refresh RFM scores and risk assessments
- **A/B test interventions**: Measure if retention campaigns work
- **Personalize timing**: Send messages during user's peak hours
- **Track prediction accuracy**: Continuously improve models
- **Segment carefully**: New users ≠ power users ≠ churned users
- **Respect privacy**: Use aggregated patterns, not invasive tracking
- **Combine signals**: Multi-factor analysis beats single metrics
- **Act on predictions**: Predictions without action waste resources
- **Feedback loops**: Learn from successful/failed predictions

## Integration Points

- **Broadcast Analytics**: User engagement correlates with content quality
- **Queue Optimizer**: Prioritize high-LTV users strategically
- **Cost Optimization**: Focus spend on high-conversion users
- **Social Media Tracker**: Cross-platform behavior signals
