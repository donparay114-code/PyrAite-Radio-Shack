---
name: music-provider-adapter
description: Provider-agnostic music generation using adapter pattern. Supports Suno, Stable Audio, Mubert with seamless switching. Use when implementing or switching music providers.
allowed-tools: Read, Write, Bash
---

# Music Provider Adapter

## Purpose
Implement provider-agnostic music generation using the adapter pattern, enabling seamless switching between Suno, Stable Audio, Mubert, and future providers.

## Problem Statement

### Hardcoded Provider Risk

```javascript
// BAD: Tightly coupled to Suno
const sunoResponse = await fetch('https://api.sunoapi.org/v1/music/generate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${SUNO_API_KEY}` },
  body: JSON.stringify({ prompt, duration, tags })
});

// What happens if:
// - SunoAPI.org goes down?
// - Pricing changes drastically?
// - Need to switch providers for specific genres?
```

**Risks:**
- Single point of failure
- Vendor lock-in
- No AB testing capability
- Can't compare quality/cost

### Solution: Adapter Pattern

```javascript
// GOOD: Provider-agnostic
const provider = MusicProviderFactory.create(process.env.MUSIC_PROVIDER);
const track = await provider.generate({ prompt, duration, genre });
```

**Benefits:**
- Emergency failover in minutes
- A/B test different providers
- Genre-specific routing (Suno for rap, Mubert for ambient)
- Cost optimization

## Architecture

### Base Provider Interface

```javascript
// music-providers/base-provider.js

class MusicProvider {
  constructor(config) {
    this.name = 'base';
    this.config = config;
  }

  /**
   * Generate music from prompt
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {number} options.duration - Seconds (30-180)
   * @param {string} options.genre - Genre tag
   * @param {Object} options.metadata - Additional metadata
   * @returns {Promise<GenerationResponse>}
   */
  async generate({ prompt, duration, genre, metadata = {} }) {
    throw new Error('Must implement generate()');
  }

  /**
   * Check generation status
   * @param {string} taskId
   * @returns {Promise<StatusResponse>}
   */
  async checkStatus(taskId) {
    throw new Error('Must implement checkStatus()');
  }

  /**
   * Download generated audio
   * @param {string} taskId
   * @returns {Promise<DownloadResponse>}
   */
  async downloadAudio(taskId) {
    throw new Error('Must implement downloadAudio()');
  }

  /**
   * Normalize provider-specific response to standard format
   * @param {Object} rawResponse
   * @returns {NormalizedResponse}
   */
  normalizeResponse(rawResponse) {
    throw new Error('Must implement normalizeResponse()');
  }

  /**
   * Validate if provider is available
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('Must implement healthCheck()');
  }
}

module.exports = MusicProvider;
```

### Standard Response Format

```javascript
// Normalized response (all providers return this)
{
  taskId: String,           // Unique generation ID
  status: String,           // 'pending' | 'processing' | 'completed' | 'failed'
  audioUrl: String | null,  // Download URL (if completed)
  duration: Number,         // Actual duration in seconds
  metadata: {
    provider: String,       // 'suno' | 'stable-audio' | 'mubert'
    model: String,          // Model version used
    bpm: Number,            // Beats per minute
    key: String,            // Musical key (if available)
    energy: Number,         // 0-1 scale
    cost: Number            // API cost in USD
  },
  error: String | null      // Error message (if failed)
}
```

## Provider Implementations

### Suno Provider

```javascript
// music-providers/suno-provider.js

const MusicProvider = require('./base-provider');
const fetch = require('node-fetch');

class SunoProvider extends MusicProvider {
  constructor(apiKey, baseUrl = 'https://api.sunoapi.org') {
    super({ apiKey, baseUrl });
    this.name = 'suno';
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async generate({ prompt, duration, genre, metadata = {} }) {
    const response = await fetch(`${this.baseUrl}/v1/music/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        duration,
        tags: [genre],
        make_instrumental: metadata.instrumental || false,
        custom_mode: false
      })
    });

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  async checkStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/v1/music/${taskId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  async downloadAudio(taskId) {
    const status = await this.checkStatus(taskId);

    if (status.status !== 'completed') {
      throw new Error(`Cannot download: status is ${status.status}`);
    }

    return {
      audioUrl: status.audioUrl,
      metadata: status.metadata
    };
  }

  normalizeResponse(rawResponse) {
    return {
      taskId: rawResponse.task_id || rawResponse.id,
      status: this._mapStatus(rawResponse.status),
      audioUrl: rawResponse.audio_url || null,
      duration: rawResponse.duration || 0,
      metadata: {
        provider: 'suno',
        model: rawResponse.model_version || 'v3',
        bpm: rawResponse.metadata?.bpm || null,
        key: rawResponse.metadata?.key || null,
        energy: this._calculateEnergy(rawResponse.tags),
        cost: 0.10 // $0.10 per generation
      },
      error: rawResponse.error || null
    };
  }

  _mapStatus(sunoStatus) {
    const mapping = {
      'queued': 'pending',
      'running': 'processing',
      'processing': 'processing',
      'complete': 'completed',
      'error': 'failed',
      'failed': 'failed'
    };
    return mapping[sunoStatus] || 'pending';
  }

  _calculateEnergy(tags) {
    const energyMap = {
      'rap': 0.8,
      'lofi': 0.3,
      'electronic': 0.9,
      'jazz': 0.4,
      'rock': 0.85
    };
    const genre = tags?.[0]?.toLowerCase();
    return energyMap[genre] || 0.5;
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (err) {
      return false;
    }
  }
}

module.exports = SunoProvider;
```

### Stable Audio Provider

```javascript
// music-providers/stable-audio-provider.js

const MusicProvider = require('./base-provider');
const fetch = require('node-fetch');

class StableAudioProvider extends MusicProvider {
  constructor(apiKey) {
    super({ apiKey });
    this.name = 'stable-audio';
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.stability.ai/v2beta/stable-audio';
  }

  async generate({ prompt, duration, genre, metadata = {} }) {
    const response = await fetch(`${this.baseUrl}/generate/music`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: `${genre} music: ${prompt}`,
        duration_seconds: duration,
        output_format: 'mp3',
        cfg_scale: 7.0
      })
    });

    if (!response.ok) {
      throw new Error(`Stable Audio error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  async checkStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/results/${taskId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  async downloadAudio(taskId) {
    const status = await this.checkStatus(taskId);

    if (status.status !== 'completed') {
      throw new Error(`Cannot download: status is ${status.status}`);
    }

    return {
      audioUrl: status.audioUrl,
      metadata: status.metadata
    };
  }

  normalizeResponse(rawResponse) {
    return {
      taskId: rawResponse.id,
      status: this._mapStatus(rawResponse.status),
      audioUrl: rawResponse.audio_url || null,
      duration: rawResponse.duration_seconds || 0,
      metadata: {
        provider: 'stable-audio',
        model: 'stable-audio-v1',
        bpm: null, // Stable Audio doesn't return BPM
        key: null,
        energy: 0.5,
        cost: 0.15 // $0.15 per generation
      },
      error: rawResponse.error || null
    };
  }

  _mapStatus(stableStatus) {
    const mapping = {
      'pending': 'pending',
      'in-progress': 'processing',
      'processing': 'processing',
      'complete': 'completed',
      'completed': 'completed',
      'failed': 'failed'
    };
    return mapping[stableStatus] || 'pending';
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (err) {
      return false;
    }
  }
}

module.exports = StableAudioProvider;
```

### Mubert Provider

```javascript
// music-providers/mubert-provider.js

const MusicProvider = require('./base-provider');
const fetch = require('node-fetch');

class MubertProvider extends MusicProvider {
  constructor(licenseKey) {
    super({ licenseKey });
    this.name = 'mubert';
    this.licenseKey = licenseKey;
    this.baseUrl = 'https://api-b2b.mubert.com/v2';
  }

  async generate({ prompt, duration, genre, metadata = {} }) {
    const response = await fetch(`${this.baseUrl}/RecordTrack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'RecordTrack',
        params: {
          license: this.licenseKey,
          mode: 'track',
          tags: genre,
          duration: duration
        }
      })
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  async checkStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/TrackStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'TrackStatus',
        params: {
          license: this.licenseKey,
          track_id: taskId
        }
      })
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }

  async downloadAudio(taskId) {
    const status = await this.checkStatus(taskId);

    if (status.status !== 'completed') {
      throw new Error(`Cannot download: status is ${status.status}`);
    }

    return {
      audioUrl: status.audioUrl,
      metadata: status.metadata
    };
  }

  normalizeResponse(rawResponse) {
    return {
      taskId: rawResponse.data?.track_id || rawResponse.track_id,
      status: this._mapStatus(rawResponse.data?.status),
      audioUrl: rawResponse.data?.tasks?.[0]?.download_link || null,
      duration: rawResponse.data?.duration || 0,
      metadata: {
        provider: 'mubert',
        model: 'mubert-v2',
        bpm: null,
        key: null,
        energy: 0.5,
        cost: 0.05 // $0.05 per generation
      },
      error: rawResponse.error || null
    };
  }

  _mapStatus(mubertStatus) {
    const mapping = {
      'processing': 'processing',
      'ready': 'completed',
      'error': 'failed'
    };
    return mapping[mubertStatus] || 'pending';
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/GetServiceAccess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GetServiceAccess',
          params: { license: this.licenseKey }
        })
      });
      const data = await response.json();
      return data.status === 1;
    } catch (err) {
      return false;
    }
  }
}

module.exports = MubertProvider;
```

## Provider Factory

```javascript
// music-providers/factory.js

const SunoProvider = require('./suno-provider');
const StableAudioProvider = require('./stable-audio-provider');
const MubertProvider = require('./mubert-provider');

class MusicProviderFactory {
  static create(providerName = process.env.MUSIC_PROVIDER || 'suno') {
    switch (providerName.toLowerCase()) {
      case 'suno':
        return new SunoProvider(
          process.env.SUNO_API_KEY,
          process.env.SUNO_BASE_URL
        );

      case 'stable-audio':
      case 'stability':
        return new StableAudioProvider(
          process.env.STABILITY_API_KEY
        );

      case 'mubert':
        return new MubertProvider(
          process.env.MUBERT_LICENSE_KEY
        );

      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  static async createWithFallback(primary, fallback) {
    const primaryProvider = this.create(primary);

    const isHealthy = await primaryProvider.healthCheck();
    if (isHealthy) {
      return primaryProvider;
    }

    console.warn(`Primary provider ${primary} is unhealthy, using fallback ${fallback}`);
    return this.create(fallback);
  }
}

module.exports = MusicProviderFactory;
```

## n8n Integration

### Function Node: Initialize Provider

```javascript
// n8n Function Node: "Initialize Music Provider"
const MusicProviderFactory = require('./music-providers/factory');

const PROVIDER = $env.MUSIC_PROVIDER || 'suno';
const FALLBACK = $env.FALLBACK_PROVIDER || 'stable-audio';

// Create provider with automatic fallback
const provider = await MusicProviderFactory.createWithFallback(PROVIDER, FALLBACK);

console.log(`Using music provider: ${provider.name}`);

return {
  provider: provider.name,
  config: provider.config
};
```

### Function Node: Generate Music

```javascript
// n8n Function Node: "Generate Music"
const MusicProviderFactory = require('./music-providers/factory');

const provider = MusicProviderFactory.create($env.MUSIC_PROVIDER);

const result = await provider.generate({
  prompt: $json.prompt,
  duration: $json.duration || 60,
  genre: $json.genre,
  metadata: {
    instrumental: $json.instrumental || false
  }
});

return {
  taskId: result.taskId,
  provider: result.metadata.provider,
  status: result.status,
  estimatedCost: result.metadata.cost
};
```

### Function Node: Check Status

```javascript
// n8n Function Node: "Check Generation Status"
const MusicProviderFactory = require('./music-providers/factory');

const provider = MusicProviderFactory.create($env.MUSIC_PROVIDER);

const result = await provider.checkStatus($json.taskId);

return {
  taskId: result.taskId,
  status: result.status,
  audioUrl: result.audioUrl,
  duration: result.duration,
  metadata: result.metadata
};
```

## Genre-Specific Routing

```javascript
// music-providers/smart-router.js

class SmartMusicRouter {
  static getProviderForGenre(genre) {
    const genreMap = {
      'rap': 'suno',           // Best for lyrics
      'lofi': 'mubert',        // Best for ambient
      'electronic': 'suno',    // High energy
      'jazz': 'stable-audio',  // Complex harmonies
      'ambient': 'mubert',     // Continuous streams
      'orchestral': 'stable-audio'
    };

    return genreMap[genre.toLowerCase()] || 'suno';
  }

  static async generateWithOptimalProvider({ prompt, duration, genre }) {
    const providerName = this.getProviderForGenre(genre);
    const provider = MusicProviderFactory.create(providerName);

    console.log(`Routing ${genre} to ${providerName}`);

    return await provider.generate({ prompt, duration, genre });
  }
}

module.exports = SmartMusicRouter;
```

## Environment Configuration

```bash
# .env
# Primary provider
MUSIC_PROVIDER=suno

# Fallback provider (if primary fails)
FALLBACK_PROVIDER=stable-audio

# Suno configuration
SUNO_API_KEY=your-suno-key-here
SUNO_BASE_URL=https://api.sunoapi.org

# Stable Audio configuration
STABILITY_API_KEY=your-stability-key-here

# Mubert configuration
MUBERT_LICENSE_KEY=your-mubert-license-here

# Smart routing (optional)
USE_GENRE_ROUTING=true
```

## Emergency Provider Switch

```bash
# If Suno goes down, switch to Stable Audio immediately:

# Update environment variable
export MUSIC_PROVIDER=stable-audio

# Or update .env and restart n8n
sed -i 's/MUSIC_PROVIDER=suno/MUSIC_PROVIDER=stable-audio/' .env
docker-compose restart n8n
```

**Result:** Radio continues without interruption!

## Cost Comparison

| Provider | Cost/Track | Quality | Speed | Lyrics |
|----------|------------|---------|-------|--------|
| Suno | $0.10 | ⭐⭐⭐⭐⭐ | 60-90s | ✅ Yes |
| Stable Audio | $0.15 | ⭐⭐⭐⭐ | 30-45s | ❌ No |
| Mubert | $0.05 | ⭐⭐⭐ | 10-20s | ❌ No |

**Smart Strategy:**
- Use **Suno** for rap/hip-hop (needs lyrics)
- Use **Mubert** for lofi/ambient (cheaper, faster)
- Use **Stable Audio** as failover

## Testing

```javascript
// test-providers.js

const MusicProviderFactory = require('./music-providers/factory');

async function testAllProviders() {
  const providers = ['suno', 'stable-audio', 'mubert'];
  const prompt = 'Relaxing lofi beats for studying';

  for (const providerName of providers) {
    try {
      const provider = MusicProviderFactory.create(providerName);

      console.log(`\n Testing ${providerName}...`);

      const result = await provider.generate({
        prompt,
        duration: 60,
        genre: 'lofi'
      });

      console.log(`✅ ${providerName} generated: ${result.taskId}`);
      console.log(`   Cost: $${result.metadata.cost}`);
    } catch (err) {
      console.error(`❌ ${providerName} failed: ${err.message}`);
    }
  }
}

testAllProviders();
```

## When to Use This Skill

- Implementing music generation with multiple providers
- Adding provider failover capability
- Routing genres to optimal providers
- Comparing provider costs and quality
- Emergency provider switching
- AB testing different providers
- Building provider-agnostic workflows
