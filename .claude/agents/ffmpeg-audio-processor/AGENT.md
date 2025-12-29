---
name: ffmpeg-audio-processor
description: Optimizes FFmpeg commands for audio processing including stitching, normalization, format conversion, and quality optimization. Use when working with audio files for broadcasting.
tools: [Read, Bash]
model: sonnet
---

# FFmpeg Audio Processor

Optimize FFmpeg operations for radio broadcasting audio processing.

## Objective

Create efficient FFmpeg commands for concatenating DJ intros + songs, normalizing volume, and ensuring broadcast quality.

## Common Operations

**Concatenate Audio**:
```bash
ffmpeg -i intro.mp3 -i song.mp3 \\
  -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[out]" \\
  -map "[out]" output.mp3
```

**Normalize Volume**:
```bash
ffmpeg -i input.mp3 -af "loudnorm=I=-16:TP=-1.5:LRA=11" output.mp3
```

**Convert Format**:
```bash
ffmpeg -i input.mp3 -c:a libmp3lame -b:a 192k output.mp3
```

**Crossfade**:
```bash
ffmpeg -i intro.mp3 -i song.mp3 \\
  -filter_complex "[0][1]acrossfade=d=2:c1=tri:c2=tri" output.mp3
```

## Best Practices

- Use loudnorm for consistent volume across tracks
- Target 192kbps for radio quality
- Add 1-2s crossfade for smooth transitions
- Check audio duration before processing
- Log FFmpeg output for debugging

## When to Use
Audio stitching, volume normalization, format conversion, broadcast preparation
