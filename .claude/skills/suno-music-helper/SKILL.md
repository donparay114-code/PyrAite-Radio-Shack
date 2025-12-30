---
name: suno-music-helper
description: Help with Suno AI music generation, prompt engineering, and API integration. Use when the user mentions Suno, music generation, song creation, audio generation, or music prompts.
---

# Suno AI Music Generation Helper

## Purpose
Assist with Suno AI music generation, including prompt engineering, API integration, troubleshooting, and workflow optimization.

## System Files

### Suno V7 System Prompt

**Location:** `$PROJECT_ROOT/prompts/SUNO_SYSTEM_MESSAGE_V7_PRODUCTION.md`

This file contains the production system prompt used by the Queue Processor workflow to generate enhanced music prompts via GPT-4o-mini.

### Suno Music Director

**Location:** `$PROJECT_ROOT/src/services/suno_music_director.js`

JavaScript utility for Suno music generation logic.

> **Note:** Actual paths are configured via environment variables. See `.env.example` for configuration.

## Suno API Integration

### API Endpoints

Your Suno API setup (configure in n8n workflows):

**Generate Music:**
```
POST https://your-suno-api.example.com/api/custom_generate
Content-Type: application/json

{
  "prompt": "45-65 word style description",
  "make_instrumental": false,
  "wait_audio": false
}
```

**Check Status:**
```
GET https://your-suno-api.example.com/api/get?ids={job_id}
```

**Response Format:**
```json
{
  "data": [
    {
      "id": "job_id",
      "status": "complete" | "generating" | "failed",
      "audio_url": "https://...",
      "title": "Generated Title",
      "duration": 90
    }
  ]
}
```

## Prompt Engineering

### Suno Prompt Structure

A good Suno prompt consists of:

1. **Style Description** (45-65 words):
   - Genre and subgenre
   - Tempo and energy level
   - Instrumentation
   - Mood and atmosphere
   - Production style
   - Reference artists or eras (if helpful)

2. **Lyrics/Metatags** (for 90-second structure):
   - [Intro]
   - [Verse]
   - [Chorus]
   - [Bridge]
   - [Outro]

### Example Prompts

**Lo-Fi Hip Hop:**
```json
{
  "style": "Chill lo-fi hip hop beat with jazzy piano chords, dusty vinyl crackle, smooth bass line, and laid-back drums. Mellow atmosphere perfect for studying or relaxation. Warm analog sound with subtle tape saturation. Think Nujabes meets J Dilla.",
  "lyrics": "[Intro]\n[Instrumental]\n\n[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]\n\n[Outro]\n[Instrumental with fade]"
}
```

**Epic Orchestral:**
```json
{
  "style": "Cinematic orchestral epic with soaring strings, powerful brass fanfares, thunderous timpani, and choir. Building crescendos with dramatic dynamics. Hans Zimmer inspired production with modern hybrid elements. Heroic and triumphant emotional tone.",
  "lyrics": "[Intro]\n[Quiet strings building]\n\n[Verse]\n[Full orchestra enters]\n\n[Chorus]\n[Massive brass and choir]\n\n[Bridge]\n[Quiet reflection]\n\n[Outro]\n[Triumphant finale]"
}
```

**Synthwave:**
```json
{
  "style": "80s synthwave with pulsing analog synth bass, arpeggiated leads, gated reverb drums, and nostalgic pads. Neon-soaked retro-futuristic vibe. Crisp production with vintage warmth. Think Kavinsky meets Miami Nights 1984.",
  "lyrics": "[Intro]\n[Synth arpeggio]\n\n[Verse]\n[Bass and drums enter]\n\n[Chorus]\n[Full synth layers]\n\n[Solo]\n[Lead synth]\n\n[Outro]\n[Fade to arpeggio]"
}
```

## Workflow Integration

### How Queue Processor Uses Suno

1. **Get queued song** from database
2. **Load Suno V7 system prompt** from file
3. **Generate enhanced prompt** via GPT-4o-mini with system prompt
4. **Call Suno API** with enhanced prompt
5. **Save job ID** to database
6. **Wait 2 minutes**
7. **Check status** via Suno API
8. **Download MP3** if complete
9. **Save to disk** at `$SONGS_DIR` (default: `./data/songs/`)
10. **Update database** with completion status

### Enhancing Prompts with GPT-4o

The Queue Processor uses this pattern:

```javascript
{
  model: "gpt-4o-mini",
  systemMessage: readFileSync('SUNO_SYSTEM_MESSAGE_V7_PRODUCTION.md', 'utf8'),
  prompt: `Create a Suno music prompt for: ${userPrompt}
Genre hint: ${genre}

Return ONLY a JSON object with these fields:
- style: (45-65 words describing musical style)
- lyrics: (metatags for 90-second structure)`
}
```

## Troubleshooting

### Issue: Suno API Not Responding

**Check:**
1. API endpoint is accessible (test in browser)
2. API is deployed and running (Railway/Render)
3. Network connectivity
4. API authentication if required

**Debug:**
```bash
# Test API directly
curl -X POST https://your-suno-api.example.com/api/custom_generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "make_instrumental": false, "wait_audio": false}'
```

### Issue: Generation Stuck in "Generating" Status

**Possible causes:**
- Suno API timeout
- Job failed on Suno side
- Status check not working

**Fix:**
```sql
-- Find stuck jobs
SELECT * FROM radio_station.radio_queue
WHERE suno_status = 'generating'
AND generation_started_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);

-- Reset to queued
UPDATE radio_station.radio_queue
SET suno_status = 'queued',
    generation_started_at = NULL,
    suno_job_id = NULL
WHERE suno_status = 'generating'
AND generation_started_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

### Issue: Generated Music Doesn't Match Prompt

**Improve prompt quality:**
1. Read the Suno V7 system prompt for best practices
2. Use more specific genre descriptors
3. Add reference artists or eras
4. Specify instrumentation clearly
5. Include mood and energy level
6. Test prompts manually first

### Issue: API Returns 429 (Rate Limit)

**Solutions:**
1. Slow down generation rate
2. Implement queue delay
3. Upgrade Suno API plan
4. Add retry logic with exponential backoff

## Best Practices

### Prompt Engineering

1. **Be specific**: "Lo-fi hip hop" vs "chill music"
2. **Use musical terms**: Tempo, key, time signature when relevant
3. **Reference styles**: Artists, eras, genres
4. **Describe production**: Analog, digital, crisp, warm, etc.
5. **Set mood**: Emotional tone and atmosphere
6. **Appropriate length**: 45-65 words for style description

### API Usage

1. **Don't wait inline**: Use async pattern with status polling
2. **Handle failures gracefully**: Retry logic and error handling
3. **Store job IDs**: Always save for status checking
4. **Set timeouts**: Don't poll indefinitely
5. **Cache results**: Download and store MP3s locally

### Quality Control

1. **Test prompts**: Generate samples before production
2. **User feedback**: Track upvotes/downvotes
3. **Moderation**: Filter inappropriate content requests
4. **Genre accuracy**: Validate genre detection
5. **Duration**: Ensure songs meet length requirements

## File Management

### Generated Songs Storage

```
$SONGS_DIR/                          # Default: ./data/songs/
├── {queue_id}_{suno_job_id}.mp3
├── {queue_id}_{suno_job_id}.mp3
└── ...
```

### Cleanup Strategy

```bash
# Find old files (over 30 days)
find $SONGS_DIR -name "*.mp3" -mtime +30

# Archive or delete based on database
```

```sql
-- Get file paths of archived songs
SELECT local_file_path
FROM radio_station.radio_history
WHERE played_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## Genre-Specific Tips

### Electronic Music
- Specify analog vs digital synthesis
- Mention specific synth types (Moog, Prophet, etc.)
- Include production effects (reverb, delay, etc.)

### Rock/Metal
- Specify guitar tones (clean, distorted, heavy)
- Drum style (tight, loose, programmed, live)
- Vocal style if applicable

### Hip Hop/Rap
- Specify beat style (boom bap, trap, lo-fi)
- Sampling style if relevant
- Tempo (slow, mid-tempo, uptempo)

### Classical/Orchestral
- Specify ensemble size
- Historical period if relevant
- Dynamics and articulation

### Ambient/Atmospheric
- Specify texture and layers
- Mood and emotional journey
- Time-based effects

## Integration Points

### With Radio Queue Processor
- Generates music for queued requests
- Enhances user prompts via GPT-4o
- Downloads and stores MP3 files

### With Radio Station Director
- Uses generated MP3s
- Adds DJ intros
- Stitches audio for broadcasting

### With Database
- Stores generation status
- Tracks Suno job IDs
- Links to user requests

## When to Use This Skill

- Writing Suno music prompts
- Troubleshooting Suno API issues
- Understanding music generation workflow
- Improving prompt quality
- Debugging generation failures
- Setting up Suno integration
- Genre-specific music generation
- API rate limit issues
- File management for generated songs
