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

## Music Provider Failover

Specialized pattern for music generation APIs with provider fallback:

```javascript
class MusicProviderFailover {
  constructor(providers = ['suno', 'stable-audio', 'mubert']) {
    this.providers = providers;
    this.circuitBreakers = {};

    // Initialize circuit breaker for each provider
    providers.forEach(provider => {
      this.circuitBreakers[provider] = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 120000, // 2 minutes before retry
        halfOpenRequests: 2
      });
    });
  }

  async generate(request) {
    const { prompt, duration, genre, metadata } = request;

    for (const providerName of this.providers) {
      try {
        const provider = this.getProvider(providerName);
        const circuitBreaker = this.circuitBreakers[providerName];

        // Health check before attempting
        if (circuitBreaker.state === 'OPEN') {
          console.log(`${providerName} circuit breaker is OPEN, trying next provider`);
          continue;
        }

        // Try generation with this provider
        const result = await circuitBreaker.execute(async () => {
          return await resilientApiCall(
            () => provider.generate({ prompt, duration, genre, metadata }),
            {
              retry: true,
              timeout: 180000, // 3 minutes for generation
              fallback: null
            }
          );
        });

        // Success - return result with provider metadata
        return {
          ...result,
          provider: providerName,
          fallbackUsed: this.providers.indexOf(providerName) > 0
        };

      } catch (error) {
        console.error(`${providerName} failed: ${error.message}`);

        // If last provider, throw error
        if (providerName === this.providers[this.providers.length - 1]) {
          throw new Error(`All providers failed. Last error: ${error.message}`);
        }

        // Otherwise, continue to next provider
        console.log(`Trying next provider after ${providerName} failure`);
      }
    }
  }

  getProvider(name) {
    // Import and return provider instance
    const MusicProviderFactory = require('./music-provider-adapter');
    return MusicProviderFactory.create(name);
  }

  // Get provider health status
  getProviderHealth() {
    return Object.entries(this.circuitBreakers).map(([name, cb]) => ({
      provider: name,
      state: cb.state,
      failureCount: cb.failureCount,
      available: cb.state !== 'OPEN'
    }));
  }
}
```

## Provider-Specific Retry Logic

Different providers have different rate limits and failure patterns:

```javascript
const providerRetryConfigs = {
  suno: {
    maxRetries: 3,
    baseDelay: 2000,
    timeout: 180000, // 3 min for generation
    retryableErrors: ['rate_limit', 'timeout', 'server_error']
  },
  'stable-audio': {
    maxRetries: 2,
    baseDelay: 1000,
    timeout: 120000, // 2 min (faster)
    retryableErrors: ['rate_limit', 'timeout']
  },
  mubert: {
    maxRetries: 4,
    baseDelay: 500,
    timeout: 60000, // 1 min (fastest)
    retryableErrors: ['rate_limit', 'timeout', 'server_error']
  }
};

async function generateWithProviderRetry(provider, request) {
  const config = providerRetryConfigs[provider.name] || providerRetryConfigs.suno;

  return await retryWithBackoff(
    () => provider.generate(request),
    {
      maxRetries: config.maxRetries,
      baseDelay: config.baseDelay,
      shouldRetry: (error) => {
        // Only retry specific error types
        return config.retryableErrors.includes(error.type);
      }
    }
  );
}
```

## Usage Example: Music Generation with Failover

```javascript
// Initialize failover with preferred provider order
const musicFailover = new MusicProviderFailover([
  'suno',         // Primary (best for rap/lyrics)
  'stable-audio', // Fallback 1 (fast, reliable)
  'mubert'        // Fallback 2 (cheap, good for ambient)
]);

// Generate music with automatic failover
try {
  const result = await musicFailover.generate({
    prompt: "energetic hip hop beat with 808 bass",
    duration: 120,
    genre: "rap",
    metadata: { userId: 123, requestId: 456 }
  });

  console.log(`Generated by ${result.provider}`);
  console.log(`Fallback used: ${result.fallbackUsed}`);
  console.log(`Audio URL: ${result.audioUrl}`);

} catch (error) {
  console.error('All providers failed:', error.message);
  // Handle complete failure (notify user, queue for manual review, etc.)
}

// Check provider health
const health = musicFailover.getProviderHealth();
console.log('Provider health:', health);
// Output:
// [
//   { provider: 'suno', state: 'CLOSED', failureCount: 0, available: true },
//   { provider: 'stable-audio', state: 'OPEN', failureCount: 5, available: false },
//   { provider: 'mubert', state: 'CLOSED', failureCount: 1, available: true }
// ]
```

## Cost-Aware Provider Selection

Route genres to optimal providers based on cost and quality:

```javascript
class CostAwareProviderFailover extends MusicProviderFailover {
  constructor() {
    super();

    // Genre-to-provider routing
    this.genreRouting = {
      'rap': ['suno', 'stable-audio', 'mubert'],
      'lofi': ['mubert', 'stable-audio', 'suno'],
      'rock': ['suno', 'stable-audio', 'mubert'],
      'ambient': ['mubert', 'stable-audio', 'suno'],
      'electronic': ['stable-audio', 'suno', 'mubert']
    };
  }

  async generate(request) {
    // Override provider order based on genre
    const genre = request.genre || 'rap';
    const preferredOrder = this.genreRouting[genre] || this.providers;

    // Temporarily set provider order
    const originalProviders = this.providers;
    this.providers = preferredOrder;

    try {
      const result = await super.generate(request);
      return result;
    } finally {
      this.providers = originalProviders;
    }
  }
}
```

## When This Skill is Invoked

Use for:
- API integrations with external services
- Music generation with provider failover
- Network operations requiring resilience
- Multi-provider architectures with circuit breakers
