# Radio Station Cost Optimization Advisor

**Purpose**: Monitor and optimize costs for multi-channel AI radio station across AWS, third-party APIs (Suno, Claude, OpenAI), and operational expenses.

**When to invoke**: Monthly cost reviews, budget exceeded alerts, scaling decisions, API cost spikes, infrastructure optimization planning.

## Cost Breakdown (Production Scale)

### Current Costs at Different Scales

**1,000 Daily Active Users:**
| Service | Monthly Cost | Optimization Potential |
|---------|--------------|------------------------|
| RDS PostgreSQL (db.t3.medium Multi-AZ) | $110 | ⭐ Reserved Instances (-40%) |
| ElastiCache Redis (cache.t3.small) | $35 | ⭐ Reserved Instances (-37%) |
| S3 Storage (500GB) | $12 | ⭐⭐ Intelligent-Tiering (-30%) |
| CloudFront (2TB) | $170 | ⭐⭐⭐ Regional pricing (-15%) |
| EC2 Liquidsoap (t3.medium) | $30 | ⭐ Spot Instances (-70%) |
| ECS n8n (3 tasks) | $45 | ⭐ Fargate Spot (-50%) |
| Suno API (10,000 generations) | $150 | ⭐⭐⭐ Batching + caching (-20%) |
| Claude AI (moderation) | $30 | ⭐⭐ Model optimization (-40%) |
| OpenAI (moderation) | $15 | ⭐ Caching (-25%) |
| WhatsApp (5,000 conversations) | $25 | - No optimization |
| **TOTAL** | **$622/month** | **Potential savings: ~$180/month** |

**10,000 Daily Active Users:**
| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| RDS PostgreSQL (db.r5.large Multi-AZ) | $430 | Needs read replicas |
| ElastiCache Redis (cache.r5.large) | $210 | Cluster mode |
| S3 Storage (5TB) | $115 | Lifecycle policies critical |
| CloudFront (20TB) | $1,400 | Consider regional caching |
| EC2 Liquidsoap (c5.xlarge) | $125 | Auto-scaling group |
| ECS n8n (8 tasks) | $120 | Queue mode essential |
| Suno API (100,000 generations) | $1,500 | Negotiate volume pricing |
| Claude AI | $200 | Bulk usage tier |
| OpenAI | $80 | Bulk usage tier |
| WhatsApp (50,000 conversations) | $210 | - |
| **TOTAL** | **$4,390/month** | |

## Optimization Strategies

### 1. AWS Reserved Instances
```bash
# RDS Reserved Instance (1-year, no upfront) - Save 40%
aws rds purchase-reserved-db-instances-offering \
  --reserved-db-instances-offering-id offering-12345 \
  --db-instance-count 1 \
  --reservation-id radio-db-reserved

# ElastiCache Reserved Node (1-year) - Save 37%
aws elasticache purchase-reserved-cache-nodes-offering \
  --reserved-cache-nodes-offering-id offering-67890 \
  --cache-node-count 1

# Calculate savings
CURRENT_RDS_COST=110
RESERVED_RDS_COST=$(echo "$CURRENT_RDS_COST * 0.6" | bc)
echo "Monthly savings: \$$(echo "$CURRENT_RDS_COST - $RESERVED_RDS_COST" | bc)"
```

### 2. S3 Intelligent-Tiering
```json
// lifecycle-policy.json
{
  "Rules": [
    {
      "Id": "Auto-archive-audio",
      "Status": "Enabled",
      "Filter": { "Prefix": "audio/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "INTELLIGENT_TIERING"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        }
      ]
    },
    {
      "Id": "Delete-old-HLS",
      "Status": "Enabled",
      "Filter": { "Prefix": "hls/" },
      "Expiration": { "Days": 1 }
    },
    {
      "Id": "Delete-temp-files",
      "Status": "Enabled",
      "Filter": { "Prefix": "temp/" },
      "Expiration": { "Days": 7 }
    }
  ]
}
```

```bash
# Apply lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket radio-audio-bucket \
  --lifecycle-configuration file://lifecycle-policy.json

# Monitor storage class distribution
aws s3api list-objects-v2 --bucket radio-audio-bucket --prefix audio/ \
  --query 'Contents[].{Key:Key,StorageClass:StorageClass,Size:Size}' \
  --output table
```

### 3. CloudFront Cost Reduction
```bash
# Enable compression (reduce bandwidth 60-80%)
aws cloudfront update-distribution --id DISTRIBUTION_ID --distribution-config '{
  "DefaultCacheBehavior": {
    "Compress": true,
    "...": "other settings"
  }
}'

# Use CloudFront Security Savings Bundle (save 30%)
# Dashboard → CloudFront → Purchase Security Savings Bundle

# Regional pricing class (exclude expensive regions)
aws cloudfront update-distribution --id DISTRIBUTION_ID --distribution-config '{
  "PriceClass": "PriceClass_100",  // USA, Canada, Europe only
  "...": "other settings"
}'

# Calculate savings
CURRENT_CDN_COST=170
COMPRESSION_SAVINGS=$(echo "$CURRENT_CDN_COST * 0.30" | bc)
REGIONAL_SAVINGS=$(echo "$CURRENT_CDN_COST * 0.15" | bc)
echo "Estimated monthly savings: \$$(echo "$COMPRESSION_SAVINGS + $REGIONAL_SAVINGS" | bc)"
```

### 4. EC2 Spot Instances for Liquidsoap
```bash
# Launch Spot Instance (save 70%)
aws ec2 request-spot-instances \
  --instance-count 1 \
  --type "persistent" \
  --launch-specification '{
    "ImageId": "ami-liquidsoap-backup",
    "InstanceType": "t3.medium",
    "KeyName": "radio-key",
    "SecurityGroupIds": ["sg-12345"],
    "UserData": "#!/bin/bash\nsudo systemctl start liquidsoap"
  }'

# Spot Instance interruption handling (save state before termination)
cat > /usr/local/bin/spot-termination-handler.sh << 'EOF'
#!/bin/bash
while true; do
  if curl -s http://169.254.169.254/latest/meta-data/spot/instance-action | grep -q terminate; then
    # Save current state
    echo "list" | nc localhost 1234 > /tmp/liquidsoap-state.txt
    aws s3 cp /tmp/liquidsoap-state.txt s3://radio-backup/liquidsoap-state-$(date +%s).txt
    # Graceful shutdown
    sudo systemctl stop liquidsoap
    break
  fi
  sleep 5
done
EOF
chmod +x /usr/local/bin/spot-termination-handler.sh
```

### 5. Suno API Cost Optimization
```javascript
// n8n workflow: Batch similar requests
const requests = $input.all();

// Group by genre and priority
const batches = requests.reduce((acc, req) => {
  const key = `${req.json.genre}_${req.json.priority}`;
  if (!acc[key]) acc[key] = [];
  acc[key].push(req);
  return acc;
}, {});

// Submit batches (Suno may offer bulk pricing)
const results = [];
for (const [key, batch] of Object.entries(batches)) {
  if (batch.length >= 5) {
    // Use batch API endpoint (hypothetical)
    const response = await $this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.sunoapi.org/api/generate_batch',
      body: {
        requests: batch.map(r => ({
          prompt: r.json.prompt,
          make_instrumental: false
        })),
        callback_url: process.env.BATCH_CALLBACK_URL
      }
    });
    results.push(...response.tasks);
  } else {
    // Individual requests for small batches
    for (const req of batch) {
      const response = await $this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.sunoapi.org/api/generate',
        body: { prompt: req.json.prompt }
      });
      results.push(response);
    }
  }
}

return results.map(r => ({ json: r }));
```

**Caching Strategy:**
```sql
-- Cache similar prompts (prevent duplicate generations)
CREATE TABLE prompt_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash VARCHAR(64) UNIQUE,  -- MD5 of normalized prompt
  original_prompt TEXT,
  audio_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reuse_count INT DEFAULT 0
);

-- Before calling Suno API
WITH normalized AS (
  SELECT MD5(LOWER(TRIM(?))) AS prompt_hash
)
SELECT audio_url, reuse_count
FROM prompt_cache pc
JOIN normalized n ON pc.prompt_hash = n.prompt_hash
WHERE pc.created_at > NOW() - INTERVAL '30 days';

-- If found, reuse audio_url and increment reuse_count
-- Estimated savings: 15-20% of Suno costs
```

### 6. Claude AI Moderation Optimization
```javascript
// Use cheaper models for simple checks
const complexity = analyzePromptComplexity(prompt);

let model = 'claude-haiku-3-5-20241022';  // Cheapest
if (complexity === 'medium') {
  model = 'claude-sonnet-4-20250514';  // Standard
} else if (complexity === 'high') {
  model = 'claude-opus-4-20241120';  // Most capable
}

// Reduce max_tokens for moderation (default 1024 → 100)
const response = await anthropic.messages.create({
  model: model,
  max_tokens: 100,  // Moderation needs short responses
  messages: [{
    role: 'user',
    content: moderationPrompt
  }]
});

// Cache common patterns
const cacheKey = `moderation:${hashPrompt(prompt)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Store result for 7 days
await redis.setex(cacheKey, 604800, JSON.stringify(result));
```

**Estimated savings:**
- Haiku vs Sonnet: 80% cheaper
- Max tokens reduction: 40% cheaper
- Caching hit rate 30%: Additional 30% savings
- **Total moderation cost reduction: ~60%**

### 7. OpenAI Moderation Caching
```javascript
// Cache moderation results
const promptHash = crypto.createHash('md5').update(prompt).digest('hex');
const cacheKey = `openai_mod:${promptHash}`;

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

// Call API if not cached
const moderation = await openai.moderations.create({ input: prompt });

// Cache for 14 days
await redis.setex(cacheKey, 1209600, JSON.stringify(moderation.results[0]));

// Estimated cache hit rate: 25-30%
// Savings: ~$4/month at current scale
```

## Cost Monitoring

### Daily Cost Alerts
```bash
# CloudWatch custom metric for Suno API costs
aws cloudwatch put-metric-data \
  --namespace Radio/Costs \
  --metric-name SunoAPICost \
  --value $(calculate_daily_suno_cost) \
  --timestamp $(date -u +%Y-%m-%dT%H:%M:%S)

# Alert if daily cost exceeds $20
aws cloudwatch put-metric-alarm \
  --alarm-name radio-suno-cost-spike \
  --metric-name SunoAPICost \
  --namespace Radio/Costs \
  --statistic Sum \
  --period 86400 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:cost-alerts
```

### Monthly Cost Report
```sql
-- Generate monthly cost breakdown
WITH monthly_costs AS (
  SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS total_generations,
    COUNT(*) * 0.015 AS suno_cost,
    SUM(CASE WHEN moderation_ai_used THEN 0.001 ELSE 0 END) AS claude_cost,
    SUM(CASE WHEN moderation_openai_used THEN 0.0002 ELSE 0 END) AS openai_cost
  FROM song_requests
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
  GROUP BY month
)
SELECT
  month,
  total_generations,
  suno_cost,
  claude_cost,
  openai_cost,
  (suno_cost + claude_cost + openai_cost) AS total_api_cost
FROM monthly_costs
ORDER BY month DESC;
```

### Cost Per User Analysis
```sql
-- Identify high-cost users
SELECT
  u.platform_username,
  COUNT(*) AS request_count,
  COUNT(*) * 0.015 AS estimated_suno_cost,
  u.is_premium,
  u.subscription_tier
FROM song_requests sr
JOIN users u ON sr.user_id = u.id
WHERE sr.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND sr.generation_status = 'completed'
GROUP BY u.id, u.platform_username, u.is_premium, u.subscription_tier
HAVING COUNT(*) > 50
ORDER BY request_count DESC
LIMIT 20;

-- Calculate cost per premium subscriber
SELECT
  subscription_tier,
  COUNT(DISTINCT u.id) AS subscriber_count,
  AVG(request_count) AS avg_requests_per_user,
  AVG(request_count) * 0.015 AS avg_cost_per_user,
  SUM(request_count) * 0.015 AS total_tier_cost
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*) AS request_count
  FROM song_requests
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
) sr ON sr.user_id = u.id
WHERE u.is_premium = true
GROUP BY subscription_tier;
```

## Budget Enforcement

### Rate Limit by Cost
```javascript
// n8n workflow: Block user if exceeding cost threshold
const userCost = await db.query(`
  SELECT COUNT(*) * 0.015 AS monthly_cost
  FROM song_requests
  WHERE user_id = ? AND created_at >= CURRENT_DATE - INTERVAL '30 days'
`, [userId]);

const costLimit = isPremium ? 50 : 5;  // $50 premium, $5 free

if (userCost.monthly_cost >= costLimit) {
  return [{
    json: {
      allowed: false,
      reason: `Monthly cost limit reached ($${costLimit})`,
      current_cost: userCost.monthly_cost
    }
  }];
}
```

### Circuit Breaker for API Costs
```javascript
// Stop Suno API calls if daily budget exceeded
const dailyBudget = 100;  // $100/day

const todayCost = await db.query(`
  SELECT COUNT(*) * 0.015 AS daily_cost
  FROM song_requests
  WHERE DATE(created_at) = CURRENT_DATE
    AND generation_status = 'completed'
`);

if (todayCost.daily_cost >= dailyBudget) {
  // Enable emergency mode: use cached/backup audio only
  await db.query(`
    UPDATE system_settings
    SET value = 'true'
    WHERE key = 'emergency_mode_enabled'
  `);

  // Alert admins
  await sendAlert({
    severity: 'CRITICAL',
    message: `Daily Suno budget exceeded: $${todayCost.daily_cost}`,
    action: 'Emergency mode enabled - using cached audio only'
  });
}
```

## Scaling Cost Projections

### Predictive Cost Modeling
```python
# cost_projection.py
import pandas as pd
from sklearn.linear_model import LinearRegression

# Historical data
data = pd.DataFrame({
    'dau': [500, 750, 1000, 1250, 1500],
    'total_cost': [310, 465, 622, 780, 935]
})

# Train model
model = LinearRegression()
model.fit(data[['dau']], data['total_cost'])

# Predict future costs
future_dau = [2000, 5000, 10000, 20000]
predictions = model.predict(pd.DataFrame({'dau': future_dau}))

for dau, cost in zip(future_dau, predictions):
    print(f"{dau} DAU: ${cost:.2f}/month")

# Calculate break-even point
revenue_per_user = 0.50  # Average revenue per DAU
for dau in future_dau:
    cost = model.predict([[dau]])[0]
    revenue = dau * revenue_per_user
    profit = revenue - cost
    print(f"{dau} DAU: Revenue ${revenue:.2f}, Cost ${cost:.2f}, Profit ${profit:.2f}")
```

## Recommended Actions

### Immediate (Week 1)
1. ✅ Enable S3 Intelligent-Tiering (save $4/month)
2. ✅ Implement prompt caching for Suno (save $30/month)
3. ✅ Use Claude Haiku for simple moderation (save $12/month)
4. ✅ Enable CloudFront compression (save $50/month)

### Short-term (Month 1)
1. ⭐ Purchase RDS Reserved Instance 1-year (save $44/month)
2. ⭐ Purchase ElastiCache Reserved Node 1-year (save $13/month)
3. ⭐ Migrate Liquidsoap to Spot Instance (save $21/month)
4. ⭐ Implement OpenAI moderation caching (save $4/month)

### Long-term (Quarter 1)
1. 🎯 Negotiate Suno volume pricing at 50k+ generations/month
2. 🎯 Implement CloudFront Security Savings Bundle (save $50/month)
3. 🎯 Optimize database queries to downgrade RDS (save $55/month)
4. 🎯 Build in-house moderation model to reduce AI API costs (-$30/month)

**Total potential savings: $183/month (29% reduction)**

## Cost Dashboard

### Grafana Panel Configuration
```json
{
  "panels": [
    {
      "title": "Monthly Cost Trend",
      "targets": [{
        "expr": "sum(rate(radio_api_cost_total[30d]))"
      }]
    },
    {
      "title": "Cost per User",
      "targets": [{
        "expr": "radio_api_cost_total / radio_active_users"
      }]
    },
    {
      "title": "API Cost Breakdown",
      "targets": [
        {"expr": "radio_suno_cost_total", "legendFormat": "Suno"},
        {"expr": "radio_claude_cost_total", "legendFormat": "Claude"},
        {"expr": "radio_openai_cost_total", "legendFormat": "OpenAI"}
      ]
    }
  ]
}
```

## Next Steps

1. Run cost analysis script weekly
2. Review AWS Cost Explorer monthly
3. Implement automated cost alerts
4. A/B test cheaper AI models
5. Monitor cache hit rates
6. Negotiate enterprise pricing with vendors at scale
