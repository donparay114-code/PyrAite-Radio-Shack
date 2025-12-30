---
name: music-generation-helper
description: Help with AI music generation across multiple providers (Suno, Stable Audio, Mubert). Use when the user mentions music generation, song creation, audio generation, music prompts, or provider selection.
---

# AI Music Generation Helper

## Purpose
Assist with AI music generation across multiple providers, including prompt engineering, API integration, provider selection, troubleshooting, and workflow optimization.

## Supported Providers

### Provider Comparison

| Provider | Cost/Track | Speed | Strengths | Best For |
|----------|-----------|-------|-----------|----------|
| **Suno** | $0.10 | 2-3 min | Lyrics, diverse genres | Rap, rock, pop with vocals |
| **Stable Audio** | $0.15 | 1-2 min | Fast, consistent quality | Electronic, ambient, quick turnaround |
| **Mubert** | $0.05 | 30-60s | Cheap, lofi/ambient | Background music, lofi, study beats |

### Provider Selection Strategy

**By Genre:**
```javascript
const genreToProvider = {
  'rap': 'suno',           // Best lyrics support
  'hip-hop': 'suno',
  'rock': 'suno',
  'pop': 'suno',
  'lofi': 'mubert',        // Cheapest for ambient
  'ambient': 'mubert',
  'study': 'mubert',
  'electronic': 'stable-audio', // Fast + quality
  'edm': 'stable-audio',
  'house': 'stable-audio'
};
```

**By Priority:**
1. **Cost-sensitive**: Mubert → Stable Audio → Suno
2. **Quality-focused**: Suno → Stable Audio → Mubert
3. **Speed-focused**: Stable Audio → Mubert → Suno

## Provider-Specific Details

### Suno API

**Endpoints:**
```
POST /api/custom_generate
GET /api/get?ids={job_id}
```

**Request:**
```json
{
  "prompt": "45-65 word style description",
  "make_instrumental": false,
  "wait_audio": false
}
```

**Response:**
```json
{
  "data": [{
    "id": "job_id",
    "status": "complete" | "generating" | "failed",
    "audio_url": "https://...",
    "title": "Generated Title",
    "duration": 90
  }]
}
```

**Prompt Structure:**
- **Style**: 45-65 words (genre, tempo, instrumentation, mood, references)
- **Lyrics**: Metatags for structure ([Intro], [Verse], [Chorus], [Outro])

**Example Prompt:**
```json
{
  "style": "Energetic boom bap hip hop with punchy 808 bass, crispy snares, vinyl crackle, and jazzy piano samples. Classic 90s production style with modern clarity. Think DJ Premier meets J Dilla. Hard-hitting drums with head-nodding groove.",
  "lyrics": "[Intro]\n[Instrumental]\n\n[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]\n\n[Outro]\n[Instrumental]"
}
```

### Stable Audio API

**Endpoints:**
```
POST /v1/generate
GET /v1/tasks/{task_id}
```

**Request:**
```json
{
  "prompt": "Dark techno with driving bassline and hypnotic arpeggios",
  "duration": 120,
  "output_format": "mp3"
}
```

**Response:**
```json
{
  "task_id": "task_xyz",
  "status": "pending" | "processing" | "completed" | "failed",
  "audio_url": "https://...",
  "duration": 120
}
```

**Prompt Structure:**
- Concise description (10-30 words)
- Focus on: genre, mood, key elements
- Less detailed than Suno

**Example Prompt:**
```
"Dark techno with driving 909 kick, acid bassline, metallic hi-hats, and atmospheric pads. Industrial warehouse vibe."
```

### Mubert API

**Endpoints:**
```
POST /v2/RecTrackTT
GET /v2/GetTrack?track_id={id}
```

**Request:**
```json
{
  "method": "RecTrackTT",
  "params": {
    "tags": "lofi,chill,study,piano",
    "mode": "track",
    "duration": 180
  }
}
```

**Response:**
```json
{
  "data": {
    "track_id": "12345",
    "track_url": "https://...",
    "duration": 180
  }
}
```

**Prompt Structure:**
- Tag-based (comma-separated)
- Available tags: lofi, chill, study, ambient, electronic, etc.
- No natural language

**Example Prompt:**
```
"lofi,chill,piano,vinyl,jazzy,study"
```

## Prompt Engineering

### Cross-Provider Prompt Conversion

**User Request → Provider Prompts:**

```javascript
// User: "chill lofi beats for studying"

// Suno Prompt:
{
  style: "Relaxing lo-fi hip hop with gentle piano chords, soft vinyl crackle, mellow bass, and laid-back drums. Warm analog sound perfect for studying or focus. Nujabes-inspired production with nostalgic atmosphere.",
  lyrics: "[Intro]\n[Instrumental]\n\n[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]\n\n[Outro]\n[Instrumental]"
}

// Stable Audio Prompt:
"Chill lo-fi hip hop with jazzy piano, vinyl crackle, soft drums, and warm bass. Relaxed study vibe."

// Mubert Tags:
"lofi,chill,study,piano,jazzy,vinyl,mellow"
```

### Prompt Enhancement via GPT-4o

The Queue Processor enhances user prompts before sending to providers:

```javascript
{
  model: "gpt-4o-mini",
  systemMessage: readFileSync('MUSIC_GENERATION_SYSTEM_V1.md', 'utf8'),
  prompt: `Convert this user request to optimized prompts for each provider:

User Request: ${userPrompt}
Genre: ${genre}
Provider: ${selectedProvider}

Return JSON with:
{
  "suno": { "style": "...", "lyrics": "..." },
  "stableAudio": "...",
  "mubert": "..."
}`
}
```

## Integration with Provider Adapter

### Using the Music Provider Adapter

```javascript
const MusicProviderFactory = require('./music-provider-adapter');

// Create provider with failover
const provider = await MusicProviderFactory.createWithFallback(
  'suno',          // Primary
  'stable-audio'   // Fallback
);

// Generate music
const result = await provider.generate({
  prompt: enhancedPrompt,
  duration: 120,
  genre: 'rap',
  metadata: { userId: 123, requestId: 456 }
});

// Result includes provider info
console.log(result);
// {
//   taskId: "abc123",
//   status: "completed",
//   audioUrl: "https://...",
//   duration: 120,
//   metadata: {
//     provider: "suno",
//     fallbackUsed: false,
//     cost: 0.10,
//     generationTime: 145
//   }
// }
```

### Workflow Integration

**Updated Queue Processor Flow:**

1. **Get queued song** from PostgreSQL
2. **Select provider** based on genre/cost/availability
3. **Load system prompt** for prompt enhancement
4. **Generate enhanced prompts** via GPT-4o-mini (all providers)
5. **Initialize provider** with failover
6. **Call provider.generate()** with selected prompt
7. **Save task ID** to database
8. **Poll status** until complete
9. **Download audio** when ready
10. **Save to storage** at `/var/radio/tracks/`
11. **Update database** with completion status + metadata

## Troubleshooting

### Provider Not Responding

**Diagnosis:**
```bash
# Test Suno
curl -X POST https://api.suno.ai/api/custom_generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUNO_API_KEY" \
  -d '{"prompt": "test", "make_instrumental": false}'

# Test Stable Audio
curl -X POST https://api.stability.ai/v1/audio/generate \
  -H "Authorization: Bearer $STABILITY_API_KEY" \
  -d '{"prompt": "test", "duration": 30}'

# Test Mubert
curl -X POST https://api.mubert.com/v2/RecTrackTT \
  -H "Content-Type: application/json" \
  -d '{"method": "RecTrackTT", "params": {"tags": "chill", "duration": 30}}'
```

**Solutions:**
1. Check API keys in environment variables
2. Verify API endpoints are accessible
3. Check rate limits
4. Try fallback provider
5. Check circuit breaker status

### Generation Stuck

**PostgreSQL Query:**
```sql
-- Find stuck jobs (PostgreSQL)
SELECT * FROM radio_queue
WHERE suno_status = 'generating'
AND generation_started_at < NOW() - INTERVAL '10 minutes';

-- Reset to queued
UPDATE radio_queue
SET suno_status = 'queued',
    generation_started_at = NULL,
    task_id = NULL
WHERE suno_status = 'generating'
AND generation_started_at < NOW() - INTERVAL '10 minutes';
```

### Quality Issues

**Provider-Specific Fixes:**

**Suno:**
- Increase prompt detail (45-65 words)
- Add reference artists
- Specify instrumentation clearly

**Stable Audio:**
- Keep prompt concise (10-30 words)
- Focus on key elements
- Use clear genre terms

**Mubert:**
- Use multiple relevant tags (5-8)
- Combine mood + genre + instruments
- Test tag combinations

### Rate Limiting

**Provider Rate Limits:**
- **Suno**: 5 requests/min
- **Stable Audio**: 10 requests/min
- **Mubert**: 20 requests/min

**Solutions:**
1. Implement queue delay between generations
2. Use circuit breaker pattern
3. Distribute across providers
4. Upgrade API tier

## Cost Optimization

### Monthly Cost Analysis

**Scenario: 1000 tracks/month**

| Strategy | Cost | Providers Used |
|----------|------|----------------|
| Suno Only | $100 | 100% Suno |
| Stable Only | $150 | 100% Stable Audio |
| Mubert Only | $50 | 100% Mubert |
| **Smart Routing** | **$70** | 40% Mubert, 40% Suno, 20% Stable |

**Smart Routing:**
```javascript
// Route by genre for cost optimization
if (genre === 'lofi' || genre === 'ambient') {
  provider = 'mubert'; // $0.05
} else if (genre === 'electronic' || urgency === 'high') {
  provider = 'stable-audio'; // $0.15 but faster
} else {
  provider = 'suno'; // $0.10 best quality
}
```

### Savings Strategies

1. **Genre-based routing**: Save 30% by using Mubert for lofi/ambient
2. **Batch processing**: Reduce API overhead
3. **Cache popular tracks**: Avoid regeneration
4. **User limits**: Cap free tier generations
5. **Provider health monitoring**: Use cheapest available provider

## File Management

### Storage Structure

```
/var/radio/tracks/
├── {queue_id}_{provider}_{task_id}.mp3
├── 123_suno_abc456.mp3
├── 124_stable-audio_def789.mp3
└── 125_mubert_ghi012.mp3
```

### Database Schema

```sql
-- PostgreSQL table for tracking generations
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

-- Index for status checks
CREATE INDEX idx_generations_status ON song_generations(status, provider);

-- Index for cost tracking
CREATE INDEX idx_generations_cost ON song_generations(created_at, provider);
```

## Best Practices

### Provider Selection
1. Route by genre for optimal quality
2. Use cost-aware fallback
3. Monitor provider health
4. Track generation success rates

### Prompt Quality
1. Use GPT-4o for enhancement
2. Provider-specific formatting
3. Test prompts before production
4. Collect user feedback

### API Usage
1. Use async polling pattern
2. Implement retry with backoff
3. Store task IDs in database
4. Set generation timeouts
5. Cache downloaded audio

### Monitoring
1. Track cost per provider
2. Monitor generation times
3. Log failure rates
4. Alert on circuit breaker trips

## When to Use This Skill

- Generating music across multiple providers
- Selecting optimal provider for genre/cost
- Writing provider-specific prompts
- Troubleshooting generation issues
- Optimizing music generation costs
- Setting up provider failover
- Debugging API integration
- Analyzing provider performance
