---
name: audio-quality-validator
description: Validates audio files for broadcast quality - detects clipping, silence, artifacts, verifies LUFS normalization, checks bitrate and format compliance. Use when validating generated or mastered audio before adding to rotation.
---

# Audio Quality Validator

Pre-broadcast audio quality assurance using FFmpeg analysis and industry standards.

## Instructions

When validating audio quality:

1. **Technical Format Validation**
   - Verify file format (MP3, WAV, FLAC)
   - Check bitrate (minimum 192 kbps, prefer 320 kbps)
   - Validate sample rate (44.1 kHz or 48 kHz)
   - Confirm stereo channels (mono flagged as warning)
   - Check file integrity (no corruption)

2. **Loudness Normalization Check**
   - Measure integrated LUFS (target: -14 LUFS default)
   - Verify genre-specific LUFS targets
   - Calculate true peak level (max -1 dBTP)
   - Check loudness range (LRA: 6-12 dB ideal)
   - Flag over-compressed audio (LRA < 4 dB)

3. **Audio Artifact Detection**
   - Detect clipping (zero clipped samples allowed)
   - Identify distortion and harmonic artifacts
   - Find phase issues (stereo correlation)
   - Detect compression artifacts (MP3 quality)
   - Flag noise and hiss (signal-to-noise ratio)

4. **Silence and Duration Validation**
   - Detect excessive silence at start (>2 seconds)
   - Detect excessive silence at end (>2 seconds)
   - Validate duration (2-6 minutes for broadcast)
   - Check for mid-song silence gaps
   - Ensure continuous audio content

5. **Broadcast Compliance**
   - EBU R128 loudness compliance
   - Peak level compliance (-1 dBTP maximum)
   - Frequency range check (20 Hz - 20 kHz)
   - Dynamic range compliance (not brick-walled)
   - Format compatibility (platform requirements)

## FFmpeg Validation Commands

### Complete Audio Analysis
```bash
#!/bin/bash
AUDIO_FILE="$1"

# Full analysis combining multiple filters
ffmpeg -i "$AUDIO_FILE" \
  -af "ebur128=framelog=verbose,astats=metadata=1:reset=1,silencedetect=n=-50dB:d=2" \
  -f null - 2>&1 | tee audio_analysis.log

# Extract key metrics
echo "=== ANALYSIS RESULTS ==="

# LUFS values
echo "Integrated LUFS:"
grep "I:" audio_analysis.log | tail -1

echo "Loudness Range:"
grep "LRA:" audio_analysis.log | tail -1

echo "True Peak:"
grep "Peak:" audio_analysis.log | tail -1

# Statistics
echo "Audio Stats:"
grep -E "RMS level|Peak level|Flat factor" audio_analysis.log
```

### Quick Quality Check
```bash
ffprobe -v error -show_entries \
  format=duration,bit_rate,format_name : \
  stream=codec_name,sample_rate,channels,bits_per_sample \
  -of json "$AUDIO_FILE"
```

### Clipping Detection
```bash
# Detect any samples at maximum amplitude (clipping)
ffmpeg -i "$AUDIO_FILE" -af "astats=metadata=1:reset=1" -f null - 2>&1 | \
  grep -E "Peak level|Number of samples|Clipping"
```

### Silence Detection
```bash
# Find silence at beginning and end
ffmpeg -i "$AUDIO_FILE" \
  -af silencedetect=noise=-50dB:d=2 \
  -f null - 2>&1 | grep -E "silence_start|silence_end|silence_duration"
```

### EBU R128 Loudness Analysis
```bash
# Detailed loudness analysis
ffmpeg -i "$AUDIO_FILE" \
  -af ebur128=peak=true:framelog=verbose \
  -f null - 2>&1 > loudness_report.txt

# Parse results
echo "Integrated Loudness (I):" $(grep "I:" loudness_report.txt | tail -1 | awk '{print $2}' | tr -d 'I:')
echo "Loudness Range (LRA):" $(grep "LRA:" loudness_report.txt | tail -1 | awk '{print $2}' | tr -d 'LRA:')
echo "True Peak (TP):" $(grep "Peak:" loudness_report.txt | tail -1 | awk '{print $4}')
```

## Quality Validation Rules

### Critical Failures (Block Broadcast)
```javascript
const CRITICAL_FAILURES = {
  clipping: {
    threshold: 0,  // Zero samples allowed
    message: "Audio contains clipping - will distort on playback"
  },
  truePeak: {
    max: -1.0,  // dBTP
    message: "True peak exceeds -1 dBTP - risk of distortion"
  },
  duration: {
    min: 120,  // 2 minutes
    max: 360,  // 6 minutes
    message: "Duration outside broadcast range (2-6 minutes)"
  },
  bitrate: {
    min: 192,  // kbps
    message: "Bitrate below 192 kbps - insufficient quality"
  },
  corruption: {
    check: true,
    message: "File corrupted or unreadable"
  }
};
```

### Warnings (Allow but Flag)
```javascript
const WARNINGS = {
  lufsDeviation: {
    tolerance: 1.5,  // ±1.5 LU from target
    message: "LUFS outside target range - may sound quieter/louder than other tracks"
  },
  dynamicRange: {
    min: 4,  // dB LRA
    message: "Overly compressed - lacks dynamics"
  },
  stereoWidth: {
    min: 0.5,  // Correlation coefficient
    max: 1.0,
    message: "Stereo image too narrow or phase issues"
  },
  leadingSilence: {
    max: 2,  // seconds
    message: "Excessive silence at start - should trim"
  },
  trailingSilence: {
    max: 2,  // seconds
    message: "Excessive silence at end - should trim"
  },
  bitrate: {
    preferred: 320,  // kbps
    message: "Bitrate below 320 kbps - higher quality preferred"
  }
};
```

## Database Integration

### Quality Validation Results Table
```sql
CREATE TABLE audio_quality_checks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  song_id INT,
  check_type ENUM('pre_generation', 'post_generation', 'post_mastering', 'pre_broadcast'),
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Technical specs
  file_format VARCHAR(10),
  bitrate_kbps INT,
  sample_rate_hz INT,
  duration_sec DECIMAL(6,2),
  file_size_mb DECIMAL(8,2),

  -- Loudness metrics
  integrated_lufs DECIMAL(5,2),
  lufs_target DECIMAL(5,2),
  lufs_deviation DECIMAL(5,2),
  loudness_range_db DECIMAL(5,2),
  true_peak_dbtp DECIMAL(5,2),

  -- Quality flags
  has_clipping BOOLEAN DEFAULT FALSE,
  clipped_samples INT DEFAULT 0,
  has_artifacts BOOLEAN DEFAULT FALSE,
  leading_silence_sec DECIMAL(5,2),
  trailing_silence_sec DECIMAL(5,2),
  signal_to_noise_db DECIMAL(5,2),

  -- Validation result
  validation_status ENUM('pass', 'pass_with_warnings', 'fail'),
  failure_reasons JSON,  -- Array of failure messages
  warnings JSON,  -- Array of warning messages

  FOREIGN KEY (song_id) REFERENCES radio_history(id),
  INDEX idx_status (validation_status),
  INDEX idx_check_type (check_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Store Validation Results
```sql
-- Stored procedure to save quality check
DELIMITER //
CREATE PROCEDURE save_quality_check(
  IN p_song_id INT,
  IN p_check_type VARCHAR(20),
  IN p_integrated_lufs DECIMAL(5,2),
  IN p_true_peak DECIMAL(5,2),
  IN p_lra DECIMAL(5,2),
  IN p_clipping BOOLEAN,
  IN p_leading_silence DECIMAL(5,2),
  IN p_trailing_silence DECIMAL(5,2),
  OUT p_validation_status VARCHAR(20),
  OUT p_failure_reasons JSON,
  OUT p_warnings JSON
)
BEGIN
  DECLARE lufs_target DECIMAL(5,2);
  DECLARE lufs_dev DECIMAL(5,2);
  DECLARE failures JSON;
  DECLARE warns JSON;

  -- Get target LUFS for this song's genre
  SELECT get_genre_lufs_target((SELECT genre FROM radio_history WHERE id = p_song_id))
  INTO lufs_target;

  -- Calculate deviation
  SET lufs_dev = ABS(p_integrated_lufs - lufs_target);

  -- Initialize JSON arrays
  SET failures = JSON_ARRAY();
  SET warns = JSON_ARRAY();

  -- Check for critical failures
  IF p_clipping = TRUE THEN
    SET failures = JSON_ARRAY_APPEND(failures, '$', 'Audio contains clipping');
  END IF;

  IF p_true_peak > -1.0 THEN
    SET failures = JSON_ARRAY_APPEND(failures, '$', 'True peak exceeds -1 dBTP');
  END IF;

  -- Check for warnings
  IF lufs_dev > 1.5 THEN
    SET warns = JSON_ARRAY_APPEND(warns, '$',
      CONCAT('LUFS deviation: ', lufs_dev, ' LU from target'));
  END IF;

  IF p_lra < 4 THEN
    SET warns = JSON_ARRAY_APPEND(warns, '$', 'Overly compressed (LRA < 4 dB)');
  END IF;

  IF p_leading_silence > 2 OR p_trailing_silence > 2 THEN
    SET warns = JSON_ARRAY_APPEND(warns, '$', 'Excessive silence detected');
  END IF;

  -- Determine status
  IF JSON_LENGTH(failures) > 0 THEN
    SET p_validation_status = 'fail';
  ELSEIF JSON_LENGTH(warns) > 0 THEN
    SET p_validation_status = 'pass_with_warnings';
  ELSE
    SET p_validation_status = 'pass';
  END IF;

  SET p_failure_reasons = failures;
  SET p_warnings = warns;

  -- Insert record
  INSERT INTO audio_quality_checks (
    song_id, check_type, integrated_lufs, lufs_target, lufs_deviation,
    loudness_range_db, true_peak_dbtp, has_clipping,
    leading_silence_sec, trailing_silence_sec,
    validation_status, failure_reasons, warnings
  ) VALUES (
    p_song_id, p_check_type, p_integrated_lufs, lufs_target, lufs_dev,
    p_lra, p_true_peak, p_clipping,
    p_leading_silence, p_trailing_silence,
    p_validation_status, failures, warns
  );
END//
DELIMITER ;
```

## Automated Validation Workflow

### n8n Quality Gate Integration
```json
{
  "name": "Audio Quality Gate",
  "nodes": [
    {
      "name": "After Mastering",
      "type": "n8n-nodes-base.webhook",
      "webhookId": "quality-check"
    },
    {
      "name": "Run FFmpeg Analysis",
      "type": "n8n-nodes-base.executeCommand",
      "command": "bash /scripts/validate_audio.sh {{ $json.file_path }}"
    },
    {
      "name": "Parse Results",
      "type": "n8n-nodes-base.code",
      "code": "// Parse FFmpeg output and extract metrics"
    },
    {
      "name": "Check Quality Rules",
      "type": "n8n-nodes-base.if",
      "conditions": {
        "clipping": false,
        "truePeak": { "<=": -1.0 },
        "lufsDeviation": { "<=": 1.5 }
      }
    },
    {
      "name": "Pass - Add to History",
      "type": "n8n-nodes-base.mysql"
    },
    {
      "name": "Fail - Alert & Quarantine",
      "type": "n8n-nodes-base.telegram",
      "message": "⚠️ Quality check failed for {{ $json.title }}"
    }
  ]
}
```

## Examples

### Example 1: Validate Mastered Audio
User: "Check if the mastered tracks meet broadcast standards"

Process:
1. Get all songs with status='mastered'
2. Run FFmpeg analysis on each MP3
3. Extract LUFS, true peak, LRA, clipping
4. Compare to genre-specific targets
5. Flag failures and warnings
6. Generate quality report
7. Block failed tracks from broadcast

### Example 2: Detect Quality Regression
User: "Are our generated tracks getting worse quality?"

Analyze:
1. Query quality_checks for last 30 days
2. Calculate average LUFS deviation over time
3. Track clipping incidents per week
4. Monitor bitrate trends
5. Identify quality drops correlated with Suno API changes
6. Alert if failure rate >5%

### Example 3: Pre-Broadcast Validation
Before adding song to radio_history:
1. Check file exists and is readable
2. Verify LUFS within ±1.5 of target
3. Ensure zero clipping
4. Validate duration (2-6 minutes)
5. Check bitrate ≥192 kbps
6. Only allow broadcast if all critical checks pass

## Validation Report Format

```
═══════════════════════════════════════════════════════
AUDIO QUALITY VALIDATION REPORT
═══════════════════════════════════════════════════════
Song: "Midnight Dreams" (ID: 1234)
File: /songs/midnight_dreams_mastered.mp3
Checked: 2025-01-15 14:30:00
Check Type: Post-Mastering

TECHNICAL SPECIFICATIONS
───────────────────────────────────────────────────────
Format: MP3 (MPEG-1 Layer 3)
Bitrate: 320 kbps (CBR) ✓
Sample Rate: 44.1 kHz ✓
Channels: Stereo ✓
Duration: 3:42 (222 seconds) ✓
File Size: 8.4 MB

LOUDNESS ANALYSIS (EBU R128)
───────────────────────────────────────────────────────
Integrated LUFS: -11.3 LUFS
Target LUFS: -11.0 LUFS (EDM)
Deviation: -0.3 LU ✓ (within ±1.5 LU tolerance)

Loudness Range: 8.2 dB ✓
True Peak: -0.8 dBTP ✓ (below -1.0 limit)

QUALITY CHECKS
───────────────────────────────────────────────────────
✓ No clipping detected (0 samples)
✓ True peak compliant (-0.8 dBTP)
✓ LUFS within target (0.3 LU deviation)
✓ Adequate dynamic range (8.2 dB LRA)
✓ No leading silence detected
✓ No trailing silence detected
⚠ Bitrate 320 kbps (excellent, no warning)

VALIDATION RESULT: PASS
───────────────────────────────────────────────────────
Status: APPROVED FOR BROADCAST ✓
Warnings: 0
Failures: 0

This track meets all broadcast quality standards.
═══════════════════════════════════════════════════════
```

## Best Practices

- **Validate at multiple stages**: Post-generation, post-mastering, pre-broadcast
- **Store validation history**: Track quality trends over time
- **Automate validation**: Integrate into n8n workflows
- **Block failed tracks**: Don't allow broadcast of poor quality audio
- **Alert on failures**: Notify admins via Telegram immediately
- **Trending analysis**: Monitor if Suno API quality degrades
- **Genre-specific targets**: EDM needs different loudness than Classical
- **Quarantine failures**: Move to separate folder for review
- **Retry mastering**: Auto-retry if LUFS off by >2 LU
- **Document exceptions**: Log why certain tracks got manual approval

## Integration Points

- **Mastering Workflow**: Validate immediately after LUFS normalization
- **Music Metadata Analyzer**: Cross-reference technical specs
- **Cost Optimization**: Track waste from failed generations
- **Monitoring Alerts**: Quality failure rate in dashboard
