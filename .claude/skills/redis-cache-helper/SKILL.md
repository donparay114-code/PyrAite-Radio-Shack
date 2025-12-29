---
name: redis-cache-helper
description: Use this skill for Redis caching operations - cache-aside, write-through, write-behind patterns, TTL strategies, rate limiting, distributed locks, pub/sub, leaderboards, and cache invalidation. Provides optimal caching patterns and best practices.
allowed-tools: [Bash, Read]
---

# Redis Cache Helper

Common Redis caching patterns and operations.

## Cache Patterns

### Cache-Aside (Lazy Loading)
```javascript
async function cacheAside(key, fetchFunction, ttl = 3600) {
  let data = await redis.get(key);

  if (data) {
    return JSON.parse(data);
  }

  data = await fetchFunction();
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
}
```

### Write-Through
```javascript
async function writeThrough(key, data, dbWriteFunction, ttl = 3600) {
  await dbWriteFunction(data);
  await redis.setex(key, ttl, JSON.stringify(data));
}
```

### Write-Behind
```javascript
async function writeBehind(key, data, ttl = 3600) {
  await redis.setex(key, ttl, JSON.stringify(data));
  await redis.rpush('write_queue', JSON.stringify({ key, data }));
}
```

## TTL Strategies

```javascript
const TTL_STRATEGIES = {
  static: 86400,          // 24 hours
  semiStatic: 3600,       // 1 hour
  dynamic: 600,           // 10 minutes
  realtime: 30            // 30 seconds
};

function selectTTL(dataType) {
  return TTL_STRATEGIES[dataType] || 3600;
}
```

## Rate Limiting

```javascript
async function rateLimit(identifier, maxRequests, windowSeconds) {
  const key = `ratelimit:${identifier}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
    resetAt: Date.now() + (windowSeconds * 1000)
  };
}
```

## Distributed Lock

```javascript
async function acquireLock(lockKey, ttl = 10) {
  const lockValue = Date.now() + ttl * 1000;
  const acquired = await redis.set(lockKey, lockValue, 'NX', 'EX', ttl);
  return acquired === 'OK';
}

async function releaseLock(lockKey) {
  await redis.del(lockKey);
}
```

## Cache Invalidation

```javascript
async function invalidatePattern(pattern) {
  let cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}
```

## When This Skill is Invoked

Use when implementing caching, rate limiting, or distributed systems with Redis.
