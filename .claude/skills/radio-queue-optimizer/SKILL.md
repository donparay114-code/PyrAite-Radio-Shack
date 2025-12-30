# Radio Queue Priority Optimizer

**Purpose**: Optimize queue priority calculation, ensure fair play distribution, prevent spam, manage reputation system, and balance premium vs free user requests.

**When to use**: Adjusting queue algorithms, debugging unfair play order, calculating optimal priority weights, preventing queue manipulation, analyzing play patterns.

## Priority Calculation Formula

### Base Formula (from development plan)
```sql
calculated_priority =
  (base_priority * 0.3) +
  (user_reputation * 0.25) +
  (upvotes * 5.0) +
  (CASE WHEN is_premium THEN 20.0 ELSE 0.0 END) +
  (-wait_time_hours * 2.0) +
  (CASE WHEN request_count_today < 3 THEN 10.0 ELSE 0.0 END)
```

### Component Breakdown
| Component | Weight | Purpose | Range |
|-----------|--------|---------|-------|
| Base Priority | 30% | User-set urgency | 1-10 |
| Reputation | 25% | Reward good users | 0-100 |
| Upvotes | 5pts each | Community voting | 0-∞ |
| Premium Boost | +20pts | Subscriber benefit | 0 or 20 |
| Wait Time Penalty | -2pts/hour | Prevent stagnation | 0 to -48 |
| New User Boost | +10pts | First 3 requests/day | 0 or 10 |

### Advanced Formula (Fairness Optimized)
```sql
CREATE OR REPLACE FUNCTION calculate_priority_v2(
  base_priority INT,
  user_reputation INT,
  upvotes INT,
  is_premium BOOLEAN,
  created_at TIMESTAMP,
  request_count_today INT,
  total_user_plays INT,
  channel_avg_wait_time INTERVAL
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  wait_hours DECIMAL;
  fairness_boost DECIMAL;
  priority DECIMAL;
BEGIN
  -- Calculate wait time in hours
  wait_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600;

  -- Fairness boost for users with few plays
  fairness_boost := CASE
    WHEN total_user_plays < 5 THEN 15.0
    WHEN total_user_plays < 20 THEN 8.0
    WHEN total_user_plays < 50 THEN 3.0
    ELSE 0.0
  END;

  -- Calculate priority
  priority :=
    (base_priority * 0.25) +
    (user_reputation * 0.20) +
    (upvotes * 4.0) +
    (CASE WHEN is_premium THEN 18.0 ELSE 0.0 END) +
    (wait_hours * 1.5) +  -- Changed to positive (longer wait = higher priority)
    (CASE WHEN request_count_today <= 3 THEN 10.0 ELSE 0.0 END) +
    fairness_boost;

  -- Cap maximum priority to prevent abuse
  priority := LEAST(priority, 200.0);

  RETURN priority;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

## Queue Management Queries

### Get Next Track to Play
```sql
-- Optimized query with weighted randomization
WITH eligible_requests AS (
  SELECT
    sr.id,
    sr.channel_id,
    sr.audio_url,
    sr.prompt,
    sr.calculated_priority,
    u.platform_username,
    -- Add random factor for variety (±10%)
    sr.calculated_priority * (0.9 + RANDOM() * 0.2) AS effective_priority
  FROM song_requests sr
  JOIN users u ON sr.user_id = u.id
  WHERE sr.queue_status = 'queued'
    AND sr.channel_id = $1
    AND sr.generation_status = 'completed'
    AND sr.audio_url IS NOT NULL
    -- Prevent same user dominating queue
    AND NOT EXISTS (
      SELECT 1 FROM song_requests sr2
      WHERE sr2.user_id = sr.user_id
        AND sr2.channel_id = $1
        AND sr2.queue_status = 'playing'
    )
  ORDER BY effective_priority DESC
  LIMIT 10
)
SELECT * FROM eligible_requests
ORDER BY RANDOM()  -- Final randomization among top 10
LIMIT 1;
```

### Update Priorities (Batch)
```sql
-- Recalculate all queued requests
UPDATE song_requests sr
SET calculated_priority = calculate_priority_v2(
  sr.base_priority,
  u.reputation_score,
  sr.upvotes,
  u.is_premium,
  sr.created_at,
  (SELECT COUNT(*) FROM song_requests sr2
   WHERE sr2.user_id = sr.user_id
     AND DATE(sr2.created_at) = CURRENT_DATE),
  (SELECT COUNT(*) FROM song_requests sr3
   WHERE sr3.user_id = sr.user_id
     AND sr3.queue_status IN ('played', 'playing')),
  (SELECT AVG(NOW() - created_at) FROM song_requests
   WHERE channel_id = sr.channel_id AND queue_status = 'played')
)
FROM users u
WHERE sr.user_id = u.id
  AND sr.queue_status = 'queued'
  AND sr.channel_id = $1;
```

## Reputation System

### Reputation Calculation
```sql
CREATE OR REPLACE FUNCTION update_user_reputation(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  new_reputation INT;
BEGIN
  SELECT
    GREATEST(0, LEAST(100,
      50 +  -- Base reputation
      (successful_plays * 2) +
      (upvotes_received * 3) +
      (premium_duration_months * 5) +
      (-violations * 10) +
      (-timeouts * 15)
    )) INTO new_reputation
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE queue_status = 'played') AS successful_plays,
      COALESCE(SUM(upvotes), 0) AS upvotes_received,
      CASE WHEN is_premium THEN
        EXTRACT(MONTH FROM AGE(subscription_expires_at, subscription_started_at))
      ELSE 0 END AS premium_duration_months,
      COALESCE((SELECT COUNT(*) FROM user_violations WHERE user_id = p_user_id), 0) AS violations,
      COALESCE((SELECT COUNT(*) FROM user_violations
                WHERE user_id = p_user_id AND timeout_until IS NOT NULL), 0) AS timeouts
    FROM users u
    LEFT JOIN song_requests sr ON sr.user_id = u.id
    WHERE u.id = p_user_id
    GROUP BY u.id, u.is_premium, u.subscription_expires_at, u.subscription_started_at
  ) stats;

  UPDATE users
  SET reputation_score = new_reputation
  WHERE id = p_user_id;

  RETURN new_reputation;
END;
$$ LANGUAGE plpgsql;
```

### Reputation Triggers
```sql
-- Auto-update reputation after track plays
CREATE OR REPLACE FUNCTION trigger_update_reputation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.queue_status = 'played' AND OLD.queue_status != 'played' THEN
    PERFORM update_user_reputation(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_track_played
AFTER UPDATE ON song_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_update_reputation();
```

## Anti-Spam & Fairness

### Detect Queue Manipulation
```sql
-- Find users spamming requests
SELECT
  u.platform_username,
  COUNT(*) AS request_count,
  AVG(sr.calculated_priority) AS avg_priority,
  BOOL_OR(u.is_premium) AS is_premium
FROM song_requests sr
JOIN users u ON sr.user_id = u.id
WHERE sr.created_at > NOW() - INTERVAL '1 hour'
  AND sr.queue_status = 'queued'
GROUP BY u.id, u.platform_username
HAVING COUNT(*) > 10
ORDER BY request_count DESC;
```

### Implement Cooldown
```sql
-- Prevent rapid-fire requests
CREATE OR REPLACE FUNCTION check_request_cooldown(
  p_user_id UUID,
  p_channel_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  last_request_time TIMESTAMP;
  min_cooldown_seconds INT;
BEGIN
  -- Get user's last request time
  SELECT MAX(created_at) INTO last_request_time
  FROM song_requests
  WHERE user_id = p_user_id
    AND channel_id = p_channel_id;

  -- Premium: 30s cooldown, Free: 120s cooldown
  SELECT CASE WHEN is_premium THEN 30 ELSE 120 END
  INTO min_cooldown_seconds
  FROM users WHERE id = p_user_id;

  -- Check if enough time has passed
  IF last_request_time IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN (NOW() - last_request_time) > (min_cooldown_seconds || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

### Diversity Enforcement
```sql
-- Ensure variety in queue (no same user twice in a row)
WITH recent_plays AS (
  SELECT user_id
  FROM song_requests
  WHERE channel_id = $1
    AND queue_status IN ('playing', 'played')
  ORDER BY played_at DESC
  LIMIT 3
)
SELECT sr.*
FROM song_requests sr
WHERE sr.channel_id = $1
  AND sr.queue_status = 'queued'
  AND sr.user_id NOT IN (SELECT user_id FROM recent_plays)
ORDER BY sr.calculated_priority DESC
LIMIT 1;
```

## Performance Optimization

### Index Strategy
```sql
-- Critical indexes for queue queries
CREATE INDEX idx_queue_priority ON song_requests(channel_id, queue_status, calculated_priority DESC)
  WHERE queue_status = 'queued';

CREATE INDEX idx_recent_plays ON song_requests(channel_id, played_at DESC)
  WHERE queue_status IN ('playing', 'played');

CREATE INDEX idx_user_requests_today ON song_requests(user_id, created_at)
  WHERE DATE(created_at) = CURRENT_DATE;

-- Partial index for active queues
CREATE INDEX idx_active_queue ON song_requests(channel_id, calculated_priority DESC)
  WHERE queue_status = 'queued' AND generation_status = 'completed';
```

### Materialized View for Analytics
```sql
CREATE MATERIALIZED VIEW queue_stats AS
SELECT
  channel_id,
  COUNT(*) AS total_queued,
  AVG(calculated_priority) AS avg_priority,
  MAX(created_at) AS newest_request,
  MIN(created_at) AS oldest_request,
  AVG(NOW() - created_at) AS avg_wait_time
FROM song_requests
WHERE queue_status = 'queued'
GROUP BY channel_id;

CREATE UNIQUE INDEX ON queue_stats(channel_id);

-- Refresh every 5 minutes via cron
-- */5 * * * * psql -c "REFRESH MATERIALIZED VIEW CONCURRENTLY queue_stats;"
```

## A/B Testing Priority Algorithms

### Test Setup
```sql
CREATE TABLE priority_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name VARCHAR(100),
  variant VARCHAR(50),  -- 'control', 'variant_a', 'variant_b'
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

CREATE TABLE priority_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES priority_experiments(id),
  metric_name VARCHAR(100),  -- 'avg_wait_time', 'user_satisfaction', 'queue_length'
  metric_value DECIMAL(10,2),
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

### Compare Variants
```sql
-- Analyze experiment results
SELECT
  pe.variant,
  AVG(pm.metric_value) FILTER (WHERE pm.metric_name = 'avg_wait_time') AS avg_wait_time,
  AVG(pm.metric_value) FILTER (WHERE pm.metric_name = 'user_satisfaction') AS satisfaction_score,
  COUNT(DISTINCT pe.user_id) AS user_count
FROM priority_experiments pe
JOIN priority_metrics pm ON pm.experiment_id = pe.id
WHERE pe.experiment_name = 'priority_formula_v2'
  AND pe.started_at > NOW() - INTERVAL '7 days'
GROUP BY pe.variant;
```

## Monitoring & Alerts

### Queue Health Dashboard
```sql
-- Real-time queue health metrics
SELECT
  c.name AS channel,
  COUNT(*) FILTER (WHERE sr.queue_status = 'queued') AS queued,
  COUNT(*) FILTER (WHERE sr.queue_status = 'playing') AS playing,
  AVG(NOW() - sr.created_at) FILTER (WHERE sr.queue_status = 'queued') AS avg_wait,
  MAX(NOW() - sr.created_at) FILTER (WHERE sr.queue_status = 'queued') AS max_wait,
  COUNT(DISTINCT sr.user_id) FILTER (WHERE sr.queue_status = 'queued') AS unique_requesters
FROM radio_channels c
LEFT JOIN song_requests sr ON sr.channel_id = c.id
GROUP BY c.id, c.name
ORDER BY queued DESC;
```

### Alert Triggers
```sql
-- Alert if queue is stuck (oldest request > 2 hours)
SELECT
  c.name,
  sr.id,
  sr.prompt,
  NOW() - sr.created_at AS wait_time
FROM song_requests sr
JOIN radio_channels c ON c.id = sr.channel_id
WHERE sr.queue_status = 'queued'
  AND sr.created_at < NOW() - INTERVAL '2 hours'
ORDER BY sr.created_at ASC;

-- Alert if priority calculation is broken (all same priority)
SELECT channel_id, COUNT(DISTINCT calculated_priority) AS unique_priorities
FROM song_requests
WHERE queue_status = 'queued'
GROUP BY channel_id
HAVING COUNT(DISTINCT calculated_priority) = 1;
```

## Tuning Guidelines

### Priority Weight Adjustments

**Scenario**: Premium users dominating queue
```sql
-- Reduce premium boost from 20 to 15
UPDATE song_requests SET calculated_priority = calculated_priority - 5
WHERE user_id IN (SELECT id FROM users WHERE is_premium = true);
```

**Scenario**: Long wait times for free users
```sql
-- Increase wait time boost from 1.5 to 2.5 per hour
-- Adjust in calculate_priority_v2 function
```

**Scenario**: Upvote manipulation (vote rings)
```sql
-- Cap upvote contribution at 20 points max
UPDATE song_requests SET calculated_priority =
  calculated_priority - (GREATEST(0, upvotes - 5) * 4.0)
WHERE upvotes > 5;
```

### Recommended Settings by Channel Size

| Channel Size | Premium Boost | Wait Bonus | New User Boost | Upvote Weight |
|--------------|---------------|------------|----------------|---------------|
| Small (<50 requests/day) | 15 | 2.0/hr | 15 | 5/vote |
| Medium (50-200/day) | 18 | 1.5/hr | 10 | 4/vote |
| Large (>200/day) | 20 | 1.0/hr | 8 | 3/vote |

## Tools & Scripts

### Queue Simulator
```python
# test_queue_priority.py
import random

def simulate_queue(users, premium_ratio=0.1, hours=24):
    requests = []
    for i in range(len(users)):
        req = {
            'id': i,
            'user_id': users[i],
            'base_priority': random.randint(1, 10),
            'reputation': random.randint(0, 100),
            'upvotes': random.randint(0, 10),
            'is_premium': random.random() < premium_ratio,
            'wait_hours': random.uniform(0, hours),
            'request_count_today': random.randint(0, 20)
        }
        req['calculated_priority'] = calculate_priority(req)
        requests.append(req)

    return sorted(requests, key=lambda x: x['calculated_priority'], reverse=True)

def calculate_priority(req):
    return (
        req['base_priority'] * 0.25 +
        req['reputation'] * 0.20 +
        req['upvotes'] * 4.0 +
        (18.0 if req['is_premium'] else 0.0) +
        req['wait_hours'] * 1.5 +
        (10.0 if req['request_count_today'] <= 3 else 0.0)
    )

# Run simulation
users = [f"user_{i}" for i in range(100)]
queue = simulate_queue(users)

print("Top 10 Queue:")
for req in queue[:10]:
    print(f"User: {req['user_id']}, Priority: {req['calculated_priority']:.2f}, Premium: {req['is_premium']}")
```

## Best Practices

1. **Recalculate priorities every 5 minutes** (n8n cron workflow)
2. **Cap maximum wait time consideration** at 48 hours to prevent stale requests
3. **Use weighted randomization** among top 10 candidates for variety
4. **Implement cooldowns** to prevent spam (30s premium, 120s free)
5. **Monitor reputation drift** - adjust base reputation if average trends too low/high
6. **A/B test changes** before rolling out to all channels
7. **Diversity enforcement** - no same user twice in row
8. **Premium fairness** - ensure premium doesn't completely exclude free users

## Next Steps

1. Implement priority_v2 function in production database
2. Create n8n workflow for priority recalculation (every 5 min)
3. Build admin dashboard to visualize queue metrics
4. Set up A/B testing framework for algorithm changes
5. Monitor average wait times and adjust weights accordingly
