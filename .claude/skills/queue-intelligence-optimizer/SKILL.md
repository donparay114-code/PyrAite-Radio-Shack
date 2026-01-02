---
name: queue-intelligence-optimizer
description: Optimizes radio queue processing with predictive wait times, dynamic priority adjustment, fair play detection, and load balancing. Use when managing queue congestion, improving fairness, predicting processing times, or preventing system gaming.
---

# Queue Intelligence Optimizer

Advanced queue management using predictive analytics, fairness algorithms, and dynamic optimization.

## Instructions

When optimizing queue performance:

1. **Predictive Wait Time Calculation**
   - Analyze historical processing times (generation + mastering)
   - Factor in current queue depth and position
   - Account for time-of-day patterns (peak vs off-peak)
   - Consider failure rates and retry delays
   - Provide confidence intervals for estimates

2. **Dynamic Priority Adjustment**
   - Base priority: `100 + (reputation_score * 0.5)`
   - Time-decay boost: Increase priority for long-waiting requests
   - Peak-hour balancing: Adjust for high-load periods
   - Tier-based multipliers: Premium/admin weighting
   - Fair queue position guarantees

3. **Fair Play Detection**
   - Identify users gaming the reputation system
   - Detect coordinated upvote rings
   - Flag rapid request spam patterns
   - Monitor premium tier abuse
   - Enforce anti-manipulation policies

4. **Load Balancing Strategies**
   - Batch similar genres for mastering efficiency
   - Distribute requests across time windows
   - Reserve capacity for high-priority users
   - Implement request rate limiting
   - Optimize Suno API call patterns

5. **Queue Health Monitoring**
   - Track queue depth trends (hourly/daily)
   - Alert on congestion thresholds (>50 songs)
   - Measure processing velocity (songs/hour)
   - Monitor SLA compliance (<15min target)
   - Identify bottlenecks and failures

## Priority Scoring Algorithm

### Current Formula
```sql
-- Base priority calculation
UPDATE radio_queue
SET priority_score = 100 + (
  SELECT COALESCE(reputation_score, 0) * 0.5
  FROM radio_users
  WHERE telegram_id = radio_queue.telegram_id
);
```

### Enhanced Formula with Time Decay
```sql
-- Priority with waiting time boost
UPDATE radio_queue
SET priority_score = 100
  + (SELECT COALESCE(reputation_score, 0) * 0.5 FROM radio_users WHERE telegram_id = radio_queue.telegram_id)
  + (TIMESTAMPDIFF(MINUTE, created_at, NOW()) * 0.1)  -- +0.1 per minute waited
  + CASE
      WHEN tier = 'premium' THEN 20
      WHEN tier = 'admin' THEN 50
      ELSE 0
    END
  + CASE  -- Peak hour adjustment
      WHEN HOUR(NOW()) BETWEEN 18 AND 22 THEN -5  -- Slight penalty during peak
      WHEN HOUR(NOW()) BETWEEN 2 AND 6 THEN 5     -- Boost during off-peak
      ELSE 0
    END;
```

### Fair Queue Guarantee
```sql
-- Ensure no request waits >30 minutes regardless of priority
UPDATE radio_queue
SET priority_score = 999  -- Force to front
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
  AND status = 'pending';
```

## Wait Time Prediction

### Historical Processing Time Analysis
```sql
-- Calculate average processing time by genre
CREATE OR REPLACE VIEW avg_processing_times AS
SELECT
  genre,
  AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_seconds,
  STDDEV(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as std_dev_seconds,
  MIN(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as min_seconds,
  MAX(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as max_seconds,
  COUNT(*) as sample_size
FROM radio_history
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY genre;
```

### Predict Wait Time for New Request
```sql
-- Stored procedure to predict wait time
DELIMITER //
CREATE PROCEDURE predict_wait_time(
  IN request_id INT,
  OUT predicted_wait_minutes INT,
  OUT confidence_low INT,
  OUT confidence_high INT
)
BEGIN
  DECLARE queue_position INT;
  DECLARE songs_ahead INT;
  DECLARE avg_processing_sec INT;
  DECLARE std_dev_sec INT;

  -- Get position in queue
  SELECT COUNT(*) INTO queue_position
  FROM radio_queue
  WHERE priority_score > (SELECT priority_score FROM radio_queue WHERE id = request_id)
    AND status = 'pending';

  -- Get songs ahead
  SET songs_ahead = queue_position;

  -- Get average processing time for this genre
  SELECT
    COALESCE(apt.avg_seconds, 180),  -- Default 3 minutes if no data
    COALESCE(apt.std_dev_seconds, 60)
  INTO avg_processing_sec, std_dev_sec
  FROM radio_queue rq
  LEFT JOIN avg_processing_times apt ON rq.genre = apt.genre
  WHERE rq.id = request_id;

  -- Calculate prediction
  SET predicted_wait_minutes = CEIL((songs_ahead * avg_processing_sec) / 60);

  -- 95% confidence interval (±2 standard deviations)
  SET confidence_low = GREATEST(0, predicted_wait_minutes - CEIL((2 * std_dev_sec) / 60));
  SET confidence_high = predicted_wait_minutes + CEIL((2 * std_dev_sec) / 60);
END//
DELIMITER ;
```

### Real-Time Wait Time Display
```sql
-- Get wait time estimate for user
SELECT
  rq.id,
  rq.title,
  rq.priority_score,
  (
    SELECT COUNT(*)
    FROM radio_queue rq2
    WHERE rq2.priority_score > rq.priority_score
      AND rq2.status = 'pending'
  ) as position_in_queue,
  CEIL(
    (SELECT COUNT(*) FROM radio_queue WHERE priority_score > rq.priority_score AND status = 'pending')
    * (SELECT AVG(avg_seconds) FROM avg_processing_times) / 60
  ) as estimated_wait_minutes
FROM radio_queue rq
WHERE rq.telegram_id = ?
  AND rq.status = 'pending';
```

## Fair Play Detection

### Gaming Detection Patterns
```sql
-- Detect users with abnormal upvote patterns
CREATE OR REPLACE VIEW suspicious_reputation AS
SELECT
  u.telegram_id,
  u.username,
  u.reputation_score,
  COUNT(DISTINCT rl.upvoter_telegram_id) as unique_upvoters,
  COUNT(*) as total_upvotes,
  COUNT(*) / NULLIF(COUNT(DISTINCT rl.upvoter_telegram_id), 0) as upvotes_per_upvoter,
  CASE
    WHEN COUNT(*) / NULLIF(COUNT(DISTINCT rl.upvoter_telegram_id), 0) > 5 THEN 'Potential Ring'
    WHEN u.reputation_score > 500 AND DATEDIFF(NOW(), u.created_at) < 7 THEN 'Too Fast Growth'
    WHEN COUNT(*) > 100 AND COUNT(DISTINCT rl.upvoter_telegram_id) < 5 THEN 'Few Upvoters'
    ELSE 'Normal'
  END as risk_level
FROM radio_users u
LEFT JOIN reputation_logs rl ON u.telegram_id = rl.telegram_id AND rl.action = 'upvote_received'
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.telegram_id
HAVING risk_level != 'Normal';
```

### Request Spam Detection
```sql
-- Flag users submitting too many requests in short time
SELECT
  telegram_id,
  username,
  COUNT(*) as requests_last_hour,
  MAX(created_at) as last_request
FROM radio_queue
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY telegram_id
HAVING requests_last_hour > 10  -- More than 10 requests/hour is suspicious
ORDER BY requests_last_hour DESC;
```

### Reputation Decay for Inactive Users
```sql
-- Decay reputation for users inactive >30 days
UPDATE radio_users
SET reputation_score = GREATEST(0, reputation_score * 0.95)  -- 5% decay
WHERE last_active < DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND reputation_score > 0;
```

## Load Balancing

### Peak Hour Queue Management
```sql
-- Identify peak hours and queue depth patterns
SELECT
  HOUR(created_at) as hour,
  COUNT(*) as requests,
  AVG(TIMESTAMPDIFF(MINUTE, created_at, completed_at)) as avg_wait_minutes,
  MAX(
    SELECT COUNT(*)
    FROM radio_queue rq2
    WHERE rq2.created_at <= rq1.created_at
      AND rq2.status IN ('pending', 'processing')
  ) as peak_queue_depth
FROM radio_queue rq1
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY HOUR(created_at)
ORDER BY requests DESC;
```

### Batch Processing Optimization
```sql
-- Group similar genres for mastering batch processing
SELECT
  genre,
  COUNT(*) as pending_count,
  GROUP_CONCAT(id ORDER BY priority_score DESC LIMIT 5) as top_5_ids
FROM radio_queue
WHERE status = 'pending'
GROUP BY genre
HAVING pending_count >= 3
ORDER BY pending_count DESC;
```

### Capacity Reservation
```sql
-- Reserve queue slots for premium/admin users during peak hours
CREATE EVENT reserve_premium_capacity
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  DECLARE current_hour INT;
  SET current_hour = HOUR(NOW());

  -- During peak hours (6pm-10pm), boost premium user priority more
  IF current_hour BETWEEN 18 AND 22 THEN
    UPDATE radio_queue rq
    JOIN radio_users ru ON rq.telegram_id = ru.telegram_id
    SET rq.priority_score = rq.priority_score + 30
    WHERE ru.tier IN ('premium', 'admin')
      AND rq.status = 'pending';
  END IF;
END;
```

## Queue Health Metrics

### Real-Time Dashboard Queries
```sql
-- Queue health snapshot
SELECT
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_today,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_today,
  AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(completed_at, NOW()))) as avg_processing_time,
  MAX(TIMESTAMPDIFF(MINUTE, created_at, NOW())) as longest_wait,
  COUNT(*) / NULLIF(TIMESTAMPDIFF(HOUR, MIN(created_at), NOW()), 0) as requests_per_hour
FROM radio_queue
WHERE created_at >= CURDATE();
```

### SLA Compliance Tracking
```sql
-- Measure adherence to <15 minute processing SLA
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(CASE
    WHEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) <= 15 THEN 1
  END) as met_sla,
  COUNT(CASE
    WHEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) > 15 THEN 1
  END) as missed_sla,
  ROUND(
    COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, created_at, completed_at) <= 15 THEN 1 END) / COUNT(*) * 100,
    2
  ) as sla_percentage
FROM radio_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Examples

### Example 1: Optimize Queue During Peak Hours
User: "The queue is backing up during evening hours"

Analysis:
1. Query peak hour patterns - identify 6pm-10pm surge
2. Calculate current processing velocity (2 songs/min)
3. Predict queue will hit 100+ songs in 1 hour
4. Implement:
   - Increase time-decay boost to prioritize old requests
   - Reserve 30% capacity for premium users
   - Batch similar genres for faster mastering
   - Alert admins to increase Suno API concurrency

### Example 2: Detect Queue Gaming
User: "Check if anyone is manipulating the queue"

Process:
1. Run suspicious_reputation view
2. Identify users with upvote rings (same 3 people always upvoting)
3. Flag rapid reputation growth (500 points in 7 days)
4. Check request patterns (spam detection)
5. Recommend: Cap reputation boost at 50 points, implement upvote cooldowns

### Example 3: Provide Wait Time to User
User requests song, wants to know: "When will my song play?"

Calculate:
- Queue position: 23rd
- Average processing time: 3 minutes per song
- Estimated wait: 69 minutes (±15 min confidence)
- Return: "Your song will play in approximately 1 hour 9 minutes (estimated range: 54-84 minutes)"

## Best Practices

- **Update priorities every 5 minutes**: Ensure time-decay boosts apply
- **Monitor queue depth continuously**: Alert at 50, 75, 100 song thresholds
- **Balance fairness and priority**: Don't let high-rep users monopolize
- **Test gaming scenarios**: Simulate upvote rings, spam requests
- **Track SLA compliance**: Aim for >95% of requests under 15 minutes
- **Analyze failure patterns**: Retries impact wait times
- **Optimize batch processing**: Group mastering jobs when possible
- **Provide transparency**: Show users their queue position and wait time
- **Implement circuit breakers**: Pause processing during API outages
- **Reserve emergency capacity**: Keep 10% for admin/critical requests

## Integration Points

- **Broadcast Analytics**: Correlate queue patterns with listener engagement
- **Cost Optimization**: Batch processing reduces API costs
- **User Behavior Predictor**: Predict high-activity periods
- **Monitoring Alerts**: Telegram notifications for queue congestion
