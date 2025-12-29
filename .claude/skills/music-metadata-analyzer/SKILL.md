---
name: music-metadata-analyzer
description: Extracts and validates music metadata from audio files - BPM, key, energy levels, audio quality, genre classification. Use when analyzing generated tracks, building searchable catalogs, validating song attributes, or detecting duplicates.
---

# Music Metadata Analyzer

Advanced audio metadata extraction and validation for AI-generated music library management.

## Instructions

When analyzing music metadata:

1. **Extract Core Metadata**
   - Use `ffprobe` to get technical audio properties
   - Extract: bitrate, sample rate, duration, codec, format
   - Detect channels (mono/stereo), bit depth
   - Verify file integrity and completeness

2. **Musical Attribute Analysis**
   - Calculate BPM (beats per minute) using audio analysis
   - Detect musical key and mode (major/minor)
   - Measure energy level (0-100 scale)
   - Analyze dynamic range (LUFS, dB range)
   - Detect tempo changes and time signatures

3. **Quality Assessment**
   - Check for clipping and distortion
   - Measure signal-to-noise ratio
   - Detect silence at beginning/end
   - Verify LUFS normalization targets
   - Identify artifacts from generation/mastering

4. **Genre Classification Validation**
   - Verify genre matches audio characteristics
   - Cross-check BPM against genre norms
   - Validate energy levels for genre type
   - Flag misclassified genres
   - Suggest genre corrections

5. **Duplicate Detection**
   - Generate audio fingerprints
   - Compare waveform signatures
   - Detect near-duplicates (>95% similarity)
   - Identify remix/variation relationships
   - Find songs with same lyrics/prompts

## FFprobe Commands

### Basic File Information
```bash
ffprobe -v quiet -print_format json -show_format -show_streams "song.mp3"
```

### Detailed Audio Analysis
```bash
ffprobe -v quiet -print_format json \
  -show_entries stream=codec_name,sample_rate,channels,bit_rate \
  -show_entries format=duration,size,bit_rate \
  "song.mp3"
```

### Loudness Analysis (EBU R128)
```bash
ffmpeg -i "song.mp3" -af ebur128=framelog=verbose -f null - 2>&1 | \
  grep -E "I:|LRA:|Threshold:"
```

### Silence Detection
```bash
ffmpeg -i "song.mp3" -af silencedetect=noise=-50dB:d=1 -f null - 2>&1 | \
  grep silence
```

## BPM Detection

### Using ffmpeg with aubio filter
```bash
ffmpeg -i "song.mp3" -af "aubio=tempo" -f null - 2>&1 | \
  grep "tempo:" | tail -1
```

### Alternative: sox tempo detection
```bash
sox "song.mp3" -t wav - | \
  sox - -n stat 2>&1 | grep "Length"
```

## Database Integration

### Store Extracted Metadata
```sql
ALTER TABLE radio_history ADD COLUMN metadata JSON;

UPDATE radio_history
SET metadata = JSON_OBJECT(
  'bpm', ?,
  'key', ?,
  'energy', ?,
  'duration_sec', ?,
  'bitrate_kbps', ?,
  'sample_rate_hz', ?,
  'lufs', ?,
  'dynamic_range_db', ?,
  'has_clipping', ?,
  'silence_start_sec', ?,
  'silence_end_sec', ?
)
WHERE id = ?;
```

### Search by Metadata
```sql
-- Find songs in compatible keys for mashups
SELECT id, title, metadata->>'$.key' as song_key
FROM radio_history
WHERE metadata->>'$.key' IN ('C Major', 'A Minor')
AND metadata->>'$.bpm' BETWEEN 118 AND 128;

-- Find high-energy songs for peak hours
SELECT id, title, genre, metadata->>'$.energy' as energy
FROM radio_history
WHERE CAST(metadata->>'$.energy' AS UNSIGNED) > 80
ORDER BY energy DESC;
```

## Validation Rules

### Audio Quality Standards
- **Bitrate**: Minimum 192 kbps (prefer 320 kbps)
- **Sample Rate**: 44.1 kHz or 48 kHz
- **LUFS**: Genre-specific targets (-11 to -18 LUFS)
- **Dynamic Range**: Minimum 6 dB (avoid over-compression)
- **Clipping**: Zero clipped samples allowed
- **Duration**: 2-6 minutes (broadcast standard)

### Genre BPM Ranges
```
EDM/Trap: 128-150 BPM
Hip Hop: 80-110 BPM
Rock: 110-140 BPM
Classical: 60-120 BPM (variable)
Lo-Fi: 70-90 BPM
Ambient: 60-80 BPM
Metal: 140-180 BPM
```

### Energy Level Mapping
- **0-30**: Calm (ambient, classical, lo-fi)
- **31-60**: Moderate (pop, indie, acoustic)
- **61-80**: Energetic (rock, dance, upbeat pop)
- **81-100**: High-energy (EDM, metal, trap)

## Examples

### Example 1: Full Song Analysis
User: "Analyze the metadata for all songs in the queue"

Process:
1. Query radio_queue for all pending songs
2. Run ffprobe on each MP3 file
3. Extract BPM, key, duration, quality metrics
4. Store in database metadata column
5. Flag quality issues or mismatches
6. Generate summary report

### Example 2: Genre Validation
User: "Check if all EDM songs actually have EDM characteristics"

Process:
1. Select all songs with genre='EDM'
2. Analyze BPM (should be 128-150)
3. Check energy levels (should be >70)
4. Verify dynamic range (EDM is compressed)
5. Flag outliers for reclassification

### Example 3: Duplicate Detection
User: "Find duplicate or very similar songs"

Process:
1. Generate audio fingerprints for all songs
2. Compare fingerprints using similarity threshold
3. Group similar songs together
4. Check for same user/prompt combinations
5. Report duplicates with similarity scores

## Output Format

### Metadata Report
```
Song: "Midnight Dreams" (ID: 1234)
═══════════════════════════════════════
Technical Properties:
  Format: MP3 (MPEG-1 Layer 3)
  Bitrate: 320 kbps (CBR)
  Sample Rate: 44.1 kHz
  Channels: Stereo
  Duration: 3:42 (222 seconds)

Musical Attributes:
  BPM: 128
  Key: C Major
  Energy Level: 85/100 (High Energy)
  Time Signature: 4/4

Quality Metrics:
  LUFS: -11.2 (Target: -11.0 for EDM)
  Dynamic Range: 8.2 dB
  Peak Level: -0.1 dB (no clipping)
  SNR: 92 dB (excellent)

Validation:
  ✓ Genre match confirmed (EDM)
  ✓ BPM within expected range
  ✓ Audio quality meets standards
  ⚠ Slight LUFS deviation (+0.2 LUFS)
```

## Best Practices

- Run metadata extraction on mastered files (post-processing)
- Store metadata in JSON columns for flexible querying
- Update metadata when files are reprocessed
- Use metadata for intelligent playlist generation
- Flag quality issues immediately for review
- Build searchable indexes on common attributes
- Validate metadata against genre expectations
- Archive fingerprints for duplicate detection
- Monitor metadata drift over time (generation quality changes)
- Use metadata to optimize mastering parameters

## Integration Points

- **Mastering Workflow**: Validate before/after LUFS normalization
- **Playlist Builder**: Use BPM/energy for song sequencing
- **Queue Optimizer**: Prioritize high-quality tracks
- **Analytics Dashboard**: Track quality trends over time
- **User Feedback**: Correlate metadata with upvotes/skips
