---
name: n8n-workflow-helper
description: Use this skill for n8n workflow operations - getting/updating/activating workflows, managing executions, implementing error handling patterns (retry logic, circuit breakers, rate limiting), queue processing, and webhook handlers. Provides common n8n patterns and best practices.
allowed-tools: [Bash, Read]
---

# n8n Workflow Helper

Common n8n API operations and workflow patterns using MCP tools.

## Workflow Management

**Get Workflow:**
```javascript
// Using MCP tool
const workflow = await mcp__n8n__get_workflow({ workflowId: "123" });
```

**List Workflows:**
```javascript
const workflows = await mcp__n8n__list_workflows({ active: true });
```

**Update Workflow:**
```javascript
await mcp__n8n__update_workflow({
  workflowId: "123",
  name: "Updated Workflow",
  nodes: updatedNodes,
  connections: updatedConnections
});
```

**Activate/Deactivate:**
```javascript
await mcp__n8n__activate_workflow({ workflowId: "123" });
await mcp__n8n__deactivate_workflow({ workflowId: "123" });
```

## Execution Management

**List Executions:**
```javascript
const executions = await mcp__n8n__list_executions({
  workflowId: "123",
  status: "error",
  limit: 10
});
```

**Get Execution Details:**
```javascript
const execution = await mcp__n8n__get_execution({ executionId: "456" });
```

## Common Patterns

### Error Handling with Retry
```javascript
async function callWithRetry(apiFunc, maxRetries = 3, backoffMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunc();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = backoffMs * Math.pow(2, attempt - 1);
      console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Circuit Breaker
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

### Rate Limiter
```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter(time => time > now - this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await sleep(waitTime);
      return this.acquire();
    }

    this.requests.push(now);
  }
}
```

### Queue Processing
```javascript
async function processQueue(queueName, processor, options = {}) {
  const { batchSize = 10, concurrency = 5 } = options;

  while (true) {
    // Get pending items from database/queue
    const items = await getPendingItems(queueName, batchSize);

    if (items.length === 0) {
      await sleep(5000);
      continue;
    }

    // Process with concurrency limit
    const chunks = chunkArray(items, concurrency);

    for (const chunk of chunks) {
      await Promise.all(chunk.map(item =>
        processItem(item, processor)
      ));
    }
  }
}

async function processItem(item, processor) {
  try {
    await updateItemStatus(item.id, 'processing');
    const result = await processor(item);
    await updateItemStatus(item.id, 'completed', result);
  } catch (error) {
    await updateItemStatus(item.id, 'failed', { error: error.message });
  }
}
```

### Webhook Security
```javascript
function validateWebhookSignature(payload, signature, secret) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## When This Skill is Invoked

Use when working with n8n workflows, executions, or implementing workflow patterns.
