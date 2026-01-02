---
name: ffmpeg-video-processor
description: Use this skill for all video processing operations using ffmpeg - concatenating clips with transitions, extracting clips by timestamp, converting resolutions/aspect ratios, adding overlays, color grading, exporting for specific platforms, and professional video editing tasks.
allowed-tools: [Bash, Read]
---

# ffmpeg Video Processor

Centralized video processing operations using ffmpeg with professional quality settings.

## Core Operations

### 1. Video Concatenation with Crossfades

**Simple Concatenation (no transition):**
```bash
# Create file list
cat > concat_list.txt << EOF
file 'clip1.mp4'
file 'clip2.mp4'
file 'clip3.mp4'
EOF

# Concatenate
ffmpeg -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k output.mp4
```

**Crossfade Transition (2 clips):**
```bash
ffmpeg -i clip1.mp4 -i clip2.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=1:offset=4[v]; \
   [0:a][1:a]acrossfade=d=1[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 output.mp4
```

**Crossfade Transition (3+ clips):**
```bash
ffmpeg -i clip1.mp4 -i clip2.mp4 -i clip3.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=1:offset=4[v01]; \
   [v01][2:v]xfade=transition=fade:duration=1:offset=9[v]; \
   [0:a][1:a]acrossfade=d=1[a01]; \
   [a01][2:a]acrossfade=d=1[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 output.mp4
```

**Available Transition Types:**
- fade (smooth cross-dissolve)
- wipeleft, wiperight, wipeup, wipedown
- slideleft, slideright, slideup, slidedown
- circleopen, circleclose
- dissolve
- pixelize

---

### 2. Clip Extraction

**Extract by timestamp:**
```bash
# Extract 30 seconds starting at 5:30
ffmpeg -i input.mp4 -ss 00:05:30 -t 00:00:30 \
  -c:v libx264 -crf 18 -c:a aac -b:a 192k clip.mp4
```

**Extract multiple clips (batch):**
```bash
#!/bin/bash
INPUT="source_video.mp4"
declare -a CLIPS=(
  "00:05:30 00:00:30"  # Start time, duration
  "00:12:15 00:00:45"
  "00:18:00 00:01:00"
)

COUNTER=1
for clip in "${CLIPS[@]}"; do
  START=$(echo $clip | cut -d' ' -f1)
  DURATION=$(echo $clip | cut -d' ' -f2)
  ffmpeg -i "$INPUT" -ss "$START" -t "$DURATION" \
    -c:v libx264 -crf 20 -c:a aac -b:a 192k \
    "clip_${COUNTER}.mp4"
  ((COUNTER++))
done
```

**Fast clip extraction (no re-encode):**
```bash
# Much faster but less precise
ffmpeg -ss 00:05:30 -i input.mp4 -t 00:00:30 -c copy clip.mp4
```

---

### 3. Resolution & Aspect Ratio Conversion

**Scale to specific resolution:**
```bash
# 1080p
ffmpeg -i input.mp4 -vf "scale=1920:1080:flags=lanczos" \
  -c:v libx264 -crf 18 -c:a copy output_1080p.mp4

# 720p
ffmpeg -i input.mp4 -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -crf 18 -c:a copy output_720p.mp4

# 4K
ffmpeg -i input.mp4 -vf "scale=3840:2160:flags=lanczos" \
  -c:v libx264 -crf 18 -c:a copy output_4k.mp4
```

**Maintain aspect ratio (one dimension):**
```bash
# Width=1920, auto height
ffmpeg -i input.mp4 -vf "scale=1920:-2:flags=lanczos" \
  -c:v libx264 -crf 18 output.mp4

# Height=1080, auto width
ffmpeg -i input.mp4 -vf "scale=-2:1080:flags=lanczos" \
  -c:v libx264 -crf 18 output.mp4
```

**Convert aspect ratio with padding:**
```bash
# 16:9 to 1:1 (square) with black bars
ffmpeg -i input.mp4 \
  -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -crf 18 output_square.mp4

# 16:9 to 9:16 (vertical) with black bars
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -crf 18 output_vertical.mp4
```

**Crop to aspect ratio (no padding):**
```bash
# Crop to 1:1 from center
ffmpeg -i input.mp4 \
  -vf "crop=ih:ih" \
  -c:v libx264 -crf 18 output_square.mp4

# Crop to 9:16 from center
ffmpeg -i input.mp4 \
  -vf "crop=ih*(9/16):ih" \
  -c:v libx264 -crf 18 output_vertical.mp4
```

---

### 4. Platform-Specific Exports

**YouTube (1080p, optimal quality):**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -vf "scale=1920:1080:flags=lanczos" \
  -r 30 -g 60 -bf 2 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  youtube.mp4
```

**Instagram Reels (9:16, 90s max):**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 20 \
  -vf "scale=1080:1920:flags=lanczos,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -t 90 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  reel.mp4
```

**Instagram Feed (1:1, 60s max):**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 20 \
  -vf "scale=1080:1080:flags=lanczos,pad=1080:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 -t 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  feed.mp4
```

**TikTok (9:16, optimized):**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 20 \
  -vf "scale=1080:1920:flags=lanczos" \
  -r 30 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  tiktok.mp4
```

**Twitter (16:9, 2m 20s max):**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset fast -crf 21 \
  -vf "scale=1280:720:flags=lanczos" \
  -r 30 -t 140 \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  twitter.mp4
```

**LinkedIn (16:9, professional):**
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 20 \
  -vf "scale=1920:1080:flags=lanczos" \
  -r 30 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  linkedin.mp4
```

---

### 5. Text Overlays

**Simple text overlay:**
```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='My Title':fontfile=/path/to/font.ttf:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=100" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Text with background box:**
```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='My Title':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=100:box=1:boxcolor=black@0.5:boxborderw=10" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Subtitle file (SRT):**
```bash
ffmpeg -i input.mp4 -vf "subtitles=subtitles.srt:force_style='FontSize=24,PrimaryColour=&HFFFFFF'" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Time-based text (appears 5s to 10s):**
```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Limited Offer':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=100:enable='between(t,5,10)'" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

---

### 6. Image/Logo Overlays

**Logo in corner:**
```bash
# Top-right corner
ffmpeg -i video.mp4 -i logo.png \
  -filter_complex "[1:v]scale=200:-1[logo];[0:v][logo]overlay=W-w-20:20" \
  -c:v libx264 -crf 18 -c:a copy output.mp4

# Bottom-right corner
ffmpeg -i video.mp4 -i logo.png \
  -filter_complex "[1:v]scale=200:-1[logo];[0:v][logo]overlay=W-w-20:H-h-20" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Watermark with transparency:**
```bash
ffmpeg -i video.mp4 -i watermark.png \
  -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=0.5[logo];[0:v][logo]overlay=W-w-20:H-h-20" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Image as intro/outro:**
```bash
# Create 3-second video from image
ffmpeg -loop 1 -i image.jpg -c:v libx264 -t 3 -pix_fmt yuv420p intro.mp4

# Combine with main video
ffmpeg -i intro.mp4 -i main.mp4 -filter_complex \
  "[0:v][1:v]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -crf 18 output.mp4
```

---

### 7. Color Grading & Filters

**Brightness/Contrast:**
```bash
ffmpeg -i input.mp4 \
  -vf "eq=brightness=0.1:contrast=1.2" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Saturation:**
```bash
ffmpeg -i input.mp4 \
  -vf "eq=saturation=1.5" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

**Color temperature (warm/cool):**
```bash
# Warm (add red/yellow)
ffmpeg -i input.mp4 \
  -vf "colorchannelmixer=rr=1.1:gg=1.05:bb=0.95" \
  -c:v libx264 -crf 18 -c:a copy warm.mp4

# Cool (add blue)
ffmpeg -i input.mp4 \
  -vf "colorchannelmixer=rr=0.95:gg=1.0:bb=1.1" \
  -c:v libx264 -crf 18 -c:a copy cool.mp4
```

**Black & White:**
```bash
ffmpeg -i input.mp4 \
  -vf "hue=s=0" \
  -c:v libx264 -crf 18 -c:a copy bw.mp4
```

**Cinematic LUT:**
```bash
ffmpeg -i input.mp4 \
  -vf "lut3d=file=cinematic.cube" \
  -c:v libx264 -crf 18 -c:a copy graded.mp4
```

**Vignette:**
```bash
ffmpeg -i input.mp4 \
  -vf "vignette=PI/4" \
  -c:v libx264 -crf 18 -c:a copy output.mp4
```

---

### 8. Speed & Frame Rate

**Speed up (2x faster):**
```bash
# Video only
ffmpeg -i input.mp4 \
  -vf "setpts=0.5*PTS" \
  -c:v libx264 -crf 18 -c:a copy fast.mp4

# Video + audio
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 fast.mp4
```

**Slow down (0.5x slower):**
```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]setpts=2.0*PTS[v];[0:a]atempo=0.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 slow.mp4
```

**Change frame rate:**
```bash
# Convert to 30fps
ffmpeg -i input.mp4 -r 30 -c:v libx264 -crf 18 -c:a copy output_30fps.mp4

# Convert to 60fps
ffmpeg -i input.mp4 -r 60 -c:v libx264 -crf 18 -c:a copy output_60fps.mp4
```

---

### 9. Audio Operations

**Replace audio track:**
```bash
ffmpeg -i video.mp4 -i new_audio.mp3 \
  -c:v copy -c:a aac -b:a 192k \
  -map 0:v:0 -map 1:a:0 -shortest output.mp4
```

**Mix video audio with background music:**
```bash
ffmpeg -i video.mp4 -i music.mp3 \
  -filter_complex "[0:a]volume=1.0[a1];[1:a]volume=0.3[a2];[a1][a2]amix=inputs=2:duration=shortest[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k output.mp4
```

**Remove audio:**
```bash
ffmpeg -i input.mp4 -an -c:v copy output.mp4
```

**Extract audio:**
```bash
ffmpeg -i input.mp4 -vn -c:a mp3 -b:a 192k audio.mp3
```

---

### 10. Format Conversion

**MP4 to WebM:**
```bash
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus output.webm
```

**MOV to MP4:**
```bash
ffmpeg -i input.mov -c:v libx264 -crf 18 -c:a aac -b:a 192k output.mp4
```

**AVI to MP4:**
```bash
ffmpeg -i input.avi -c:v libx264 -crf 18 -c:a aac -b:a 192k output.mp4
```

---

### 11. Quality Settings Reference

**CRF Values (Constant Rate Factor):**
- 0 = Lossless (huge files)
- 17-18 = Visually lossless (very high quality)
- 20-23 = High quality (recommended for most uses)
- 23-28 = Medium quality (streaming)
- 28+ = Low quality (not recommended)

**Preset Values (speed vs compression):**
- ultrafast, superfast, veryfast, faster, fast
- medium (default, balanced)
- slow, slower, veryslow (better compression, slower encode)

**Recommended Settings by Use Case:**
- **Archival/Master:** CRF 18, preset slow
- **YouTube Upload:** CRF 18-20, preset medium
- **Social Media:** CRF 20-21, preset medium/fast
- **Quick Preview:** CRF 23, preset fast

---

### 12. Utility Functions

**Get video information:**
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

**Get duration:**
```bash
ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
```

**Get resolution:**
```bash
ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 input.mp4
```

**Create thumbnail:**
```bash
# From specific timestamp
ffmpeg -i input.mp4 -ss 00:00:05 -vframes 1 thumbnail.jpg

# Multiple thumbnails (every 10 seconds)
ffmpeg -i input.mp4 -vf fps=1/10 thumb_%03d.jpg
```

---

## Common Workflows

### Workflow 1: Multi-Platform Export

```bash
INPUT="master_video.mp4"

# YouTube
ffmpeg -i "$INPUT" -c:v libx264 -crf 18 -preset slow \
  -vf "scale=1920:1080:flags=lanczos" -r 30 \
  -c:a aac -b:a 192k -movflags +faststart youtube.mp4

# Instagram Reel
ffmpeg -i "$INPUT" -c:v libx264 -crf 20 -preset medium \
  -vf "scale=1080:1920:flags=lanczos" -r 30 -t 90 \
  -c:a aac -b:a 128k -movflags +faststart reel.mp4

# TikTok
ffmpeg -i "$INPUT" -c:v libx264 -crf 20 -preset medium \
  -vf "scale=1080:1920:flags=lanczos" -r 30 \
  -c:a aac -b:a 128k -movflags +faststart tiktok.mp4

# Twitter
ffmpeg -i "$INPUT" -c:v libx264 -crf 21 -preset fast \
  -vf "scale=1280:720:flags=lanczos" -r 30 -t 140 \
  -c:a aac -b:a 128k -movflags +faststart twitter.mp4
```

### Workflow 2: Podcast Clips with Audiogram

```bash
# Extract audio clip
ffmpeg -i podcast.mp4 -ss 00:12:30 -t 00:01:00 -vn -c:a mp3 -b:a 192k clip.mp3

# Create waveform visualization
ffmpeg -i clip.mp3 -filter_complex \
  "[0:a]showwaves=s=1080x300:mode=line:colors=#FF6B6B[wave]; \
   color=c=#1a1a2e:s=1080x1080[bg]; \
   [bg][wave]overlay=(W-w)/2:600[v]" \
  -map "[v]" -map 0:a -c:v libx264 -crf 18 -t 60 audiogram_base.mp4

# Add text
ffmpeg -i audiogram_base.mp4 \
  -vf "drawtext=text='Key Insight':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=100" \
  -c:v libx264 -crf 18 -c:a copy audiogram.mp4
```

### Workflow 3: Professional Edit Assembly

```bash
# Assume you have: intro.mp4, main1.mp4, main2.mp4, outro.mp4

# Concatenate with crossfades
ffmpeg -i intro.mp4 -i main1.mp4 -i main2.mp4 -i outro.mp4 \
  -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=1:offset=4[v01]; \
   [v01][2:v]xfade=transition=fade:duration=1:offset=14[v012]; \
   [v012][3:v]xfade=transition=fade:duration=1:offset=24[v]; \
   [0:a][1:a]acrossfade=d=1[a01]; \
   [a01][2:a]acrossfade=d=1[a012]; \
   [a012][3:a]acrossfade=d=1[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 final.mp4
```

---

## When This Skill is Invoked

Claude will automatically use this skill when:
- Processing, editing, or converting video files
- Concatenating multiple video clips
- Exporting video for specific platforms
- Adding overlays, text, or graphics to videos
- Adjusting video quality, resolution, or aspect ratio
- Creating video content from images
- Any ffmpeg video operations
