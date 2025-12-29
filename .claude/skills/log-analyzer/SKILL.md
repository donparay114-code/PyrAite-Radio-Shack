---
name: log-analyzer
description: Analyze logs from n8n executions, MySQL queries, and application logs to identify patterns, errors, and performance issues. Use when the user mentions logs, debugging, error analysis, or performance monitoring.
---

# Log Analyzer

## Purpose
Parse, analyze, and extract insights from various log sources including n8n execution logs, MySQL slow query logs, and application logs.

## Log Sources

### N8N Execution Logs
- Workflow execution history
- Node-level errors
- Execution duration
- Success/failure rates

### MySQL Logs
- Slow query log
- Error log
- General query log

### Application Logs
- Custom JavaScript logging
- Console output
- Error traces

## N8N Log Analysis

### Query Execution History

```sql
-- If n8n uses MySQL for execution storage
SELECT
  workflow_name,
  COUNT(*) as total_executions,
  SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed,
  AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)) as avg_duration_seconds
FROM n8n.execution_entity
WHERE finished_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY workflow_name
ORDER BY failed DESC, avg_duration_seconds DESC;
```

### Recent Failures

```sql
-- Get recent failed executions
SELECT
  id,
  workflow_name,
  started_at,
  finished_at,
  error_message,
  TIMESTAMPDIFF(SECOND, started_at, finished_at) as duration
FROM n8n.execution_entity
WHERE success = FALSE
  AND finished_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY finished_at DESC
LIMIT 20;
```

### Identify Slow Workflows

```sql
-- Find workflows taking longer than average
SELECT
  workflow_name,
  AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)) as avg_duration,
  MAX(TIMESTAMPDIFF(SECOND, started_at, finished_at)) as max_duration,
  COUNT(*) as execution_count
FROM n8n.execution_entity
WHERE finished = TRUE
  AND finished_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY workflow_name
HAVING avg_duration > 30  -- Slower than 30 seconds
ORDER BY avg_duration DESC;
```

## Log Parser Scripts

### Parse N8N Execution Logs

```javascript
// parse_n8n_logs.js
const mysql = require('mysql2/promise');

async function analyzeN8NLogs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hunter0hunter2207',
    database: 'n8n'
  });

  // Error patterns
  const [errors] = await connection.execute(`
    SELECT
      error_message,
      COUNT(*) as occurrence_count,
      MAX(finished_at) as last_occurrence
    FROM execution_entity
    WHERE success = FALSE
      AND finished_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY error_message
    ORDER BY occurrence_count DESC
    LIMIT 10
  `);

  console.log('=== Top Error Patterns (Last 7 Days) ===\n');

  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.error_message}`);
    console.log(`   Occurrences: ${error.occurrence_count}`);
    console.log(`   Last seen: ${error.last_occurrence}`);
    console.log('');
  });

  // Workflow performance
  const [performance] = await connection.execute(`
    SELECT
      workflow_name,
      COUNT(*) as executions,
      SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful,
      ROUND(AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)), 2) as avg_duration,
      ROUND(SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as success_rate
    FROM execution_entity
    WHERE finished_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY workflow_name
    ORDER BY executions DESC
  `);

  console.log('=== Workflow Performance (Last 24 Hours) ===\n');

  performance.forEach(wf => {
    console.log(`${wf.workflow_name}`);
    console.log(`  Executions: ${wf.executions}`);
    console.log(`  Success Rate: ${wf.success_rate}%`);
    console.log(`  Avg Duration: ${wf.avg_duration}s`);
    console.log('');
  });

  await connection.end();
}

analyzeN8NLogs();
```

## MySQL Slow Query Log Analysis

### Enable Slow Query Log

```sql
-- Enable slow query logging
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- Queries taking > 2 seconds
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Check configuration
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';
```

### Parse Slow Query Log

```bash
#!/bin/bash
# analyze_slow_queries.sh

SLOW_LOG="/var/lib/mysql/slow-query.log"  # Adjust path

# Use pt-query-digest if available
if command -v pt-query-digest &> /dev/null; then
  pt-query-digest $SLOW_LOG
else
  echo "Slow queries from log:"
  grep -A 10 "Query_time:" $SLOW_LOG | head -50
fi
```

### Identify Problematic Queries

```sql
-- Use performance_schema to find slow queries
SELECT
  DIGEST_TEXT,
  COUNT_STAR as execution_count,
  ROUND(AVG_TIMER_WAIT / 1000000000000, 2) as avg_time_seconds,
  ROUND(MAX_TIMER_WAIT / 1000000000000, 2) as max_time_seconds
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'radio_station'
ORDER BY avg_time_seconds DESC
LIMIT 10;
```

## Application Log Analysis

### Log File Parser

```javascript
// parse_logs.js
const fs = require('fs');
const readline = require('readline');

async function parseLogs(logFile) {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const stats = {
    totalLines: 0,
    errors: [],
    warnings: [],
    info: [],
    patterns: {}
  };

  for await (const line of rl) {
    stats.totalLines++;

    // Categorize by log level
    if (line.includes('ERROR') || line.includes('Error')) {
      stats.errors.push(line);
    } else if (line.includes('WARN') || line.includes('Warning')) {
      stats.warnings.push(line);
    } else if (line.includes('INFO')) {
      stats.info.push(line);
    }

    // Extract patterns
    const timestampMatch = line.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    if (timestampMatch) {
      const hour = timestampMatch[0].substring(11, 13);
      stats.patterns[hour] = (stats.patterns[hour] || 0) + 1;
    }
  }

  return stats;
}

async function analyzeLogFile(filePath) {
  console.log(`Analyzing: ${filePath}\n`);

  const stats = await parseLogs(filePath);

  console.log('=== Summary ===');
  console.log(`Total lines: ${stats.totalLines}`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log(`Warnings: ${stats.warnings.length}`);
  console.log(`Info: ${stats.info.length}`);
  console.log('');

  if (stats.errors.length > 0) {
    console.log('=== Recent Errors ===');
    stats.errors.slice(-10).forEach(err => console.log(err));
    console.log('');
  }

  console.log('=== Activity by Hour ===');
  Object.entries(stats.patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([hour, count]) => {
      console.log(`${hour}:00 - ${count} entries`);
    });
}

// Usage
analyzeLogFile('app.log');
```

## Pattern Detection

### Detect Error Patterns

```javascript
// detect_patterns.js
function detectErrorPatterns(errors) {
  const patterns = {};

  errors.forEach(error => {
    // Extract error type
    const typeMatch = error.match(/(Error|Exception): (.+?)(?:\n|$)/);
    if (typeMatch) {
      const errorType = typeMatch[1];
      patterns[errorType] = (patterns[errorType] || 0) + 1;
    }

    // Extract common phrases
    const commonPhrases = [
      'timeout',
      'connection refused',
      'not found',
      'unauthorized',
      'rate limit',
      'database',
      'API',
      'null pointer'
    ];

    commonPhrases.forEach(phrase => {
      if (error.toLowerCase().includes(phrase.toLowerCase())) {
        patterns[phrase] = (patterns[phrase] || 0) + 1;
      }
    });
  });

  return patterns;
}

// Usage
const errorPatterns = detectErrorPatterns(errors);
console.log('Error Patterns:', errorPatterns);
```

## Real-Time Log Monitoring

### Tail and Analyze

```javascript
// monitor_logs.js
const { exec } = require('child_process');
const EventEmitter = require('events');

class LogMonitor extends EventEmitter {
  constructor(logFile) {
    super();
    this.logFile = logFile;
    this.process = null;
  }

  start() {
    // Tail log file
    this.process = exec(`tail -f ${this.logFile}`);

    this.process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');

      lines.forEach(line => {
        if (line.includes('ERROR')) {
          this.emit('error', line);
        } else if (line.includes('WARN')) {
          this.emit('warning', line);
        }
      });
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
    }
  }
}

// Usage
const monitor = new LogMonitor('/var/log/app.log');

monitor.on('error', (line) => {
  console.log('🔴 ERROR:', line);
  // Send alert, write to database, etc.
});

monitor.on('warning', (line) => {
  console.log('🟡 WARNING:', line);
});

monitor.start();
```

## Performance Insights

### Workflow Execution Timeline

```javascript
// execution_timeline.js
const mysql = require('mysql2/promise');

async function generateTimeline() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hunter0hunter2207',
    database: 'n8n'
  });

  const [executions] = await connection.execute(`
    SELECT
      DATE_FORMAT(started_at, '%Y-%m-%d %H:00:00') as hour,
      workflow_name,
      COUNT(*) as count,
      AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)) as avg_duration
    FROM execution_entity
    WHERE started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY hour, workflow_name
    ORDER BY hour DESC, count DESC
  `);

  console.log('=== Execution Timeline (Last 24 Hours) ===\n');

  let currentHour = null;
  executions.forEach(exec => {
    if (exec.hour !== currentHour) {
      currentHour = exec.hour;
      console.log(`\n${currentHour}`);
    }
    console.log(`  ${exec.workflow_name}: ${exec.count} executions (avg ${exec.avg_duration}s)`);
  });

  await connection.end();
}

generateTimeline();
```

## Error Aggregation

### Group and Count Errors

```sql
-- Group errors by hour and type
SELECT
  DATE_FORMAT(finished_at, '%Y-%m-%d %H:00:00') as error_hour,
  SUBSTRING_INDEX(error_message, ':', 1) as error_type,
  COUNT(*) as error_count
FROM n8n.execution_entity
WHERE success = FALSE
  AND finished_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY error_hour, error_type
ORDER BY error_hour DESC, error_count DESC;
```

## Automated Reports

### Daily Log Summary

```javascript
// daily_summary.js
const mysql = require('mysql2/promise');
const fs = require('fs');

async function generateDailySummary() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hunter0hunter2207'
  });

  const date = new Date().toISOString().split('T')[0];
  let report = `# Daily Log Summary - ${date}\n\n`;

  // N8N executions
  const [n8nStats] = await connection.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed
    FROM n8n.execution_entity
    WHERE DATE(finished_at) = CURDATE()
  `);

  report += `## N8N Workflow Executions\n`;
  report += `- Total: ${n8nStats[0].total}\n`;
  report += `- Successful: ${n8nStats[0].successful}\n`;
  report += `- Failed: ${n8nStats[0].failed}\n`;
  report += `- Success Rate: ${((n8nStats[0].successful / n8nStats[0].total) * 100).toFixed(2)}%\n\n`;

  // Radio station stats
  const [radioStats] = await connection.execute(`
    SELECT
      COUNT(*) as songs_generated
    FROM radio_station.radio_queue
    WHERE DATE(generation_completed_at) = CURDATE()
      AND suno_status = 'completed'
  `);

  report += `## Radio Station\n`;
  report += `- Songs Generated: ${radioStats[0].songs_generated}\n\n`;

  // Top errors
  const [topErrors] = await connection.execute(`
    SELECT
      error_message,
      COUNT(*) as count
    FROM n8n.execution_entity
    WHERE DATE(finished_at) = CURDATE()
      AND success = FALSE
    GROUP BY error_message
    ORDER BY count DESC
    LIMIT 5
  `);

  if (topErrors.length > 0) {
    report += `## Top Errors\n`;
    topErrors.forEach((err, i) => {
      report += `${i + 1}. ${err.error_message} (${err.count} times)\n`;
    });
  }

  await connection.end();

  // Save report
  fs.writeFileSync(`logs/daily_summary_${date}.md`, report);
  console.log(`✓ Daily summary saved: logs/daily_summary_${date}.md`);

  return report;
}

generateDailySummary();
```

## Alert System

### Error Threshold Alerts

```javascript
// alert_system.js
const mysql = require('mysql2/promise');

async function checkAlerts() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hunter0hunter2207',
    database: 'n8n'
  });

  // Check error rate in last hour
  const [errorRate] = await connection.execute(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed
    FROM execution_entity
    WHERE finished_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `);

  const failureRate = (errorRate[0].failed / errorRate[0].total) * 100;

  if (failureRate > 20) {  // Alert if > 20% failures
    console.log('🚨 ALERT: High failure rate detected!');
    console.log(`Failure rate: ${failureRate.toFixed(2)}%`);
    console.log(`Failed: ${errorRate[0].failed} / ${errorRate[0].total}`);

    // Send notification (email, Slack, etc.)
  }

  await connection.end();
}

// Run every 15 minutes
setInterval(checkAlerts, 15 * 60 * 1000);
checkAlerts(); // Run immediately
```

## When to Use This Skill

- Debugging workflow failures
- Analyzing error patterns
- Monitoring performance
- Identifying slow queries
- Generating log reports
- Setting up alerts
- Troubleshooting production issues
- Performance optimization
- Understanding system behavior
