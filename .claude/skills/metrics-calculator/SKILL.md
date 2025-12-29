---
name: metrics-calculator
description: Use this skill for calculating engagement metrics (CTR, retention, engagement rate, save rate), performance metrics (response time, error rate, throughput, uptime), statistical analysis (mean, median, std dev, confidence intervals), and cost metrics (ROI, cost-per-request). Provides standardized formulas across all analytics and monitoring.
allowed-tools: [Bash, Read]
---

# Metrics Calculator

Standardized metric calculations for engagement, performance, statistics, and cost analysis.

## Engagement Metrics

### 1. Engagement Rate

**Formula:**
```
Engagement Rate = (Likes + Comments + Shares + Saves) / Views × 100
```

**Implementation:**
```javascript
function engagementRate(likes, comments, shares, saves, views) {
  if (views === 0) return 0;
  const totalEngagement = likes + comments + shares + saves;
  return (totalEngagement / views) * 100;
}
```

**Example:**
```javascript
// 500 likes, 50 comments, 30 shares, 20 saves, 10,000 views
engagementRate(500, 50, 30, 20, 10000)
// Returns: 6.0 (6% engagement rate)
```

**Performance Tiers:**
- **Viral:** >10%
- **High:** 5-10%
- **Good:** 3-5%
- **Average:** 1-3%
- **Low:** <1%

---

### 2. Click-Through Rate (CTR)

**Formula:**
```
CTR = (Clicks / Impressions) × 100
```

**Implementation:**
```javascript
function clickThroughRate(clicks, impressions) {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}
```

**Example:**
```javascript
clickThroughRate(450, 10000)
// Returns: 4.5 (4.5% CTR)
```

**Platform Benchmarks:**
- **YouTube Thumbnails:** 4-10% (good)
- **Google Ads:** 2-5% (average)
- **Facebook Ads:** 0.9-1.6% (average)
- **Email Marketing:** 2-5% (good)
- **Display Ads:** 0.05-0.1% (average)

---

### 3. Retention Rate

**Formula:**
```
Retention Rate = (Users at End - New Users) / Users at Start × 100
```

**Implementation:**
```javascript
function retentionRate(usersStart, usersEnd, newUsers) {
  if (usersStart === 0) return 0;
  return ((usersEnd - newUsers) / usersStart) * 100;
}
```

**Example:**
```javascript
// Started with 1000 users, ended with 950, gained 100 new
retentionRate(1000, 950, 100)
// Returns: 85 (85% retention rate)
```

**Video Retention:**
```javascript
function videoRetention(viewsAtTimestamp, totalViews) {
  if (totalViews === 0) return 0;
  return (viewsAtTimestamp / totalViews) * 100;
}

// 30s mark: 8000 viewers, started with 10000
videoRetention(8000, 10000)
// Returns: 80 (80% retention at 30s)
```

**Retention Benchmarks:**
- **First 30 seconds:** 70%+ (good)
- **50% of video:** 50%+ (good)
- **90% of video:** 30%+ (excellent)

---

### 4. Save Rate

**Formula:**
```
Save Rate = (Saves / Views) × 100
```

**Implementation:**
```javascript
function saveRate(saves, views) {
  if (views === 0) return 0;
  return (saves / views) * 100;
}
```

**Example:**
```javascript
saveRate(250, 10000)
// Returns: 2.5 (2.5% save rate)
```

**Benchmarks:**
- **Excellent:** >5%
- **Good:** 2-5%
- **Average:** 1-2%
- **Low:** <1%

---

### 5. Share Rate

**Formula:**
```
Share Rate = (Shares / Views) × 100
```

**Implementation:**
```javascript
function shareRate(shares, views) {
  if (views === 0) return 0;
  return (shares / views) * 100;
}
```

**Viral Coefficient:**
```javascript
function viralCoefficient(averageShares, conversionRate) {
  return averageShares * (conversionRate / 100);
}

// If average user shares with 5 people, 20% conversion
viralCoefficient(5, 20)
// Returns: 1.0 (viral threshold - each user brings 1 new user)
```

**Viral Thresholds:**
- **K > 1:** Viral (exponential growth)
- **K = 1:** Break-even
- **K < 1:** Decay

---

### 6. Conversion Rate

**Formula:**
```
Conversion Rate = (Conversions / Total Visitors) × 100
```

**Implementation:**
```javascript
function conversionRate(conversions, visitors) {
  if (visitors === 0) return 0;
  return (conversions / visitors) * 100;
}
```

**Example:**
```javascript
conversionRate(250, 10000)
// Returns: 2.5 (2.5% conversion rate)
```

**Industry Benchmarks:**
- **E-commerce:** 2-3%
- **SaaS Free Trial:** 10-25%
- **Lead Gen:** 2-5%
- **Subscription:** 5-10%

---

## Performance Metrics

### 7. Response Time Percentiles

**Calculate Percentile:**
```javascript
function percentile(data, percentile) {
  const sorted = data.slice().sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
```

**Example:**
```javascript
const responseTimes = [45, 52, 58, 62, 78, 95, 120, 150, 200, 350];

percentile(responseTimes, 50)  // Median: 86.5ms
percentile(responseTimes, 95)  // P95: 275ms
percentile(responseTimes, 99)  // P99: 335ms
```

**Performance Targets:**
- **P50 (Median):** <100ms
- **P95:** <500ms
- **P99:** <1000ms

---

### 8. Error Rate

**Formula:**
```
Error Rate = (Errors / Total Requests) × 100
```

**Implementation:**
```javascript
function errorRate(errors, totalRequests) {
  if (totalRequests === 0) return 0;
  return (errors / totalRequests) * 100;
}
```

**By Status Code:**
```javascript
function errorRateByCode(requests, statusCodeCounts) {
  const total = Object.values(statusCodeCounts).reduce((a, b) => a + b, 0);

  const clientErrors = (statusCodeCounts['4xx'] || 0);
  const serverErrors = (statusCodeCounts['5xx'] || 0);

  return {
    clientErrorRate: (clientErrors / total) * 100,
    serverErrorRate: (serverErrors / total) * 100,
    totalErrorRate: ((clientErrors + serverErrors) / total) * 100
  };
}
```

**Targets:**
- **Excellent:** <0.1%
- **Good:** 0.1-0.5%
- **Acceptable:** 0.5-1%
- **Poor:** >1%

---

### 9. Throughput

**Formula:**
```
Throughput = Total Requests / Time Period (seconds)
```

**Implementation:**
```javascript
function throughput(requests, seconds) {
  if (seconds === 0) return 0;
  return requests / seconds;
}

function throughputPerMinute(requests, seconds) {
  return throughput(requests, seconds) * 60;
}

function throughputPerHour(requests, seconds) {
  return throughput(requests, seconds) * 3600;
}
```

**Example:**
```javascript
// 15,000 requests in 5 minutes (300 seconds)
throughput(15000, 300)           // 50 req/s
throughputPerMinute(15000, 300)  // 3000 req/min
throughputPerHour(15000, 300)    // 180,000 req/hour
```

---

### 10. Uptime Percentage

**Formula:**
```
Uptime = (Total Time - Downtime) / Total Time × 100
```

**Implementation:**
```javascript
function uptimePercentage(totalSeconds, downtimeSeconds) {
  if (totalSeconds === 0) return 0;
  return ((totalSeconds - downtimeSeconds) / totalSeconds) * 100;
}
```

**SLA Calculations:**
```javascript
function allowedDowntime(uptimePercent, periodDays) {
  const totalSeconds = periodDays * 24 * 60 * 60;
  const downtimePercent = 100 - uptimePercent;
  return totalSeconds * (downtimePercent / 100);
}

// 99.9% uptime in 30 days
allowedDowntime(99.9, 30)
// Returns: 2592 seconds (43.2 minutes allowed downtime)
```

**SLA Targets:**
| Uptime | Downtime/Year | Downtime/Month | Downtime/Week |
|--------|---------------|----------------|---------------|
| 90%    | 36.5 days     | 72 hours       | 16.8 hours    |
| 95%    | 18.25 days    | 36 hours       | 8.4 hours     |
| 99%    | 3.65 days     | 7.2 hours      | 1.68 hours    |
| 99.9%  | 8.76 hours    | 43.8 minutes   | 10.1 minutes  |
| 99.99% | 52.56 minutes | 4.38 minutes   | 1.01 minutes  |

---

### 11. Latency Statistics

**Calculate Statistics:**
```javascript
function latencyStats(data) {
  const sorted = data.slice().sort((a, b) => a - b);
  const n = sorted.length;

  // Mean
  const mean = sorted.reduce((a, b) => a + b, 0) / n;

  // Median
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // Standard Deviation
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Min/Max
  const min = sorted[0];
  const max = sorted[n - 1];

  return {
    mean,
    median,
    stdDev,
    min,
    max,
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99)
  };
}
```

---

### 12. Queue Metrics

**Queue Depth:**
```javascript
function queueDepth(pending, processing) {
  return pending + processing;
}
```

**Queue Wait Time:**
```javascript
function averageWaitTime(totalWaitTimeMs, completedJobs) {
  if (completedJobs === 0) return 0;
  return totalWaitTimeMs / completedJobs;
}
```

**Queue Throughput:**
```javascript
function queueThroughput(completedJobs, timeWindowSeconds) {
  if (timeWindowSeconds === 0) return 0;
  return completedJobs / timeWindowSeconds;
}
```

**Processing Time:**
```javascript
function averageProcessingTime(totalProcessingMs, completedJobs) {
  if (completedJobs === 0) return 0;
  return totalProcessingMs / completedJobs;
}
```

---

## Statistical Metrics

### 13. Mean (Average)

**Formula:**
```
Mean = Sum of all values / Count of values
```

**Implementation:**
```javascript
function mean(data) {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}
```

---

### 14. Median

**Formula:**
```
Median = Middle value when sorted (or average of two middle values)
```

**Implementation:**
```javascript
function median(data) {
  if (data.length === 0) return 0;
  const sorted = data.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
```

---

### 15. Standard Deviation

**Formula:**
```
σ = √(Σ(x - μ)² / N)
```

**Implementation:**
```javascript
function standardDeviation(data) {
  if (data.length === 0) return 0;
  const avg = mean(data);
  const squaredDiffs = data.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);
  return Math.sqrt(variance);
}
```

---

### 16. Confidence Interval

**95% Confidence Interval:**
```javascript
function confidenceInterval95(data) {
  const n = data.length;
  if (n === 0) return { lower: 0, upper: 0 };

  const avg = mean(data);
  const stdDev = standardDeviation(data);
  const stderr = stdDev / Math.sqrt(n);
  const margin = 1.96 * stderr;  // 1.96 for 95% CI

  return {
    mean: avg,
    lower: avg - margin,
    upper: avg + margin,
    margin: margin
  };
}
```

**Example:**
```javascript
const data = [45, 52, 48, 50, 55, 47, 49, 51, 53, 46];
confidenceInterval95(data)
// Returns: {
//   mean: 49.6,
//   lower: 47.8,
//   upper: 51.4,
//   margin: 1.8
// }
```

---

### 17. Statistical Significance (t-test)

**Two-sample t-test:**
```javascript
function tTest(groupA, groupB) {
  const meanA = mean(groupA);
  const meanB = mean(groupB);
  const stdA = standardDeviation(groupA);
  const stdB = standardDeviation(groupB);
  const nA = groupA.length;
  const nB = groupB.length;

  // Pooled standard deviation
  const pooledStd = Math.sqrt(
    ((nA - 1) * stdA * stdA + (nB - 1) * stdB * stdB) / (nA + nB - 2)
  );

  // t-statistic
  const tStat = (meanA - meanB) / (pooledStd * Math.sqrt(1/nA + 1/nB));

  // Degrees of freedom
  const df = nA + nB - 2;

  return {
    tStatistic: tStat,
    degreesOfFreedom: df,
    meanDifference: meanA - meanB,
    significant: Math.abs(tStat) > 1.96  // p < 0.05 approximation
  };
}
```

---

### 18. Sample Size Calculator

**Calculate required sample size:**
```javascript
function requiredSampleSize(baselineRate, minDetectableEffect, power = 0.8, alpha = 0.05) {
  // Simplified formula for proportions
  const z_alpha = 1.96;  // For alpha = 0.05 (two-tailed)
  const z_beta = 0.84;   // For power = 0.8

  const p1 = baselineRate;
  const p2 = baselineRate + minDetectableEffect;
  const p_avg = (p1 + p2) / 2;

  const n = (Math.pow(z_alpha + z_beta, 2) * 2 * p_avg * (1 - p_avg)) /
            Math.pow(p2 - p1, 2);

  return Math.ceil(n);
}
```

**Example:**
```javascript
// Baseline conversion: 5%, want to detect 1% lift
requiredSampleSize(0.05, 0.01, 0.8, 0.05)
// Returns: 3841 (need 3841 samples per variant)
```

---

## Cost Metrics

### 19. Cost Per Request

**Formula:**
```
Cost Per Request = Total Cost / Total Requests
```

**Implementation:**
```javascript
function costPerRequest(totalCost, totalRequests) {
  if (totalRequests === 0) return 0;
  return totalCost / totalRequests;
}
```

**Example:**
```javascript
costPerRequest(125.50, 50000)
// Returns: 0.00251 ($0.00251 per request)
```

---

### 20. LLM Token Cost

**Token Cost Calculator:**
```javascript
const MODEL_PRICING = {
  'claude-opus-4': { input: 0.015, output: 0.075 },    // per 1K tokens
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-haiku-4': { input: 0.0003, output: 0.00125 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
};

function calculateLLMCost(model, inputTokens, outputTokens) {
  if (!MODEL_PRICING[model]) {
    throw new Error(`Unknown model: ${model}`);
  }

  const pricing = MODEL_PRICING[model];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}
```

**Example:**
```javascript
calculateLLMCost('claude-sonnet-4', 5000, 1500)
// Returns: {
//   inputCost: 0.015,
//   outputCost: 0.0225,
//   totalCost: 0.0375,
//   inputTokens: 5000,
//   outputTokens: 1500,
//   totalTokens: 6500
// }
```

---

### 21. ROI (Return on Investment)

**Formula:**
```
ROI = ((Revenue - Cost) / Cost) × 100
```

**Implementation:**
```javascript
function roi(revenue, cost) {
  if (cost === 0) return 0;
  return ((revenue - cost) / cost) * 100;
}
```

**Example:**
```javascript
roi(15000, 10000)
// Returns: 50 (50% ROI)
```

**ROI Interpretation:**
- **>100%:** Excellent
- **50-100%:** Good
- **20-50%:** Acceptable
- **0-20%:** Break-even
- **<0%:** Loss

---

### 22. Customer Lifetime Value (CLV)

**Formula:**
```
CLV = (Average Order Value × Purchase Frequency × Customer Lifespan)
```

**Implementation:**
```javascript
function customerLifetimeValue(avgOrderValue, purchasesPerYear, avgCustomerLifespanYears) {
  return avgOrderValue * purchasesPerYear * avgCustomerLifespanYears;
}
```

**Example:**
```javascript
// $50 average order, 4 purchases/year, 3 year lifespan
customerLifetimeValue(50, 4, 3)
// Returns: 600 ($600 CLV)
```

**CLV to CAC Ratio:**
```javascript
function clvToCacRatio(clv, customerAcquisitionCost) {
  if (customerAcquisitionCost === 0) return 0;
  return clv / customerAcquisitionCost;
}

// Target ratio: 3:1 or higher
```

---

### 23. Payback Period

**Formula:**
```
Payback Period = Customer Acquisition Cost / Monthly Revenue Per Customer
```

**Implementation:**
```javascript
function paybackPeriod(cac, monthlyRevenuePerCustomer) {
  if (monthlyRevenuePerCustomer === 0) return Infinity;
  return cac / monthlyRevenuePerCustomer;
}
```

**Example:**
```javascript
paybackPeriod(300, 50)
// Returns: 6 (6 months to recoup CAC)
```

**Targets:**
- **Excellent:** <6 months
- **Good:** 6-12 months
- **Acceptable:** 12-18 months
- **Concerning:** >18 months

---

## Composite Metrics

### 24. Content Performance Score

**Weighted composite score:**
```javascript
function contentPerformanceScore(metrics) {
  const {
    engagementRate,
    saveRate,
    shareRate,
    retentionRate,
    ctr
  } = metrics;

  // Weighted scoring
  const score = (
    engagementRate * 0.3 +
    saveRate * 10 * 0.2 +      // Save rate is typically lower
    shareRate * 10 * 0.25 +    // Share rate is typically lower
    retentionRate * 0.15 +
    ctr * 0.1
  );

  return Math.min(100, Math.max(0, score));
}
```

---

### 25. System Health Score

**Composite health metric:**
```javascript
function systemHealthScore(metrics) {
  const {
    uptimePercent,
    errorRate,
    avgResponseTime,
    p95ResponseTime
  } = metrics;

  // Normalize metrics (0-100 scale)
  const uptimeScore = uptimePercent;
  const errorScore = Math.max(0, 100 - (errorRate * 100));  // Lower is better
  const responseScore = Math.max(0, 100 - (avgResponseTime / 10));  // <1000ms = 100
  const p95Score = Math.max(0, 100 - (p95ResponseTime / 20));  // <2000ms = 100

  // Weighted average
  return (
    uptimeScore * 0.4 +
    errorScore * 0.3 +
    responseScore * 0.2 +
    p95Score * 0.1
  );
}
```

---

## Bash Implementations

**For use in monitoring scripts:**

### Uptime Percentage
```bash
calculate_uptime() {
  local total_seconds=$1
  local downtime_seconds=$2
  local uptime_seconds=$((total_seconds - downtime_seconds))
  local uptime_percent=$(echo "scale=4; ($uptime_seconds / $total_seconds) * 100" | bc)
  echo $uptime_percent
}

# Usage
calculate_uptime 2592000 3600  # 30 days with 1 hour downtime
# Returns: 99.8611
```

### Error Rate
```bash
calculate_error_rate() {
  local errors=$1
  local total=$2
  local rate=$(echo "scale=4; ($errors / $total) * 100" | bc)
  echo $rate
}
```

### Average from Log
```bash
# Calculate average response time from log file
awk '{sum+=$1; count++} END {print sum/count}' response_times.log
```

### Percentile from Log
```bash
# Calculate 95th percentile
sort -n response_times.log | awk '{a[NR]=$1} END {print a[int(NR*0.95)]}'
```

---

## When This Skill is Invoked

Claude will automatically use this skill when:
- Calculating engagement, performance, or cost metrics
- Analyzing data and generating reports
- Performing statistical analysis
- Evaluating A/B test results
- Computing ROI or business metrics
- Monitoring system health
- Any standardized metric calculation
