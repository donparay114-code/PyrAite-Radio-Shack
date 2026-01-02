---
name: broadcast-analytics-specialist
description: Analyzes radio station listener engagement, genre popularity, time-slot performance, and content ROI. Use when tracking listener patterns, measuring playlist effectiveness, analyzing upvotes/skips, or optimizing broadcast scheduling.
---

# Broadcast Analytics Specialist

Comprehensive analytics for AI Community Radio Station performance tracking and optimization.

## Instructions

When analyzing broadcast performance:

1. **Listener Engagement Patterns**
   - Query `listener_stats` table for engagement metrics
   - Analyze upvotes, skips, favorites by time slot
   - Calculate engagement rates (upvotes / total plays)
   - Identify peak listening hours and patterns
   - Track user retention over time

2. **Genre Performance Analysis**
   - Use `genre_performance` view for popularity metrics
   - Calculate genre distribution across time slots
   - Measure average engagement by genre
   - Identify trending vs declining genres
   - Compare requested vs actually played genres

3. **Time Slot Optimization**
   - Analyze playlist effectiveness per time slot (morning/afternoon/evening/night)
   - Measure average wait times by hour
   - Track queue depth patterns throughout day
   - Calculate optimal posting times for social media
   - Identify underutilized time slots

4. **Content ROI Analysis**
   - Calculate cost per engagement ($0.50 per song / upvotes)
   - Measure cost per unique listener
   - Track monthly spend efficiency trends
   - Identify high-value vs low-value content
   - Compare user tier profitability (free vs premium)

5. **Playlist Effectiveness**
   - Measure skip rates by position in playlist
   - Analyze energy arc adherence (rise/fall patterns)
   - Track repeat listen rates
   - Calculate playlist completion rates
   - Identify optimal playlist lengths

## Key Metrics to Track

### Engagement Metrics
- **Engagement Rate**: `(upvotes + favorites) / total_plays`
- **Skip Rate**: `skips / total_plays`
- **Repeat Listen Rate**: `COUNT(DISTINCT song_id) / COUNT(*) WHERE user_id = X`
- **Active User Rate**: Users with activity in last 7/30 days

### Performance Metrics
- **Average Wait Time**: From request to broadcast
- **Queue Processing Rate**: Songs per hour
- **Success Rate**: Completed / Total requests
- **Peak Capacity**: Max concurrent requests handled

### Cost Metrics
- **Cost Per Engagement**: `total_cost / (upvotes + favorites)`
- **Cost Per Listener**: `daily_cost / unique_listeners`
- **ROI by Genre**: `engagement_value / generation_cost`
- **Budget Burn Rate**: Daily/weekly spending trends

## Database Queries

### Top Performing Time Slots
```sql
SELECT
  HOUR(played_at) as hour,
  COUNT(*) as songs_played,
  SUM(upvotes) as total_upvotes,
  AVG(upvotes) as avg_upvotes,
  SUM(upvotes) / COUNT(*) as engagement_rate
FROM radio_history
WHERE played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY HOUR(played_at)
ORDER BY engagement_rate DESC;
```

### Genre Popularity Trends
```sql
SELECT
  genre,
  COUNT(*) as requests,
  AVG(priority_score) as avg_priority,
  SUM(upvotes) as total_engagement
FROM radio_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY genre
ORDER BY total_engagement DESC;
```

### Cost Efficiency Analysis
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) * 0.50 as daily_cost,
  SUM(upvotes) as total_upvotes,
  (COUNT(*) * 0.50) / NULLIF(SUM(upvotes), 0) as cost_per_upvote
FROM radio_history
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Examples

### Example 1: Analyze Peak Listening Hours
User asks: "When are listeners most engaged?"

Query listener_stats and radio_history to find:
- Hours with highest upvote rates
- Days with most active listeners
- Correlation between queue depth and engagement

### Example 2: Genre Performance Report
User asks: "Which genres perform best?"

Generate report showing:
- Top 5 genres by engagement rate
- Genre distribution over time
- Underperforming genres to reduce
- Emerging genre trends

### Example 3: Content ROI Dashboard
User asks: "What's our cost per engagement?"

Calculate:
- Total spend vs total upvotes
- Cost per listener acquisition
- ROI by user tier (free vs premium)
- Budget projections based on trends

## Best Practices

- Always use 7-day, 30-day, and all-time comparisons
- Calculate percentage changes week-over-week
- Visualize trends with ASCII charts when possible
- Provide actionable recommendations based on data
- Consider seasonal patterns and special events
- Cross-reference multiple metrics for deeper insights
- Flag anomalies and unexpected patterns
- Track leading indicators (queue depth → engagement)

## Output Format

Provide analytics in structured format:
1. **Executive Summary**: Key findings in 2-3 bullets
2. **Detailed Metrics**: Tables with current vs historical data
3. **Trends**: Week-over-week and month-over-month changes
4. **Insights**: What the data reveals about listener behavior
5. **Recommendations**: Specific actions to improve performance
