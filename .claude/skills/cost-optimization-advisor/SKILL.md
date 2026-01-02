---
name: cost-optimization-advisor
description: Tracks Suno API spending, predicts monthly costs, identifies waste, and recommends optimization strategies. Provides budget alerts, cost-per-engagement analysis, and ROI calculations. Use when monitoring burn rate, setting budgets, or reducing costs.
---

# Cost Optimization Advisor

Financial intelligence for Suno API usage, budget management, and ROI optimization.

## Instructions

When optimizing costs:

1. **Real-Time Spend Tracking**
   - Monitor daily Suno API costs ($0.50 per song)
   - Calculate running totals (daily, weekly, monthly)
   - Track spend by user, genre, time slot
   - Identify cost spikes and anomalies
   - Alert on budget threshold breaches

2. **Budget Forecasting**
   - Predict month-end costs based on trends
   - Calculate burn rate ($/day average)
   - Project annual costs from current usage
   - Model "what-if" scenarios (user growth, limit changes)
   - Provide early warning of budget overruns

3. **Cost Attribution Analysis**
   - Cost per user (total spend / unique users)
   - Cost per engagement (spend / total upvotes)
   - Cost by user tier (free vs premium vs admin)
   - Cost efficiency by genre
   - Identify high-cost, low-value users

4. **Waste Identification**
   - Songs with zero upvotes (wasted generation)
   - Failed generations that consumed API calls
   - Duplicate requests (same user, same prompt)
   - Off-peak idle capacity (unused API quota)
   - Low-quality content requiring regeneration

5. **Optimization Recommendations**
   - Adjust daily limits to control spend
   - Implement peak/off-peak pricing tiers
   - Batch processing for cost efficiency
   - Cache popular requests
   - Prune low-engagement users

## Cost Tracking Schema

### Daily Cost Snapshots
```sql
CREATE TABLE daily_cost_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  snapshot_date DATE UNIQUE,

  -- Volume metrics
  songs_generated INT DEFAULT 0,
  songs_completed INT DEFAULT 0,
  songs_failed INT DEFAULT 0,

  -- Cost metrics
  total_cost DECIMAL(10,2),  -- songs_generated * 0.50
  cost_per_completed DECIMAL(6,2),
  cost_per_engagement DECIMAL(6,2),

  -- User metrics
  unique_users INT,
  new_users INT,
  premium_users INT,

  -- Engagement metrics
  total_upvotes INT,
  total_listens INT,
  avg_engagement_rate DECIMAL(5,2),

  -- Efficiency metrics
  completion_rate DECIMAL(5,2),  -- completed / generated
  waste_rate DECIMAL(5,2),  -- (failed + zero_upvotes) / generated
  roi_score DECIMAL(8,2),  -- total_upvotes / total_cost

  INDEX idx_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Per-User Cost Tracking
```sql
CREATE TABLE user_cost_attribution (
  id INT PRIMARY KEY AUTO_INCREMENT,
  telegram_id BIGINT,
  month_start DATE,

  -- Volume
  songs_requested INT DEFAULT 0,
  songs_completed INT DEFAULT 0,

  -- Cost
  total_cost DECIMAL(10,2),
  avg_cost_per_song DECIMAL(5,2),

  -- Value
  total_upvotes_received INT DEFAULT 0,
  total_listens INT DEFAULT 0,

  -- Efficiency
  cost_per_upvote DECIMAL(6,2),
  cost_per_listen DECIMAL(6,2),
  value_tier ENUM('high_value', 'medium_value', 'low_value', 'negative_value'),

  UNIQUE KEY unique_user_month (telegram_id, month_start),
  FOREIGN KEY (telegram_id) REFERENCES radio_users(telegram_id),
  INDEX idx_month (month_start),
  INDEX idx_value_tier (value_tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Cost Calculation Queries

### Daily Cost Summary
```sql
-- Generate daily cost snapshot
INSERT INTO daily_cost_snapshots (
  snapshot_date,
  songs_generated,
  songs_completed,
  songs_failed,
  total_cost,
  cost_per_completed,
  unique_users,
  total_upvotes,
  completion_rate,
  waste_rate,
  roi_score
)
SELECT
  CURDATE() as snapshot_date,
  COUNT(*) as songs_generated,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as songs_completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as songs_failed,
  COUNT(*) * 0.50 as total_cost,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) * 0.50 / NULLIF(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0) as cost_per_completed,
  COUNT(DISTINCT telegram_id) as unique_users,
  COALESCE(SUM(upvotes), 0) as total_upvotes,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*) * 100 as completion_rate,
  (COUNT(CASE WHEN status = 'failed' THEN 1 END) + COUNT(CASE WHEN upvotes = 0 THEN 1 END)) / COUNT(*) * 100 as waste_rate,
  COALESCE(SUM(upvotes), 0) / (COUNT(*) * 0.50) as roi_score
FROM radio_history
WHERE DATE(created_at) = CURDATE();
```

### Month-to-Date Spending
```sql
-- Calculate MTD costs and projections
SELECT
  COUNT(*) as songs_generated,
  COUNT(*) * 0.50 as spent_so_far,

  -- Projection to month end
  (COUNT(*) * 0.50) / DAY(NOW()) * DAY(LAST_DAY(NOW())) as projected_monthly_cost,

  -- Daily burn rate
  (COUNT(*) * 0.50) / DAY(NOW()) as avg_daily_burn,

  -- Engagement ROI
  COALESCE(SUM(upvotes), 0) as total_upvotes,
  (COUNT(*) * 0.50) / NULLIF(SUM(upvotes), 0) as cost_per_upvote,

  -- Days remaining in month
  DAY(LAST_DAY(NOW())) - DAY(NOW()) as days_remaining,

  -- Budget status (assuming $500/month budget)
  500 - (COUNT(*) * 0.50) as budget_remaining,
  ((COUNT(*) * 0.50) / 500) * 100 as budget_used_percent

FROM radio_history
WHERE YEAR(created_at) = YEAR(NOW())
  AND MONTH(created_at) = MONTH(NOW());
```

### Cost by User Tier
```sql
-- Compare cost efficiency by user tier
SELECT
  ru.tier,
  COUNT(DISTINCT rh.telegram_id) as users,
  COUNT(*) as songs_generated,
  COUNT(*) * 0.50 as total_cost,
  (COUNT(*) * 0.50) / COUNT(DISTINCT rh.telegram_id) as cost_per_user,
  COALESCE(SUM(rh.upvotes), 0) as total_upvotes,
  (COUNT(*) * 0.50) / NULLIF(SUM(rh.upvotes), 0) as cost_per_upvote,
  COALESCE(SUM(rh.upvotes), 0) / COUNT(*) as avg_upvotes_per_song
FROM radio_history rh
JOIN radio_users ru ON rh.telegram_id = ru.telegram_id
WHERE rh.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ru.tier
ORDER BY cost_per_upvote ASC;
```

### Identify High-Cost, Low-Value Users
```sql
-- Find users with poor cost efficiency
CREATE OR REPLACE VIEW cost_inefficient_users AS
SELECT
  ru.telegram_id,
  ru.username,
  ru.tier,
  COUNT(*) as songs_requested,
  COUNT(*) * 0.50 as total_cost,
  COALESCE(SUM(rh.upvotes), 0) as total_upvotes,
  COALESCE(AVG(rh.upvotes), 0) as avg_upvotes,

  -- Cost efficiency
  (COUNT(*) * 0.50) / NULLIF(SUM(rh.upvotes), 0) as cost_per_upvote,

  -- Waste metrics
  COUNT(CASE WHEN rh.upvotes = 0 THEN 1 END) as zero_upvote_songs,
  COUNT(CASE WHEN rh.upvotes = 0 THEN 1 END) / COUNT(*) * 100 as waste_percentage,

  -- Value classification
  CASE
    WHEN COALESCE(SUM(rh.upvotes), 0) = 0 THEN 'negative_value'
    WHEN (COUNT(*) * 0.50) / NULLIF(SUM(rh.upvotes), 0) > 0.50 THEN 'low_value'
    WHEN (COUNT(*) * 0.50) / NULLIF(SUM(rh.upvotes), 0) > 0.25 THEN 'medium_value'
    ELSE 'high_value'
  END as value_tier

FROM radio_users ru
JOIN radio_history rh ON ru.telegram_id = rh.telegram_id
WHERE rh.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ru.telegram_id
HAVING songs_requested >= 5  -- Minimum threshold for analysis
ORDER BY cost_per_upvote DESC;
```

## Budget Alerts and Thresholds

### Automated Budget Monitoring
```sql
-- Stored procedure for budget checking
DELIMITER //
CREATE PROCEDURE check_budget_status(
  IN monthly_budget DECIMAL(10,2),
  OUT current_spend DECIMAL(10,2),
  OUT projected_spend DECIMAL(10,2),
  OUT budget_remaining DECIMAL(10,2),
  OUT alert_level ENUM('normal', 'warning', 'critical', 'exceeded')
)
BEGIN
  DECLARE days_in_month INT;
  DECLARE days_elapsed INT;
  DECLARE daily_burn DECIMAL(10,2);

  -- Calculate days
  SET days_in_month = DAY(LAST_DAY(NOW()));
  SET days_elapsed = DAY(NOW());

  -- Get current spend for month
  SELECT COUNT(*) * 0.50 INTO current_spend
  FROM radio_history
  WHERE YEAR(created_at) = YEAR(NOW())
    AND MONTH(created_at) = MONTH(NOW());

  -- Calculate daily burn and projection
  SET daily_burn = current_spend / days_elapsed;
  SET projected_spend = daily_burn * days_in_month;
  SET budget_remaining = monthly_budget - current_spend;

  -- Determine alert level
  IF current_spend >= monthly_budget THEN
    SET alert_level = 'exceeded';
  ELSEIF projected_spend >= monthly_budget * 0.95 THEN
    SET alert_level = 'critical';
  ELSEIF projected_spend >= monthly_budget * 0.80 THEN
    SET alert_level = 'warning';
  ELSE
    SET alert_level = 'normal';
  END IF;
END//
DELIMITER ;
```

### Daily Budget Alert
```sql
-- Check if daily spending exceeds target
SET @daily_budget = 500 / DAY(LAST_DAY(NOW()));  -- Assumes $500 monthly budget

SELECT
  CURDATE() as date,
  COUNT(*) * 0.50 as actual_spend,
  @daily_budget as daily_budget,
  (COUNT(*) * 0.50) - @daily_budget as variance,
  CASE
    WHEN (COUNT(*) * 0.50) > @daily_budget * 1.5 THEN 'CRITICAL'
    WHEN (COUNT(*) * 0.50) > @daily_budget * 1.2 THEN 'WARNING'
    ELSE 'NORMAL'
  END as alert_status
FROM radio_history
WHERE DATE(created_at) = CURDATE();
```

## Cost Optimization Strategies

### Strategy 1: Adjust Daily Limits
```sql
-- Calculate optimal daily limits based on budget
DELIMITER //
CREATE PROCEDURE calculate_optimal_limits(
  IN monthly_budget DECIMAL(10,2),
  IN target_users INT
)
BEGIN
  DECLARE max_monthly_songs INT;
  DECLARE max_daily_songs INT;
  DECLARE suggested_free_limit INT;
  DECLARE suggested_premium_limit INT;

  -- Calculate max songs from budget
  SET max_monthly_songs = FLOOR(monthly_budget / 0.50);
  SET max_daily_songs = FLOOR(max_monthly_songs / 30);

  -- Distribute across user tiers (70% free, 30% premium)
  SET suggested_free_limit = FLOOR((max_daily_songs * 0.70) / (target_users * 0.80));
  SET suggested_premium_limit = suggested_free_limit * 4;  -- 4x multiplier

  SELECT
    monthly_budget as monthly_budget,
    max_monthly_songs as max_songs_per_month,
    max_daily_songs as max_songs_per_day,
    suggested_free_limit as recommended_free_limit,
    suggested_premium_limit as recommended_premium_limit,
    CONCAT('With ', target_users, ' users, free tier gets ', suggested_free_limit, ' songs/day, premium gets ', suggested_premium_limit) as summary;
END//
DELIMITER ;

-- Example usage
CALL calculate_optimal_limits(500, 100);  -- $500 budget, 100 users
```

### Strategy 2: Peak/Off-Peak Pricing
```sql
-- Implement dynamic limits based on time of day
CREATE TABLE dynamic_rate_limits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hour_start INT,
  hour_end INT,
  tier ENUM('free', 'premium', 'admin'),
  daily_limit INT,
  description VARCHAR(255),

  INDEX idx_hour (hour_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Off-peak (2am-6am): Higher limits to utilize capacity
INSERT INTO dynamic_rate_limits VALUES
(1, 2, 6, 'free', 8, 'Off-peak bonus (2x normal)'),
(2, 2, 6, 'premium', 30, 'Off-peak bonus');

-- Peak (6pm-10pm): Reduced limits to control costs
INSERT INTO dynamic_rate_limits VALUES
(3, 18, 22, 'free', 3, 'Peak hours (reduced)'),
(4, 18, 22, 'premium', 15, 'Peak hours (reduced)');
```

### Strategy 3: Genre Cost Efficiency
```sql
-- Identify which genres provide best ROI
SELECT
  genre,
  COUNT(*) as songs_generated,
  COUNT(*) * 0.50 as total_cost,
  AVG(upvotes) as avg_upvotes,
  (COUNT(*) * 0.50) / NULLIF(SUM(upvotes), 0) as cost_per_upvote,
  CASE
    WHEN (COUNT(*) * 0.50) / NULLIF(SUM(upvotes), 0) < 0.10 THEN 'Promote'
    WHEN (COUNT(*) * 0.50) / NULLIF(SUM(upvotes), 0) > 0.50 THEN 'Discourage'
    ELSE 'Maintain'
  END as recommendation
FROM radio_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY genre
ORDER BY cost_per_upvote ASC;
```

## Cost Dashboard Queries

### Executive Summary
```sql
-- High-level cost overview
SELECT
  -- Current month
  (SELECT COUNT(*) FROM radio_history WHERE MONTH(created_at) = MONTH(NOW())) as mtd_songs,
  (SELECT COUNT(*) * 0.50 FROM radio_history WHERE MONTH(created_at) = MONTH(NOW())) as mtd_cost,

  -- Last 30 days
  (SELECT COUNT(*) FROM radio_history WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as l30d_songs,
  (SELECT COUNT(*) * 0.50 FROM radio_history WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as l30d_cost,

  -- Yesterday vs Today
  (SELECT COUNT(*) FROM radio_history WHERE DATE(created_at) = CURDATE()) as today_songs,
  (SELECT COUNT(*) * 0.50 FROM radio_history WHERE DATE(created_at) = CURDATE()) as today_cost,
  (SELECT COUNT(*) FROM radio_history WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)) as yesterday_songs,

  -- Projections
  (SELECT COUNT(*) * 0.50 FROM radio_history WHERE MONTH(created_at) = MONTH(NOW())) / DAY(NOW()) * DAY(LAST_DAY(NOW())) as projected_monthly_cost,

  -- ROI
  (SELECT SUM(upvotes) FROM radio_history WHERE MONTH(created_at) = MONTH(NOW())) / NULLIF((SELECT COUNT(*) * 0.50 FROM radio_history WHERE MONTH(created_at) = MONTH(NOW())), 0) as mtd_upvotes_per_dollar;
```

## Examples

### Example 1: Budget Overrun Alert
Current spend: $487, projected: $612 (monthly budget: $500)

Analysis:
- Daily burn rate: $28.70 (target: $16.67)
- Projected overage: $112 (22% over budget)
- Recommendation: Reduce free tier limit from 5 to 3 songs/day
- Alternative: Pause admin unlimited access during peak hours

### Example 2: Cost-Inefficient User Cleanup
Identify users with cost_per_upvote >$1.00:
- User @spammer: 50 songs, 2 upvotes = $25/upvote
- Action: Reduce daily limit to 1 song, warn about quality
- Potential savings: $24/day if behavior continues

### Example 3: Genre Optimization
EDM: $0.08/upvote (excellent ROI) → Promote
Classical: $0.45/upvote (poor ROI) → Reduce or improve quality

Recommendation: Cap classical requests at 10% of daily volume

## Best Practices

- **Set realistic budgets**: Base on user growth and engagement targets
- **Monitor daily**: Catch overspending early, not at month-end
- **Track ROI, not just cost**: $100 with 500 upvotes > $50 with 50 upvotes
- **Adjust limits dynamically**: Respond to usage patterns in real-time
- **Identify waste early**: Zero-upvote songs = wasted $0.50
- **Value retention over acquisition**: Keep high-value users happy
- **Use off-peak capacity**: Incentivize late-night requests
- **Test limit changes**: A/B test impact before full rollout
- **Communicate clearly**: Users understand reasonable limits
- **Balance cost and growth**: Don't over-optimize and kill engagement

## Integration Points

- **User Behavior Predictor**: Target cost-reduction at low-value users
- **Queue Optimizer**: Batch processing reduces API waste
- **Broadcast Analytics**: Correlate spending with engagement
- **Monitoring Alerts**: Telegram notifications for budget breaches
