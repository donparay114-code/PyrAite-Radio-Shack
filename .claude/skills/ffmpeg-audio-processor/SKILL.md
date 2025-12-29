---
name: ffmpeg-audio-processor
description: Use this skill for all audio processing operations using ffmpeg - loudness normalization (EBU R128, LUFS targeting), voice enhancement, audio mixing with ducking, format conversion, silence detection, crossfades, and professional audio editing for podcasts, music, and voiceovers.
allowed-tools: [Bash, Read]
---

# ffmpeg Audio Processor

Centralized professional audio processing operations using ffmpeg with broadcast-quality standards.

## Core Operations

### 1. Loudness Normalization (EBU R128)

**Two-Pass Loudness Normalization (Recommended):**

```bash
# Pass 1: Analyze
ffmpeg -i input.mp3 -af loudnorm=print_format=summary -f null - 2>&1 | grep "Input"

# Pass 2: Apply normalization with measured values
ffmpeg -i input.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=-23.5:measured_TP=-8.2:measured_LRA=7.0:measured_thresh=-34.0:offset=-0.5 \
  -ar 48000 -c:a aac -b:a 192k output.mp3
```

**Single-Pass Normalization (Quick):**

```bash
# Target -16 LUFS (podcasts, Apple Music)
ffmpeg -i input.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 \
  -ar 48000 -c:a aac -b:a 192k output.mp3

# Target -14 LUFS (Spotify)
ffmpeg -i input.mp3 -af loudnorm=I=-14:TP=-1:LRA=11 \
  -ar 48000 -c:a aac -b:a 192k output.mp3

# Target -19 LUFS (broadcast)
ffmpeg -i input.mp3 -af loudnorm=I=-19:TP=-2:LRA=11 \
  -ar 48000 -c:a aac -b:a 192k output.mp3
```

**LUFS Targets by Platform:**
- **Spotify:** -14 LUFS
- **Apple Music:** -16 LUFS
- **YouTube:** -13 to -15 LUFS
- **Podcasts:** -16 to -19 LUFS
- **Broadcast (EBU R128):** -23 LUFS
- **Audiobooks:** -18 to -23 LUFS

---

### 2. Voice Enhancement

**Full Voice Enhancement Chain:**

```bash
ffmpeg -i voice.mp3 -af "\
  highpass=f=80,\
  lowpass=f=15000,\
  equalizer=f=200:t=q:w=1:g=-3,\
  equalizer=f=3500:t=q:w=1:g=3,\
  equalizer=f=8000:t=q:w=1.5:g=2,\
  compand=attacks=0.1:decays=0.2:points=-80/-80|-45/-45|-30/-25|-20/-15|-10/-10:soft-knee=6:gain=5:volume=-10,\
  afftdn=nf=-20,\
  loudnorm=I=-16:TP=-1.5:LRA=11" \
  -ar 48000 -c:a aac -b:a 192k enhanced_voice.mp3
```

**Individual Enhancement Steps:**

**High-Pass Filter (Remove rumble):**
```bash
ffmpeg -i voice.mp3 -af "highpass=f=80" output.mp3
```

**Low-Pass Filter (Remove hiss):**
```bash
ffmpeg -i voice.mp3 -af "lowpass=f=15000" output.mp3
```

**EQ for Voice Clarity:**
```bash
# Boost presence (3.5kHz) and air (8kHz)
ffmpeg -i voice.mp3 -af "\
  equalizer=f=200:t=q:w=1:g=-3,\
  equalizer=f=3500:t=q:w=1:g=3,\
  equalizer=f=8000:t=q:w=1.5:g=2" \
  output.mp3
```

**Compression (Dynamic range control):**
```bash
ffmpeg -i voice.mp3 -af "\
  compand=attacks=0.1:decays=0.2:points=-80/-80|-45/-45|-30/-25|-20/-15|-10/-10:soft-knee=6:gain=5:volume=-10" \
  output.mp3
```

**Noise Reduction:**
```bash
ffmpeg -i voice.mp3 -af "afftdn=nf=-20" output.mp3
```

**De-Essing (Reduce sibilance):**
```bash
ffmpeg -i voice.mp3 -af "\
  deesser=i=0.3:m=0.9:f=0.5:s=o" \
  output.mp3
```

---

### 3. Audio Mixing

**Mix Voice with Background Music (Ducking):**

```bash
# Voice stays full volume, music ducks down when voice is present
ffmpeg -i voice.mp3 -i music.mp3 -filter_complex "\
  [1:a]volume=0.3[music];\
  [0:a][music]sidechaincompress=threshold=0.02:ratio=4:attack=200:release=1000[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

**Simple Mix (No ducking):**

```bash
# Mix voice at 100%, music at 30%
ffmpeg -i voice.mp3 -i music.mp3 -filter_complex "\
  [0:a]volume=1.0[v];\
  [1:a]volume=0.3[m];\
  [v][m]amix=inputs=2:duration=shortest[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

**Mix Multiple Tracks:**

```bash
ffmpeg -i track1.mp3 -i track2.mp3 -i track3.mp3 -filter_complex "\
  [0:a]volume=1.0[a1];\
  [1:a]volume=0.5[a2];\
  [2:a]volume=0.3[a3];\
  [a1][a2][a3]amix=inputs=3:duration=longest[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

**Crossfade Between Tracks:**

```bash
# 3-second crossfade
ffmpeg -i song1.mp3 -i song2.mp3 -filter_complex "\
  [0:a][1:a]acrossfade=d=3:c1=tri:c2=tri[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

---

### 4. Format Conversion

**MP3 Conversion (Various Bitrates):**

```bash
# High quality (320 kbps)
ffmpeg -i input.wav -c:a libmp3lame -b:a 320k -ar 48000 output.mp3

# Standard quality (192 kbps)
ffmpeg -i input.wav -c:a libmp3lame -b:a 192k -ar 48000 output.mp3

# Voice optimized (128 kbps)
ffmpeg -i input.wav -c:a libmp3lame -b:a 128k -ar 44100 output.mp3

# Podcast (96 kbps mono)
ffmpeg -i input.wav -c:a libmp3lame -b:a 96k -ar 44100 -ac 1 output.mp3
```

**WAV (Lossless):**

```bash
# 16-bit 48kHz (professional)
ffmpeg -i input.mp3 -c:a pcm_s16le -ar 48000 output.wav

# 24-bit 96kHz (mastering)
ffmpeg -i input.mp3 -c:a pcm_s24le -ar 96000 output.wav
```

**AAC (High efficiency):**

```bash
# High quality
ffmpeg -i input.wav -c:a aac -b:a 256k -ar 48000 output.m4a

# Standard quality
ffmpeg -i input.wav -c:a aac -b:a 192k -ar 48000 output.m4a
```

**FLAC (Lossless compression):**

```bash
ffmpeg -i input.wav -c:a flac -compression_level 8 output.flac
```

**OGG Vorbis:**

```bash
ffmpeg -i input.wav -c:a libvorbis -q:a 6 output.ogg
```

---

### 5. Silence Detection & Removal

**Detect Silence:**

```bash
ffmpeg -i input.mp3 -af silencedetect=n=-40dB:d=0.5 -f null - 2>&1 | grep silence
```

**Remove Silence from Beginning and End:**

```bash
ffmpeg -i input.mp3 -af "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:stop_periods=1:stop_silence=0.1:stop_threshold=-50dB" \
  -c:a aac -b:a 192k output.mp3
```

**Remove All Silence Gaps:**

```bash
ffmpeg -i input.mp3 -af "silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-50dB" \
  -c:a aac -b:a 192k output.mp3
```

---

### 6. Speed & Pitch Adjustment

**Change Speed (affects pitch):**

```bash
# 1.5x faster
ffmpeg -i input.mp3 -af "atempo=1.5" output.mp3

# 0.5x slower
ffmpeg -i input.mp3 -af "atempo=0.5" output.mp3

# 2x faster (chain two atempo filters)
ffmpeg -i input.mp3 -af "atempo=1.5,atempo=1.333" output.mp3
```

**Change Pitch (preserve speed):**

```bash
# Raise pitch by 2 semitones
ffmpeg -i input.mp3 -af "asetrate=48000*2^(2/12),aresample=48000" output.mp3

# Lower pitch by 2 semitones
ffmpeg -i input.mp3 -af "asetrate=48000*2^(-2/12),aresample=48000" output.mp3
```

---

### 7. Fade In/Out

**Simple Fade In:**

```bash
# 3-second fade in
ffmpeg -i input.mp3 -af "afade=t=in:st=0:d=3" output.mp3
```

**Simple Fade Out:**

```bash
# Get duration first
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp3)
START=$(echo "$DURATION - 3" | bc)

# 3-second fade out
ffmpeg -i input.mp3 -af "afade=t=out:st=$START:d=3" output.mp3
```

**Fade In and Out:**

```bash
DURATION=$(ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp3)
FADE_OUT_START=$(echo "$DURATION - 3" | bc)

ffmpeg -i input.mp3 -af "afade=t=in:st=0:d=3,afade=t=out:st=$FADE_OUT_START:d=3" output.mp3
```

---

### 8. Concatenation

**Concatenate Audio Files (Same format):**

```bash
# Create file list
cat > concat_list.txt << EOF
file 'audio1.mp3'
file 'audio2.mp3'
file 'audio3.mp3'
EOF

# Concatenate
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy output.mp3
```

**Concatenate with Re-encoding:**

```bash
ffmpeg -i audio1.mp3 -i audio2.mp3 -i audio3.mp3 -filter_complex "\
  [0:a][1:a][2:a]concat=n=3:v=0:a=1[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

**Concatenate with Crossfades:**

```bash
ffmpeg -i song1.mp3 -i song2.mp3 -i song3.mp3 -filter_complex "\
  [0:a][1:a]acrossfade=d=2[a01];\
  [a01][2:a]acrossfade=d=2[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

---

### 9. Channel Operations

**Convert Stereo to Mono:**

```bash
ffmpeg -i stereo.mp3 -ac 1 -c:a aac -b:a 192k mono.mp3
```

**Convert Mono to Stereo:**

```bash
ffmpeg -i mono.mp3 -ac 2 -c:a aac -b:a 192k stereo.mp3
```

**Swap Left/Right Channels:**

```bash
ffmpeg -i input.mp3 -af "channelmap=1-0|0-1" output.mp3
```

**Extract Left Channel Only:**

```bash
ffmpeg -i stereo.mp3 -af "pan=mono|c0=c0" left_only.mp3
```

**Extract Right Channel Only:**

```bash
ffmpeg -i stereo.mp3 -af "pan=mono|c0=c1" right_only.mp3
```

---

### 10. Trim & Cut

**Trim to Specific Duration:**

```bash
# Keep first 60 seconds
ffmpeg -i input.mp3 -t 60 -c copy output.mp3

# Start at 30s, keep 60s
ffmpeg -i input.mp3 -ss 30 -t 60 -c copy output.mp3

# Start at 30s, go to end
ffmpeg -i input.mp3 -ss 30 -c copy output.mp3
```

**Cut Out a Section (Remove middle portion):**

```bash
# Keep 0-30s and 60s-end, remove 30-60s
ffmpeg -i input.mp3 -filter_complex "\
  [0:a]atrim=0:30[a1];\
  [0:a]atrim=60[a2];\
  [a1][a2]concat=n=2:v=0:a=1[out]" \
  -map "[out]" -c:a aac -b:a 192k output.mp3
```

---

### 11. Metadata & Tagging

**Add ID3 Tags:**

```bash
ffmpeg -i input.mp3 \
  -metadata title="Song Title" \
  -metadata artist="Artist Name" \
  -metadata album="Album Name" \
  -metadata date="2024" \
  -metadata genre="Genre" \
  -metadata track="1" \
  -c copy output.mp3
```

**Add Album Art:**

```bash
ffmpeg -i audio.mp3 -i cover.jpg \
  -map 0:a -map 1:0 \
  -c copy -id3v2_version 3 \
  -metadata:s:v title="Album cover" \
  -metadata:s:v comment="Cover (front)" \
  output.mp3
```

---

### 12. Quality Analysis

**Measure Loudness:**

```bash
ffmpeg -i input.mp3 -af loudnorm=print_format=summary -f null - 2>&1 | grep -E "Input Integrated|Input True Peak|Input LRA"
```

**Measure Peak Volume:**

```bash
ffmpeg -i input.mp3 -af "volumedetect" -f null - 2>&1 | grep -E "max_volume|mean_volume"
```

**Get Audio Stats:**

```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp3
```

**Detect Clipping:**

```bash
ffmpeg -i input.mp3 -af astats=measure_perchannel=none:measure_overall=Peak_level -f null - 2>&1 | grep "Peak level"
```

---

### 13. Podcast-Specific Operations

**Podcast Master Template:**

```bash
ffmpeg -i raw_podcast.mp3 -af "\
  highpass=f=80,\
  lowpass=f=15000,\
  equalizer=f=200:t=q:w=1:g=-3,\
  equalizer=f=3500:t=q:w=1:g=3,\
  compand=attacks=0.1:decays=0.2:points=-80/-80|-45/-45|-30/-25|-20/-15|-10/-10:soft-knee=6:gain=5:volume=-10,\
  afftdn=nf=-20,\
  loudnorm=I=-16:TP=-1.5:LRA=11" \
  -ar 48000 -c:a libmp3lame -b:a 192k \
  -metadata title="Episode Title" \
  -metadata artist="Podcast Name" \
  -metadata album="Season 1" \
  -metadata date="2024" \
  -metadata genre="Podcast" \
  podcast_final.mp3
```

**Add Intro/Outro to Podcast:**

```bash
ffmpeg -i intro.mp3 -i main_content.mp3 -i outro.mp3 \
  -filter_complex "\
  [0:a][1:a]acrossfade=d=1[a01];\
  [a01][2:a]acrossfade=d=1[out]" \
  -map "[out]" -c:a libmp3lame -b:a 192k podcast_complete.mp3
```

---

### 14. Music Production

**DJ-Style Crossfade Playlist:**

```bash
ffmpeg -i track1.mp3 -i track2.mp3 -i track3.mp3 -filter_complex "\
  [0:a]afade=t=out:st=235:d=5[a0];\
  [1:a]afade=t=in:st=0:d=5,afade=t=out:st=235:d=5[a1];\
  [2:a]afade=t=in:st=0:d=5[a2];\
  [a0][a1]acrossfade=d=5:c1=tri:c2=tri[a01];\
  [a01][a2]acrossfade=d=5:c1=tri:c2=tri[out]" \
  -map "[out]" -c:a aac -b:a 320k playlist.mp3
```

**Master for Streaming Services:**

```bash
# Spotify mastering (-14 LUFS)
ffmpeg -i input.wav -af "\
  loudnorm=I=-14:TP=-1:LRA=11:measured_I=-18:measured_TP=-2:measured_LRA=8:measured_thresh=-28.5:offset=0.5" \
  -ar 44100 -c:a libmp3lame -b:a 320k spotify_master.mp3

# Apple Music mastering (-16 LUFS)
ffmpeg -i input.wav -af "\
  loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=-18:measured_TP=-2:measured_LRA=8:measured_thresh=-28.5:offset=0.3" \
  -ar 44100 -c:a aac -b:a 256k apple_music_master.m4a
```

---

### 15. Broadcast Standards

**EBU R128 Broadcast Master:**

```bash
ffmpeg -i input.wav -af "\
  loudnorm=I=-23:TP=-2:LRA=7:measured_I=-25:measured_TP=-4:measured_LRA=6:measured_thresh=-33.5:offset=0.8" \
  -ar 48000 -c:a pcm_s24le broadcast_master.wav
```

**Radio Commercial (Heavy compression):**

```bash
ffmpeg -i commercial.wav -af "\
  compand=attacks=0.01:decays=0.05:points=-80/-80|-60/-40|-40/-30|-20/-20:soft-knee=4:gain=10:volume=-8,\
  loudnorm=I=-23:TP=-2:LRA=5" \
  -ar 48000 -c:a libmp3lame -b:a 320k radio_commercial.mp3
```

---

## Common Workflows

### Workflow 1: Professional Podcast Production

```bash
#!/bin/bash
# Full podcast production pipeline

INPUT="raw_recording.wav"
INTRO="intro_music.mp3"
OUTRO="outro_music.mp3"

# Step 1: Enhance voice
ffmpeg -i "$INPUT" -af "\
  highpass=f=80,\
  lowpass=f=15000,\
  equalizer=f=3500:t=q:w=1:g=3,\
  compand=attacks=0.1:decays=0.2:points=-80/-80|-45/-45|-30/-25|-20/-15|-10/-10:soft-knee=6:gain=5:volume=-10,\
  afftdn=nf=-20" \
  -c:a pcm_s16le enhanced.wav

# Step 2: Normalize loudness
ffmpeg -i enhanced.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:a pcm_s16le normalized.wav

# Step 3: Add intro and outro
ffmpeg -i "$INTRO" -i normalized.wav -i "$OUTRO" \
  -filter_complex "\
  [0:a][1:a]acrossfade=d=2[a01];\
  [a01][2:a]acrossfade=d=2[out]" \
  -map "[out]" -c:a libmp3lame -b:a 192k \
  -metadata title="Episode 1: Title" \
  -metadata artist="My Podcast" \
  final_podcast.mp3

# Cleanup
rm enhanced.wav normalized.wav
```

### Workflow 2: Audiobook Production

```bash
#!/bin/bash
# Audiobook mastering

INPUT="narration.wav"

ffmpeg -i "$INPUT" -af "\
  highpass=f=60,\
  lowpass=f=12000,\
  equalizer=f=2000:t=q:w=1:g=2,\
  compand=attacks=0.15:decays=0.3:points=-80/-80|-50/-50|-35/-30|-20/-18|-10/-10:soft-knee=8:gain=3:volume=-12,\
  afftdn=nf=-25,\
  loudnorm=I=-18:TP=-3:LRA=8,\
  silenceremove=start_periods=1:start_silence=0.2:start_threshold=-50dB:stop_periods=1:stop_silence=0.2:stop_threshold=-50dB" \
  -ar 44100 -c:a libmp3lame -b:a 128k -ac 1 \
  -metadata title="Chapter 1" \
  -metadata artist="Author Name" \
  -metadata album="Book Title" \
  audiobook_chapter1.mp3
```

### Workflow 3: Music Playlist with Smart Crossfades

```bash
#!/bin/bash
# Create seamless DJ mix

declare -a TRACKS=("track1.mp3" "track2.mp3" "track3.mp3")
CROSSFADE_DURATION=5

# Build filter complex dynamically
FILTER=""
for i in "${!TRACKS[@]}"; do
  if [ $i -eq 0 ]; then
    FILTER+="[0:a]afade=t=out:st=235:d=${CROSSFADE_DURATION}[a0];"
  elif [ $i -eq $((${#TRACKS[@]}-1)) ]; then
    FILTER+="[${i}:a]afade=t=in:st=0:d=${CROSSFADE_DURATION}[a${i}];"
  else
    FILTER+="[${i}:a]afade=t=in:st=0:d=${CROSSFADE_DURATION},afade=t=out:st=235:d=${CROSSFADE_DURATION}[a${i}];"
  fi
done

# Add crossfade connections
for i in $(seq 0 $((${#TRACKS[@]}-2))); do
  if [ $i -eq 0 ]; then
    FILTER+="[a0][a1]acrossfade=d=${CROSSFADE_DURATION}[mix1];"
  else
    PREV=$((i))
    CURR=$((i+1))
    FILTER+="[mix${PREV}][a${CURR}]acrossfade=d=${CROSSFADE_DURATION}[mix${CURR}];"
  fi
done

LAST_MIX=$((${#TRACKS[@]}-2))
FILTER+="[mix${LAST_MIX}]volume=1.0[out]"

# Execute
ffmpeg "${TRACKS[@]/#/-i }" -filter_complex "$FILTER" \
  -map "[out]" -c:a aac -b:a 320k dj_mix.mp3
```

---

## When This Skill is Invoked

Claude will automatically use this skill when:
- Processing, editing, or converting audio files
- Normalizing audio loudness for any platform
- Enhancing voice recordings or podcasts
- Mixing multiple audio tracks
- Creating audiograms or audio visualizations
- Mastering audio for streaming services
- Any ffmpeg audio operations
