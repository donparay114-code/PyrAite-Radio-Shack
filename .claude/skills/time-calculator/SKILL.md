---
name: time-calculator
description: Use this skill for duration calculations, time format conversions, scheduling, timing operations for videos/podcasts/voiceovers, and calculating optimal pacing.
allowed-tools: [Bash, Read]
---

# Time Calculator

Duration calculations and timing operations.

## Duration Calculations

```javascript
function calculateWordDuration(wordCount, wordsPerMinute = 150) {
  return (wordCount / wordsPerMinute) * 60;  // Returns seconds
}

function calculateVideoDuration(frames, fps) {
  return frames / fps;
}

function convertTimeFormat(time, fromFormat, toFormat) {
  let seconds;

  // Convert to seconds first
  if (fromFormat === 'HH:MM:SS') {
    const [h, m, s] = time.split(':').map(Number);
    seconds = h * 3600 + m * 60 + s;
  } else if (fromFormat === 'seconds') {
    seconds = time;
  } else if (fromFormat === 'milliseconds') {
    seconds = time / 1000;
  }

  // Convert from seconds to target format
  if (toFormat === 'HH:MM:SS') {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else if (toFormat === 'seconds') {
    return seconds;
  } else if (toFormat === 'milliseconds') {
    return seconds * 1000;
  }
}
```

## Pacing Calculations

```javascript
function calculatePacing(contentItems, totalDuration) {
  const totalWeight = contentItems.reduce((sum, item) => sum + (item.weight || 1), 0);

  return contentItems.map(item => ({
    ...item,
    duration: (totalDuration * (item.weight || 1)) / totalWeight
  }));
}
```

## When This Skill is Invoked

Use for video/audio editing, podcast production, or any timing calculations.
