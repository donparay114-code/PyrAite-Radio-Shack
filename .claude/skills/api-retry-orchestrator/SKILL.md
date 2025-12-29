---
name: api-retry-orchestrator
description: Use this skill for resilient API calling - exponential backoff, circuit breakers, bulkhead pattern, timeout handling, fallback strategies, and combined resilience patterns. Ensures robust API integrations.
allowed-tools: [Bash, Read]
---

# API Retry Orchestrator

Resilient API calling with retry logic, circuit breakers, and fault tolerance.

## Retry with Exponential Backoff

```javascript
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    jitter = true
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      if (jitter) delay *= (0.5 + Math.random() * 0.5);

      await sleep(delay);
    }
  }
}
```

## Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000;
    this.halfOpenRequests = options.halfOpenRequests || 3;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.halfOpenCount = 0;
  }

  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        if (fallback) return await fallback();
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
      this.halfOpenCount = 0;
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.halfOpenCount++;
        if (this.halfOpenCount >= this.halfOpenRequests) {
          this.reset();
        }
      } else {
        this.onSuccess();
      }

      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return await fallback();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  trip() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.timeout;
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenCount = 0;
  }
}
```

## Bulkhead Pattern

```javascript
class Bulkhead {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    if (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        resolve();
      }
    }
  }
}
```

## Timeout Wrapper

```javascript
async function withTimeout(fn, timeoutMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}
```

## Combined Resilience

```javascript
async function resilientApiCall(fn, options = {}) {
  const {
    retry = true,
    circuitBreaker = null,
    timeout = 5000,
    fallback = null
  } = options;

  const execute = async () => {
    let fn_with_timeout = () => withTimeout(fn, timeout);

    if (retry) {
      fn_with_timeout = () => retryWithBackoff(fn_with_timeout);
    }

    if (circuitBreaker) {
      return await circuitBreaker.execute(fn_with_timeout, fallback);
    }

    try {
      return await fn_with_timeout();
    } catch (error) {
      if (fallback) return await fallback();
      throw error;
    }
  };

  return await execute();
}
```

## When This Skill is Invoked

Use for API integrations, external service calls, or any network operations requiring resilience.
