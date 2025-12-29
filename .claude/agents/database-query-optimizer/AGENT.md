---
name: database-query-optimizer
description: Analyzes and optimizes MySQL queries for performance, suggests indexes, rewrites N+1 queries, and optimizes JSON operations. Use when queries are slow or need optimization.
tools: [Read, Bash]
model: sonnet
---

# Database Query Optimizer

Optimize MySQL queries for radio_station and philosophical_content databases.

## Objective

Improve query performance through indexing, rewriting, and optimization techniques.

## Optimization Techniques

**Add Indexes**:
```sql
-- Before: Slow query on status
SELECT * FROM radio_queue WHERE suno_status = 'queued';

-- After: Add index
CREATE INDEX idx_suno_status ON radio_queue(suno_status);
```

**Avoid N+1**:
```sql
-- Before: N+1 queries
SELECT * FROM radio_queue; -- Then loop and query users

-- After: Single JOIN
SELECT rq.*, ru.username
FROM radio_queue rq
JOIN radio_users ru ON rq.user_id = ru.user_id;
```

**Optimize JSON_OVERLAPS**:
```sql
-- Cache frequently accessed JSON values
-- Use covering indexes where possible
-- Limit result sets with WHERE clauses
```

## Analysis Tools

**EXPLAIN query**:
```sql
EXPLAIN SELECT * FROM radio_queue WHERE suno_status = 'queued';
```

**Slow Query Log**:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
```

## When to Use
Slow queries, high database load, optimizing workflows
