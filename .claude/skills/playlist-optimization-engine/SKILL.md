---
name: playlist-optimization-engine
description: Optimizes song sequencing for smooth transitions, energy flow, and listener engagement. Handles key compatibility, genre mixing, artist/tempo variety, and vibe-based curation. Use when building playlists, improving broadcast flow, or creating themed music sets.
---

# Playlist Optimization Engine

Advanced playlist curation using musical theory, energy dynamics, and listener psychology.

## Instructions

When optimizing playlists:

1. **Energy Arc Design**
   - Create intentional energy curves (rise, fall, plateau, wave)
   - Smooth transitions between energy levels (max ±15 points per song)
   - Build momentum for peak moments
   - Provide recovery periods after high-energy sequences
   - Match energy arcs to time slots (morning rise, evening wind-down)

2. **Harmonic Key Mixing**
   - Use Camelot Wheel for compatible key transitions
   - Prefer perfect matches (same key) or adjacent keys
   - Avoid dissonant jumps (>5 semitones)
   - Plan key journeys for emotional progression
   - Allow genre-appropriate key flexibility

3. **Tempo Transitions**
   - Smooth BPM changes (max ±10-15 BPM per transition)
   - Use tempo ramps for energy shifts
   - Group similar tempos for cohesive sections
   - Bridge tempo gaps with transitional tracks
   - Match tempo to target activity level

4. **Genre and Artist Variety**
   - Avoid consecutive tracks from same artist
   - Limit same-genre runs to 3-4 songs maximum
   - Create intentional genre crossover moments
   - Balance familiar vs discovery content (70/30 rule)
   - Respect listener genre preferences

5. **Psychological Pacing**
   - Start with accessible, mood-setting opener
   - Build familiarity before experimentation
   - Create surprise moments (unexpected genre/tempo)
   - End with memorable closer (not fade-out)
   - Plan attention-retention peaks every 20-30 minutes

## Camelot Wheel Reference

### Key Compatibility Chart
```
Inner Wheel (Minor Keys):
1A = A♭m  →  Compatible: 1B, 12A, 2A
2A = E♭m  →  Compatible: 2B, 1A, 3A
3A = B♭m  →  Compatible: 3B, 2A, 4A
4A = Fm   →  Compatible: 4B, 3A, 5A
5A = Cm   →  Compatible: 5B, 4A, 6A
6A = Gm   →  Compatible: 6B, 5A, 7A
7A = Dm   →  Compatible: 7B, 6A, 8A
8A = Am   →  Compatible: 8B, 7A, 9A
9A = Em   →  Compatible: 9B, 8A, 10A
10A = Bm  →  Compatible: 10B, 9A, 11A
11A = F♯m →  Compatible: 11B, 10A, 12A
12A = D♭m →  Compatible: 12B, 11A, 1A

Outer Wheel (Major Keys):
1B = B    →  Compatible: 1A, 12B, 2B
2B = F♯   →  Compatible: 2A, 1B, 3B
3B = D♭   →  Compatible: 3A, 2B, 4B
4B = A♭   →  Compatible: 4A, 3B, 5B
5B = E♭   →  Compatible: 5A, 4B, 6B
6B = B♭   →  Compatible: 6A, 5B, 7B
7B = F    →  Compatible: 7A, 6B, 8B
8B = C    →  Compatible: 8A, 7B, 9B
9B = G    →  Compatible: 9A, 8B, 10B
10B = D   →  Compatible: 10A, 9B, 11B
11B = A   →  Compatible: 11A, 10B, 12B
12B = E   →  Compatible: 12A, 11B, 1B
```

### Transition Rules
- **Perfect Match**: Same key (1A → 1A) = seamless
- **Relative Match**: Inner/Outer wheel (1A ↔ 1B) = smooth
- **Adjacent**: ±1 position (1A → 2A) = natural
- **Energy Boost**: +7 positions (1A → 8A) = dramatic lift
- **Avoid**: ±5 or ±6 positions = dissonant

## Energy Flow Patterns

### Pattern 1: Morning Rise (6am-10am)
```
Energy Curve: 30 → 45 → 60 → 70 → 75
Goal: Gentle wake-up to active start
Example: Lo-fi → Indie → Pop → Upbeat Pop → Dance
```

### Pattern 2: Afternoon Sustain (10am-5pm)
```
Energy Curve: 70 → 75 → 80 → 75 → 70 → 80
Goal: Maintain productivity energy with variation
Example: Dance → Pop → Rock → Pop → Indie → EDM
```

### Pattern 3: Evening Wind-Down (5pm-10pm)
```
Energy Curve: 80 → 70 → 60 → 50 → 40
Goal: Transition from active to relaxed
Example: Rock → Pop → Indie → Acoustic → Chill
```

### Pattern 4: Night Ambient (10pm-6am)
```
Energy Curve: 40 → 30 → 25 → 30 → 35
Goal: Calm atmosphere with gentle variation
Example: Chill → Ambient → Classical → Lo-fi → Downtempo
```

## Optimization Algorithms

### Transition Score Calculation
```python
def calculate_transition_score(song_a, song_b):
    score = 100

    # Key compatibility (-30 to +10)
    key_penalty = get_key_distance(song_a.key, song_b.key)
    if key_penalty == 0:  # Perfect match
        score += 10
    elif key_penalty <= 2:  # Adjacent
        score += 5
    elif key_penalty > 5:  # Dissonant
        score -= 30

    # Tempo transition (-20 to +5)
    bpm_diff = abs(song_a.bpm - song_b.bpm)
    if bpm_diff <= 5:
        score += 5
    elif bpm_diff > 20:
        score -= 20

    # Energy smoothness (-25 to +5)
    energy_diff = abs(song_a.energy - song_b.energy)
    if energy_diff <= 10:
        score += 5
    elif energy_diff > 25:
        score -= 25

    # Genre variety (+10 or 0)
    if song_a.genre != song_b.genre:
        score += 10

    # Same artist penalty (-40)
    if song_a.artist == song_b.artist:
        score -= 40

    return max(0, min(100, score))
```

### Playlist Optimization Query
```sql
-- Find best next song given current song
SELECT
  rh.id,
  rh.title,
  rh.artist,
  rh.genre,
  rh.metadata->>'$.bpm' as bpm,
  rh.metadata->>'$.key' as song_key,
  rh.metadata->>'$.energy' as energy,
  (
    100
    - ABS(CAST(rh.metadata->>'$.bpm' AS SIGNED) - ?) * 0.5  -- BPM penalty
    - ABS(CAST(rh.metadata->>'$.energy' AS SIGNED) - ?) * 0.8  -- Energy penalty
    + IF(rh.genre != ?, 10, 0)  -- Genre variety bonus
    - IF(rh.artist = ?, 40, 0)  -- Same artist penalty
  ) as transition_score
FROM radio_history rh
WHERE rh.id NOT IN (?)  -- Already played in current session
  AND rh.status = 'completed'
ORDER BY transition_score DESC
LIMIT 20;
```

## Vibe-Based Curation

### Vibe Categories
- **Focus Flow**: Instrumental, 70-90 BPM, minimal vocals (Study/Work)
- **Gym Energy**: High-energy, 130+ BPM, motivational (Workout)
- **Chill Sunset**: Mellow, 65-85 BPM, warm tones (Relax)
- **Party Mode**: Dance, 120-140 BPM, upbeat (Social)
- **Deep Dive**: Ambient, <70 BPM, atmospheric (Sleep/Meditation)
- **Road Trip**: Varied, 100-130 BPM, singalong (Travel)

### Vibe Detection Query
```sql
SELECT
  CASE
    WHEN genre IN ('Lo-Fi', 'Ambient', 'Classical')
      AND CAST(metadata->>'$.bpm' AS UNSIGNED) BETWEEN 60 AND 90
      THEN 'Focus Flow'
    WHEN genre IN ('EDM', 'Trap', 'Metal')
      AND CAST(metadata->>'$.energy' AS UNSIGNED) > 80
      THEN 'Gym Energy'
    WHEN genre IN ('Indie', 'Acoustic', 'Jazz')
      AND CAST(metadata->>'$.energy' AS UNSIGNED) BETWEEN 40 AND 60
      THEN 'Chill Sunset'
    WHEN genre IN ('Pop', 'Dance', 'Hip Hop')
      AND CAST(metadata->>'$.bpm' AS UNSIGNED) BETWEEN 120 AND 140
      THEN 'Party Mode'
    ELSE 'General'
  END as vibe,
  id, title, genre
FROM radio_history
WHERE status = 'completed';
```

## Examples

### Example 1: Build Morning Playlist
User: "Create an optimized playlist for morning broadcast"

Process:
1. Set target energy curve: 30 → 75 over 2 hours
2. Select songs with compatible keys
3. Ensure smooth BPM transitions
4. Avoid genre/artist repetition
5. Calculate transition scores between all pairs
6. Optimize sequence using greedy algorithm or dynamic programming
7. Validate final flow meets energy arc

### Example 2: Fix Poor Transition
User: "This transition from Rock to Classical sounds jarring"

Analyze:
- Energy drop: 85 → 25 (too steep, -60 points)
- BPM change: 140 → 70 (too drastic, -70 BPM)
- Key incompatibility: D Major → G♭ Minor (dissonant)

Fix:
- Insert bridge track: Indie (energy 55, BPM 105, key A Major)
- New flow: Rock (85) → Indie (55) → Classical (25)
- Smooth energy descent: -30, then -30

### Example 3: Generate Genre-Crossing Playlist
User: "Create a playlist that blends EDM and Classical"

Strategy:
1. Start with accessible EDM (pop-influenced, 128 BPM)
2. Transition to melodic trance (orchestral elements)
3. Move to epic/cinematic music (bridge genre)
4. Introduce neo-classical (electronic production)
5. Arrive at pure classical
6. Maintain key compatibility throughout (C Major family)

## Best Practices

- **Always check metadata first**: Don't assume genre implies BPM/energy
- **Respect listener context**: Morning vs night, focus vs party
- **Build playlists 20-30 songs minimum**: Allow flow development
- **Test transitions aurally**: Scores don't replace human ears
- **Save successful patterns**: Reuse proven sequences
- **Balance predictability and surprise**: 80% expected, 20% unexpected
- **Consider lyrical content**: Avoid tonal whiplash (happy → sad)
- **Use crossfades strategically**: Smooth tempo/key mismatches
- **Monitor skip rates by position**: Identify weak transitions
- **Update optimization rules from data**: Learn what works

## Integration Points

- **Music Metadata Analyzer**: Get BPM, key, energy for optimization
- **Broadcast Scheduler**: Apply time-slot appropriate energy curves
- **User Behavior Predictor**: Personalize playlists based on preferences
- **Analytics Dashboard**: Track skip rates by transition type
