---
name: social-media-performance-tracker
description: Tracks Instagram, TikTok, and Twitter engagement metrics for audiogram posts. Analyzes views, likes, shares, comments, follower growth, and viral patterns. Use when measuring social media ROI, optimizing posting strategy, or analyzing content performance.
---

# Social Media Performance Tracker

Comprehensive analytics for audiogram and video content across Instagram Reels, TikTok, and Twitter.

## Instructions

When tracking social media performance:

1. **Platform-Specific Metrics**
   - **Instagram Reels**: Views, likes, comments, shares, saves, reach, impressions
   - **TikTok**: Views, likes, comments, shares, favorites, watch time, completion rate
   - **Twitter**: Views, likes, retweets, replies, quote tweets, engagement rate
   - Track metrics at 1hr, 24hr, 7day, 30day intervals

2. **Engagement Rate Calculations**
   - **Instagram**: `(Likes + Comments + Shares + Saves) / Reach * 100`
   - **TikTok**: `(Likes + Comments + Shares) / Views * 100`
   - **Twitter**: `(Likes + Retweets + Replies) / Impressions * 100`
   - Benchmark: Good = 3-5%, Great = 5-10%, Viral = >10%

3. **Content Performance Analysis**
   - Compare performance by genre, artist, time posted
   - Identify top-performing songs and patterns
   - Track hashtag effectiveness
   - Measure caption impact on engagement
   - Analyze thumbnail/cover image effectiveness

4. **Follower Growth Tracking**
   - Daily/weekly/monthly follower changes
   - Follower acquisition cost (ad spend / new followers)
   - Follower demographics (age, location, interests)
   - Follower churn rate and retention
   - Track which posts drive most follows

5. **Viral Content Detection**
   - Identify posts exceeding 3x average engagement
   - Track share velocity (shares per hour in first 24hrs)
   - Monitor comment sentiment and trends
   - Detect influencer shares and amplification
   - Measure cross-platform viral spread

## Database Schema

### Social Media Posts Tracking
```sql
CREATE TABLE social_media_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  song_id INT,
  platform ENUM('instagram', 'tiktok', 'twitter'),
  post_url VARCHAR(500),
  posted_at DATETIME,

  -- Content details
  caption TEXT,
  hashtags JSON,  -- Array of hashtags used
  thumbnail_url VARCHAR(500),
  video_duration_sec INT,

  -- Engagement metrics (updated periodically)
  views BIGINT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,  -- Instagram only
  watch_time_minutes INT DEFAULT 0,  -- TikTok only

  -- Derived metrics
  engagement_rate DECIMAL(5,2),
  completion_rate DECIMAL(5,2),  -- TikTok: % who watched to end
  virality_score DECIMAL(5,2),  -- Engagement vs account average

  -- Cost tracking
  promotion_spend DECIMAL(10,2) DEFAULT 0,
  cpm DECIMAL(6,2),  -- Cost per 1000 impressions
  cpe DECIMAL(6,2),  -- Cost per engagement

  last_updated DATETIME,

  FOREIGN KEY (song_id) REFERENCES radio_history(id),
  INDEX idx_platform (platform),
  INDEX idx_posted_at (posted_at),
  INDEX idx_engagement_rate (engagement_rate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Follower Growth Tracking
```sql
CREATE TABLE follower_snapshots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  platform ENUM('instagram', 'tiktok', 'twitter'),
  snapshot_date DATE,
  follower_count INT,
  following_count INT,
  post_count INT,
  avg_engagement_rate DECIMAL(5,2),

  -- Daily changes
  followers_gained INT,
  followers_lost INT,
  net_growth INT,

  UNIQUE KEY unique_snapshot (platform, snapshot_date),
  INDEX idx_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## API Integration

### Instagram Graph API - Get Insights
```javascript
// Get Reel insights
const getInstagramInsights = async (mediaId, accessToken) => {
  const metrics = 'impressions,reach,likes,comments,shares,saves,plays,total_interactions';
  const url = `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`;

  const response = await fetch(url);
  const data = await response.json();

  return {
    impressions: data.data.find(m => m.name === 'impressions').values[0].value,
    reach: data.data.find(m => m.name === 'reach').values[0].value,
    likes: data.data.find(m => m.name === 'likes').values[0].value,
    // ... parse other metrics
  };
};
```

### TikTok API - Video Analytics
```javascript
// Get video analytics
const getTikTokAnalytics = async (videoId, accessToken) => {
  const fields = 'view_count,like_count,comment_count,share_count,play_duration_average';
  const url = `https://open.tiktokapis.com/v2/research/video/query/?fields=${fields}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ video_ids: [videoId] })
  });

  return await response.json();
};
```

### Twitter API v2 - Tweet Metrics
```javascript
// Get tweet metrics
const getTwitterMetrics = async (tweetId, bearerToken) => {
  const fields = 'public_metrics,non_public_metrics,organic_metrics';
  const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=${fields}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${bearerToken}` }
  });

  const data = await response.json();
  return data.data.public_metrics;  // { like_count, retweet_count, ... }
};
```

## Analytics Queries

### Top Performing Posts by Platform
```sql
SELECT
  platform,
  song_id,
  s.title,
  s.genre,
  views,
  likes,
  shares,
  engagement_rate,
  (likes + comments + shares) / NULLIF(views, 0) * 100 as calculated_engagement
FROM social_media_posts smp
JOIN radio_history s ON smp.song_id = s.id
WHERE posted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY engagement_rate DESC
LIMIT 20;
```

### Genre Performance Across Platforms
```sql
SELECT
  s.genre,
  smp.platform,
  COUNT(*) as posts,
  AVG(smp.views) as avg_views,
  AVG(smp.engagement_rate) as avg_engagement,
  SUM(smp.shares) as total_shares
FROM social_media_posts smp
JOIN radio_history s ON smp.song_id = s.id
WHERE smp.posted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY s.genre, smp.platform
ORDER BY avg_engagement DESC;
```

### Optimal Posting Time Analysis
```sql
SELECT
  HOUR(posted_at) as post_hour,
  DAYOFWEEK(posted_at) as day_of_week,
  platform,
  COUNT(*) as posts,
  AVG(engagement_rate) as avg_engagement,
  AVG(views) as avg_views
FROM social_media_posts
WHERE posted_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY HOUR(posted_at), DAYOFWEEK(posted_at), platform
HAVING posts >= 5  -- Minimum sample size
ORDER BY avg_engagement DESC;
```

### Viral Content Detection
```sql
-- Posts performing 3x above average
WITH account_avg AS (
  SELECT platform, AVG(engagement_rate) as avg_engagement
  FROM social_media_posts
  WHERE posted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  GROUP BY platform
)
SELECT
  smp.*,
  s.title,
  s.genre,
  aa.avg_engagement,
  smp.engagement_rate / aa.avg_engagement as performance_multiplier
FROM social_media_posts smp
JOIN radio_history s ON smp.song_id = s.id
JOIN account_avg aa ON smp.platform = aa.platform
WHERE smp.engagement_rate >= aa.avg_engagement * 3
ORDER BY performance_multiplier DESC;
```

## A/B Testing Framework

### Thumbnail Variations
```sql
-- Track different thumbnail styles
ALTER TABLE social_media_posts
ADD COLUMN thumbnail_style ENUM('waveform', 'album_art', 'text_overlay', 'dancing_bars', 'minimal');

-- Compare performance
SELECT
  thumbnail_style,
  COUNT(*) as posts,
  AVG(engagement_rate) as avg_engagement,
  AVG(views) as avg_views,
  AVG(saves) as avg_saves
FROM social_media_posts
WHERE platform = 'instagram'
  AND posted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY thumbnail_style
ORDER BY avg_engagement DESC;
```

### Caption Testing
```sql
-- Test caption lengths
SELECT
  CASE
    WHEN LENGTH(caption) < 50 THEN 'Short (<50 chars)'
    WHEN LENGTH(caption) BETWEEN 50 AND 150 THEN 'Medium (50-150)'
    ELSE 'Long (>150 chars)'
  END as caption_length,
  platform,
  AVG(engagement_rate) as avg_engagement,
  AVG(comments) as avg_comments
FROM social_media_posts
WHERE posted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY caption_length, platform;
```

### Hashtag Effectiveness
```sql
-- Analyze hashtag performance
SELECT
  hashtag,
  COUNT(*) as times_used,
  AVG(engagement_rate) as avg_engagement,
  AVG(reach) as avg_reach
FROM social_media_posts,
JSON_TABLE(
  hashtags,
  '$[*]' COLUMNS (hashtag VARCHAR(100) PATH '$')
) as jt
WHERE platform = 'instagram'
  AND posted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY hashtag
HAVING times_used >= 3
ORDER BY avg_engagement DESC;
```

## Examples

### Example 1: Weekly Performance Report
User: "Show me this week's social media performance"

Generate report showing:
- Total views, likes, shares across all platforms
- Platform comparison (which performed best)
- Top 5 performing songs
- Engagement rate trends (up/down from last week)
- Follower growth per platform
- Best posting times identified

### Example 2: Identify Viral Candidates
User: "Which posts are going viral?"

Query for:
- Posts with engagement >3x account average
- Rapid share velocity (shares per hour)
- High completion rates (TikTok)
- Cross-platform performance (same song trending on multiple platforms)
- Suggest boosting with paid promotion

### Example 3: Optimize Posting Strategy
User: "When should we post for maximum engagement?"

Analyze:
- Best hours by platform and day of week
- Audience active times
- Competitor posting patterns
- Genre-specific optimal times (EDM vs Classical)
- Create automated posting schedule

## Best Practices

- **Update metrics regularly**: Fetch every 1hr for first 24hrs, then daily
- **Track full lifecycle**: 1hr, 24hr, 7day, 30day performance curves
- **Compare across platforms**: Same song's relative performance
- **Monitor algorithm changes**: Sudden drops may indicate platform updates
- **Test systematically**: Change one variable at a time (hashtags, caption, time)
- **Respond to comments**: Boosts engagement algorithm signals
- **Cross-promote**: Share TikTok on Twitter, Instagram stories
- **Archive top performers**: Repost successful content after 90 days
- **Track competitor benchmarks**: How do similar accounts perform?
- **Calculate true ROI**: Factor in Suno costs + time vs engagement value

## Integration Points

- **Broadcast Analytics**: Correlate radio upvotes with social shares
- **Cost Optimization**: Calculate social media CAC vs direct listeners
- **Content Moderation**: Flag posts with negative comments/reports
- **User Behavior Predictor**: Identify social followers who become radio users
