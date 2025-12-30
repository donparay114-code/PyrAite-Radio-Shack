# Music Provider Adapter Pattern Guide

## Overview

The Music Provider Adapter Pattern enables the PYrte Radio Station to use multiple AI music generation services (Suno, Stable Audio, Mubert) with automatic failover, cost optimization, and genre-based routing.

## Architecture

### Design Goals

1. **Provider Abstraction**: Unified interface for all music providers
2. **Automatic Failover**: Switch to backup provider if primary fails
3. **Cost Optimization**: Route genres to cheapest suitable provider
4. **Circuit Breaker**: Prevent cascading failures when provider is down
5. **Extensibility**: Easy to add new providers

### Components

```
┌─────────────────────────────────────────────┐
│         Music Provider Factory              │
│  createWithFallback(primary, fallback)      │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐      ┌───────────────┐
│ Suno Provider │      │ Stable Audio  │
│  $0.10/track  │      │  $0.15/track  │
└───────────────┘      └───────────────┘
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
          ┌───────────────┐
          │ Mubert        │
          │  $0.05/track  │
          └───────────────┘
```

## Provider Interface

All providers must implement this interface:

```javascript
class MusicProvider {
  /**
   * Generate music from prompt
   * @param {Object} request - Generation request
   * @param {string} request.prompt - Music description
   * @param {number} request.duration - Length in seconds
   * @param {string} request.genre - Music genre
   * @param {Object} request.metadata - Additional metadata
   * @returns {Promise<Object>} Normalized response
   */
  async generate({ prompt, duration, genre, metadata }) {
    throw new Error('Must implement generate()');
  }

  /**
   * Check generation status
   * @param {string} taskId - Generation task ID
   * @returns {Promise<Object>} Status response
   */
  async checkStatus(taskId) {
    throw new Error('Must implement checkStatus()');
  }

  /**
   * Download generated audio
   * @param {string} taskId - Generation task ID
   * @returns {Promise<Buffer>} Audio file buffer
   */
  async downloadAudio(taskId) {
    throw new Error('Must implement downloadAudio()');
  }

  /**
   * Normalize provider-specific response to standard format
   * @param {Object} rawResponse - Provider's raw response
   * @returns {Object} Normalized response
   */
  normalizeResponse(rawResponse) {
    return {
      taskId: String,
      status: 'pending' | 'processing' | 'completed' | 'failed',
      audioUrl: String | null,
      duration: Number,
      metadata: {
        provider: this.name,
        model: String,
        cost: Number,
        generationTime: Number
      }
    };
  }
}
```

## Provider Implementations

### Suno Provider

**Best for**: Rap, rock, pop with lyrics
**Cost**: $0.10 per track
**Generation Time**: 2-3 minutes

```javascript
class SunoProvider extends MusicProvider {
  constructor() {
    super();
    this.name = 'suno';
    this.apiKey = process.env.SUNO_API_KEY;
    this.baseUrl = 'https://api.suno.ai';
  }

  async generate({ prompt, duration, genre, metadata }) {
    const response = await fetch(`${this.baseUrl}/api/custom_generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        prompt: this.formatPrompt(prompt, genre),
        make_instrumental: false,
        wait_audio: false
      })
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  formatPrompt(userPrompt, genre) {
    // Convert user prompt to Suno's 45-65 word format
    return {
      style: this.generateStyleDescription(userPrompt, genre),
      lyrics: this.generateLyricStructure()
    };
  }
}
```

### Stable Audio Provider

**Best for**: Electronic, EDM, fast generation
**Cost**: $0.15 per track
**Generation Time**: 1-2 minutes

```javascript
class StableAudioProvider extends MusicProvider {
  constructor() {
    super();
    this.name = 'stable-audio';
    this.apiKey = process.env.STABILITY_API_KEY;
    this.baseUrl = 'https://api.stability.ai';
  }

  async generate({ prompt, duration, genre, metadata }) {
    const response = await fetch(`${this.baseUrl}/v1/audio/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: this.formatPrompt(prompt, genre),
        duration: duration,
        output_format: 'mp3'
      })
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  formatPrompt(userPrompt, genre) {
    // Stable Audio prefers concise prompts (10-30 words)
    return `${genre} music with ${userPrompt}`;
  }
}
```

### Mubert Provider

**Best for**: Lofi, ambient, background music
**Cost**: $0.05 per track
**Generation Time**: 30-60 seconds

```javascript
class MubertProvider extends MusicProvider {
  constructor() {
    super();
    this.name = 'mubert';
    this.apiKey = process.env.MUBERT_API_KEY;
    this.baseUrl = 'https://api.mubert.com';
  }

  async generate({ prompt, duration, genre, metadata }) {
    const tags = this.promptToTags(prompt, genre);

    const response = await fetch(`${this.baseUrl}/v2/RecTrackTT`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'RecTrackTT',
        params: {
          tags: tags.join(','),
          mode: 'track',
          duration: duration
        }
      })
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  promptToTags(userPrompt, genre) {
    // Convert natural language to Mubert tags
    const tagMap = {
      'chill': ['chill', 'relax', 'calm'],
      'lofi': ['lofi', 'chill', 'study'],
      'ambient': ['ambient', 'atmospheric', 'calm']
    };

    return tagMap[genre] || [genre, 'chill'];
  }
}
```

## Provider Factory

```javascript
class MusicProviderFactory {
  static create(providerName) {
    switch (providerName) {
      case 'suno':
        return new SunoProvider();
      case 'stable-audio':
        return new StableAudioProvider();
      case 'mubert':
        return new MubertProvider();
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  static async createWithFallback(primary, fallback) {
    const primaryProvider = this.create(primary);
    const fallbackProvider = this.create(fallback);

    return new ProviderWithFailover(primaryProvider, fallbackProvider);
  }

  static async createCostOptimized(genre) {
    // Genre-based routing for cost optimization
    const routing = {
      'rap': ['suno', 'stable-audio', 'mubert'],
      'lofi': ['mubert', 'stable-audio', 'suno'],
      'electronic': ['stable-audio', 'suno', 'mubert'],
      'ambient': ['mubert', 'stable-audio', 'suno']
    };

    const providers = (routing[genre] || routing['rap']).map(p => this.create(p));
    return new ProviderWithFailover(providers);
  }
}
```

## Failover Implementation

```javascript
class ProviderWithFailover {
  constructor(providers) {
    this.providers = Array.isArray(providers) ? providers : [providers];
    this.circuitBreakers = {};

    // Initialize circuit breaker for each provider
    this.providers.forEach(provider => {
      this.circuitBreakers[provider.name] = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 120000,
        halfOpenRequests: 2
      });
    });
  }

  async generate(request) {
    for (const provider of this.providers) {
      const breaker = this.circuitBreakers[provider.name];

      // Skip if circuit breaker is open
      if (breaker.state === 'OPEN') {
        console.log(`${provider.name} circuit breaker OPEN, trying next provider`);
        continue;
      }

      try {
        const result = await breaker.execute(async () => {
          return await provider.generate(request);
        });

        // Success - return with provider metadata
        return {
          ...result,
          metadata: {
            ...result.metadata,
            provider: provider.name,
            fallbackUsed: this.providers.indexOf(provider) > 0
          }
        };

      } catch (error) {
        console.error(`${provider.name} failed: ${error.message}`);

        // If last provider, throw error
        if (provider === this.providers[this.providers.length - 1]) {
          throw new Error(`All providers failed. Last error: ${error.message}`);
        }
      }
    }
  }

  getProviderHealth() {
    return this.providers.map(provider => ({
      name: provider.name,
      state: this.circuitBreakers[provider.name].state,
      available: this.circuitBreakers[provider.name].state !== 'OPEN'
    }));
  }
}
```

## Usage in n8n Workflows

### Queue Processor Integration

**Node: Select Provider**
```javascript
// Cost-aware provider selection
const genreRouting = {
  'rap': 'suno',
  'hip-hop': 'suno',
  'lofi': 'mubert',
  'ambient': 'mubert',
  'electronic': 'stable-audio'
};

const primary = genreRouting[$json.genre] || 'suno';
const fallback = primary === 'suno' ? 'stable-audio' : 'suno';

return {
  primary,
  fallback
};
```

**Node: Initialize Provider**
```javascript
const MusicProviderFactory = require('./music-provider-adapter');

const provider = await MusicProviderFactory.createWithFallback(
  $json.primary,
  $json.fallback
);

// Store provider instance in workflow context
$workflow.setStaticData('provider', provider);
```

**Node: Generate Music**
```javascript
const provider = $workflow.getStaticData('provider');

const result = await provider.generate({
  prompt: $json.enhanced_prompt,
  duration: 120,
  genre: $json.genre,
  metadata: {
    userId: $json.user_id,
    requestId: $json.request_id
  }
});

return result;
```

**Node: Handle Fallback**
```javascript
// Check if fallback was used
if ($json.metadata.fallbackUsed) {
  // Log fallback event
  await db.query(`
    INSERT INTO provider_fallback_log (
      request_id,
      primary_provider,
      fallback_provider,
      reason,
      created_at
    ) VALUES ($1, $2, $3, $4, NOW())
  `, [
    $json.requestId,
    $json.primary,
    $json.metadata.provider,
    'Circuit breaker triggered'
  ]);
}
```

## Cost Tracking

### Database Schema

```sql
CREATE TABLE song_generations (
  id SERIAL PRIMARY KEY,
  queue_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  provider VARCHAR(50) NOT NULL,
  task_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  audio_url TEXT,
  local_file_path TEXT,
  duration INTEGER,
  cost DECIMAL(10, 4),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_generations_provider ON song_generations(provider, created_at);
CREATE INDEX idx_generations_cost ON song_generations(created_at, cost);
```

### Cost Analysis Queries

```sql
-- Monthly cost by provider
SELECT
  provider,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as tracks_generated,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost_per_track
FROM song_generations
WHERE created_at > NOW() - INTERVAL '3 months'
GROUP BY provider, DATE_TRUNC('month', created_at)
ORDER BY month DESC, total_cost DESC;

-- Cost savings from genre routing
WITH baseline AS (
  SELECT COUNT(*) * 0.10 as cost_if_all_suno
  FROM song_generations
  WHERE created_at > NOW() - INTERVAL '1 month'
),
actual AS (
  SELECT SUM(cost) as actual_cost
  FROM song_generations
  WHERE created_at > NOW() - INTERVAL '1 month'
)
SELECT
  baseline.cost_if_all_suno,
  actual.actual_cost,
  (baseline.cost_if_all_suno - actual.actual_cost) as savings,
  ROUND(((baseline.cost_if_all_suno - actual.actual_cost) / baseline.cost_if_all_suno * 100), 2) as savings_percent
FROM baseline, actual;
```

## Testing Providers

### Health Check Endpoint

```javascript
app.get('/api/providers/health', async (req, res) => {
  const providers = ['suno', 'stable-audio', 'mubert'];
  const health = {};

  for (const providerName of providers) {
    try {
      const provider = MusicProviderFactory.create(providerName);

      // Simple test generation
      const result = await provider.generate({
        prompt: 'test',
        duration: 5,
        genre: 'test',
        metadata: { test: true }
      });

      health[providerName] = {
        status: 'healthy',
        latency: result.metadata.generationTime
      };

    } catch (error) {
      health[providerName] = {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  res.json(health);
});
```

### Manual Provider Test

```bash
# Test Suno
curl -X POST http://localhost:3000/api/test-provider \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "suno",
    "prompt": "energetic hip hop beat",
    "genre": "rap",
    "duration": 60
  }'

# Test Stable Audio
curl -X POST http://localhost:3000/api/test-provider \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stable-audio",
    "prompt": "dark techno with driving bassline",
    "genre": "electronic",
    "duration": 60
  }'

# Test Mubert
curl -X POST http://localhost:3000/api/test-provider \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mubert",
    "prompt": "chill lofi study music",
    "genre": "lofi",
    "duration": 60
  }'
```

## Best Practices

1. **Always use failover**: Configure at least one fallback provider
2. **Genre-based routing**: Route genres to optimal provider for cost/quality
3. **Monitor circuit breakers**: Alert when provider circuit opens
4. **Track costs**: Log provider and cost for every generation
5. **Test regularly**: Health check all providers daily
6. **Handle errors gracefully**: Always have fallback logic
7. **Cache responses**: Store generated audio, don't regenerate
8. **Respect rate limits**: Use circuit breakers and backoff

## Troubleshooting

### Circuit Breaker Stuck Open

**Symptom**: Provider always skipped, no generations
**Diagnosis**:
```javascript
const health = provider.getProviderHealth();
console.log(health);
// Output: { name: 'suno', state: 'OPEN', available: false }
```

**Fix**:
```javascript
// Reset circuit breaker
provider.circuitBreakers['suno'].reset();

// Or wait for timeout (default: 2 minutes)
```

### All Providers Failing

**Symptom**: Every generation fails with "All providers failed"
**Diagnosis**:
1. Check API keys: `echo $SUNO_API_KEY`
2. Test endpoints manually (see above)
3. Check rate limits in provider dashboards

**Fix**:
1. Verify API keys in environment variables
2. Check provider status pages
3. Increase circuit breaker timeout
4. Reduce generation rate

### High Costs

**Symptom**: Monthly costs exceed budget
**Diagnosis**:
```sql
SELECT provider, COUNT(*), SUM(cost)
FROM song_generations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY provider;
```

**Fix**:
1. Increase Mubert usage for lofi/ambient
2. Implement user generation limits
3. Add premium tier for unlimited generations
4. Cache popular tracks

## Future Enhancements

1. **A/B Testing**: Compare provider quality with user ratings
2. **Dynamic Pricing**: Adjust routing based on real-time API costs
3. **Quality Scoring**: Route based on provider quality scores
4. **Smart Caching**: Reuse similar prompts across users
5. **Hybrid Generation**: Use multiple providers for different song sections

---

For implementation details, see:
- `.claude/skills/music-provider-adapter/SKILL.md`
- `.claude/skills/api-retry-orchestrator/SKILL.md`
- `.claude/skills/music-generation-helper/SKILL.md`
