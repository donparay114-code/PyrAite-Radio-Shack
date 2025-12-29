---
name: quality-scoring-framework
description: Use this skill to create custom quality rubrics and score any content type (code, design, writing, video, etc.) across multiple dimensions with weighted scoring. Provides standardized quality classification, comparison, and threshold checking.
allowed-tools: [Read]
---

# Quality Scoring Framework

Universal framework for creating rubrics and scoring content across any quality dimensions.

## Creating a Scoring Rubric

```javascript
function createRubric(config) {
  const {
    dimensions,  // Array of scoring dimensions
    weights,     // Optional weights (defaults to equal)
    scale        // [min, max] e.g., [1, 10]
  } = config;

  // Normalize weights
  const totalWeight = weights ? weights.reduce((a, b) => a + b, 0) : dimensions.length;
  const normalizedWeights = weights
    ? weights.map(w => w / totalWeight)
    : dimensions.map(() => 1 / dimensions.length);

  return {
    dimensions: dimensions.map((dim, i) => ({
      name: dim.name,
      description: dim.description,
      weight: normalizedWeights[i],
      scale: scale || [1, 10],
      criteria: dim.criteria || {}
    })),
    scale: scale || [1, 10],
    weights: normalizedWeights
  };
}
```

**Example Rubrics:**

```javascript
// Content Quality Rubric
const contentRubric = createRubric({
  dimensions: [
    {
      name: 'Clarity',
      description: 'How clear and understandable is the content',
      criteria: {
        10: 'Crystal clear, no ambiguity',
        7: 'Mostly clear with minor confusion',
        4: 'Some unclear sections',
        1: 'Confusing and hard to follow'
      }
    },
    {
      name: 'Accuracy',
      description: 'Factual correctness',
      criteria: {
        10: 'Completely accurate',
        7: 'Minor inaccuracies',
        4: 'Several errors',
        1: 'Mostly incorrect'
      }
    },
    {
      name: 'Engagement',
      description: 'How engaging is the content',
      criteria: {
        10: 'Highly compelling',
        7: 'Interesting',
        4: 'Somewhat boring',
        1: 'Very dull'
      }
    }
  ],
  weights: [0.4, 0.4, 0.2],  // Clarity and accuracy more important
  scale: [1, 10]
});

// Video Quality Rubric
const videoRubric = createRubric({
  dimensions: [
    { name: 'Visual Quality', description: 'Resolution, lighting, composition' },
    { name: 'Audio Quality', description: 'Clarity, levels, music' },
    { name: 'Editing', description: 'Pacing, transitions, flow' },
    { name: 'Content Value', description: 'Educational or entertainment value' }
  ],
  weights: [0.25, 0.25, 0.2, 0.3]
});

// Code Quality Rubric
const codeRubric = createRubric({
  dimensions: [
    { name: 'Correctness', description: 'Does it work as intended' },
    { name: 'Readability', description: 'Easy to understand' },
    { name: 'Efficiency', description: 'Performance and optimization' },
    { name: 'Maintainability', description: 'Easy to modify and extend' }
  ],
  weights: [0.4, 0.3, 0.15, 0.15]
});
```

---

## Scoring Content

```javascript
function scoreContent(content, rubric, scores, feedback = {}) {
  const dimensionScores = {};
  let weightedSum = 0;

  rubric.dimensions.forEach((dim, index) => {
    const score = scores[dim.name] || scores[index];
    const [min, max] = rubric.scale;

    // Validate score is within range
    const normalizedScore = Math.max(min, Math.min(max, score));

    // Calculate weighted contribution
    const contribution = normalizedScore * dim.weight;
    weightedSum += contribution;

    dimensionScores[dim.name] = {
      score: normalizedScore,
      weight: dim.weight,
      contribution,
      feedback: feedback[dim.name] || ''
    };
  });

  // Overall score
  const [min, max] = rubric.scale;
  const overallScore = weightedSum;

  return {
    overallScore,
    dimensionScores,
    grade: classifyQuality(overallScore, rubric.scale),
    percentile: ((overallScore - min) / (max - min)) * 100,
    strengths: findStrengths(dimensionScores, rubric.scale),
    weaknesses: findWeaknesses(dimensionScores, rubric.scale),
    recommendation: generateRecommendation(overallScore, rubric.scale)
  };
}

function classifyQuality(score, scale) {
  const [min, max] = scale;
  const range = max - min;
  const normalized = (score - min) / range;

  if (normalized >= 0.9) return 'Excellent';
  if (normalized >= 0.8) return 'Very Good';
  if (normalized >= 0.7) return 'Good';
  if (normalized >= 0.6) return 'Acceptable';
  if (normalized >= 0.5) return 'Below Average';
  return 'Poor';
}

function findStrengths(dimensionScores, scale) {
  const [min, max] = scale;
  const threshold = min + (max - min) * 0.8;

  return Object.entries(dimensionScores)
    .filter(([_, data]) => data.score >= threshold)
    .map(([name, data]) => ({ dimension: name, score: data.score }))
    .sort((a, b) => b.score - a.score);
}

function findWeaknesses(dimensionScores, scale) {
  const [min, max] = scale;
  const threshold = min + (max - min) * 0.6;

  return Object.entries(dimensionScores)
    .filter(([_, data]) => data.score < threshold)
    .map(([name, data]) => ({ dimension: name, score: data.score }))
    .sort((a, b) => a.score - b.score);
}

function generateRecommendation(score, scale) {
  const [min, max] = scale;
  const normalized = (score - min) / (max - min);

  if (normalized >= 0.8) return 'Ready for publication';
  if (normalized >= 0.7) return 'Minor revisions recommended';
  if (normalized >= 0.6) return 'Moderate revisions needed';
  if (normalized >= 0.5) return 'Significant revisions required';
  return 'Major rework necessary';
}
```

**Example Usage:**

```javascript
const result = scoreContent(
  myContent,
  contentRubric,
  {
    'Clarity': 8,
    'Accuracy': 9,
    'Engagement': 7
  },
  {
    'Clarity': 'Well-structured with clear examples',
    'Accuracy': 'All facts verified',
    'Engagement': 'Could use more storytelling'
  }
);

console.log(result);
// {
//   overallScore: 8.2,
//   dimensionScores: {...},
//   grade: 'Very Good',
//   percentile: 82,
//   strengths: [{dimension: 'Accuracy', score: 9}],
//   weaknesses: [{dimension: 'Engagement', score: 7}],
//   recommendation: 'Minor revisions recommended'
// }
```

---

## Comparing Scores

```javascript
function compareScores(scoreA, scoreB, rubric) {
  const diff = scoreA.overallScore - scoreB.overallScore;
  const [min, max] = rubric.scale;
  const percentDiff = (diff / (max - min)) * 100;

  const dimensionComparison = {};
  Object.keys(scoreA.dimensionScores).forEach(dim => {
    const diffScore = scoreA.dimensionScores[dim].score -
                      scoreB.dimensionScores[dim].score;
    dimensionComparison[dim] = {
      scoreA: scoreA.dimensionScores[dim].score,
      scoreB: scoreB.dimensionScores[dim].score,
      difference: diffScore,
      winner: diffScore > 0 ? 'A' : diffScore < 0 ? 'B' : 'Tie'
    };
  });

  return {
    overallWinner: diff > 0 ? 'A' : diff < 0 ? 'B' : 'Tie',
    scoreDifference: diff,
    percentDifference: percentDiff.toFixed(1) + '%',
    dimensionComparison,
    significantDifferences: Object.entries(dimensionComparison)
      .filter(([_, data]) => Math.abs(data.difference) >= 2)
      .map(([dim, data]) => ({ dimension: dim, ...data }))
  };
}
```

---

## Threshold Checking

```javascript
function meetsThreshold(score, thresholds) {
  const results = {
    overall: score.overallScore >= thresholds.overall,
    dimensions: {},
    passed: true
  };

  // Check overall threshold
  if (!results.overall) results.passed = false;

  // Check dimension thresholds
  if (thresholds.dimensions) {
    Object.entries(thresholds.dimensions).forEach(([dim, threshold]) => {
      const dimScore = score.dimensionScores[dim]?.score || 0;
      const meets = dimScore >= threshold;
      results.dimensions[dim] = {
        score: dimScore,
        threshold,
        meets
      };
      if (!meets) results.passed = false;
    });
  }

  return results;
}
```

**Example:**

```javascript
const thresholds = {
  overall: 7.0,
  dimensions: {
    'Clarity': 8,
    'Accuracy': 9
  }
};

const meetsStandards = meetsThreshold(myScore, thresholds);
// {
//   overall: true,
//   dimensions: {
//     'Clarity': { score: 8, threshold: 8, meets: true },
//     'Accuracy': { score: 9, threshold: 9, meets: true }
//   },
//   passed: true
// }
```

---

## Ranking Items

```javascript
function rankItems(items, rubric, sortBy = 'overall') {
  const ranked = items.map((item, index) => ({
    id: item.id || index,
    name: item.name || `Item ${index + 1}`,
    score: item.score,
    sortValue: sortBy === 'overall'
      ? item.score.overallScore
      : item.score.dimensionScores[sortBy]?.score || 0
  })).sort((a, b) => b.sortValue - a.sortValue);

  return ranked.map((item, index) => ({
    rank: index + 1,
    ...item,
    percentile: ((ranked.length - index) / ranked.length) * 100
  }));
}
```

---

## Automated Scoring

**Based on measurable criteria:**

```javascript
function autoScoreVideo(videoMetrics) {
  const rubric = createRubric({
    dimensions: [
      { name: 'Resolution', description: 'Video resolution quality' },
      { name: 'Audio Levels', description: 'Proper audio loudness' },
      { name: 'Engagement', description: 'Viewer retention' },
      { name: 'Duration', description: 'Appropriate length' }
    ],
    weights: [0.2, 0.3, 0.3, 0.2]
  });

  // Automated scoring based on metrics
  const scores = {
    'Resolution': scoreResolution(videoMetrics.resolution),
    'Audio Levels': scoreAudioLevels(videoMetrics.loudness),
    'Engagement': scoreEngagement(videoMetrics.avgRetention),
    'Duration': scoreDuration(videoMetrics.duration, videoMetrics.contentType)
  };

  return scoreContent(videoMetrics, rubric, scores);
}

function scoreResolution(resolution) {
  if (resolution >= 2160) return 10;  // 4K
  if (resolution >= 1080) return 9;   // 1080p
  if (resolution >= 720) return 7;    // 720p
  if (resolution >= 480) return 5;    // 480p
  return 3;                            // Below 480p
}

function scoreAudioLevels(lufs) {
  const target = -16;
  const diff = Math.abs(lufs - target);

  if (diff <= 1) return 10;
  if (diff <= 2) return 8;
  if (diff <= 3) return 6;
  if (diff <= 5) return 4;
  return 2;
}

function scoreEngagement(retention) {
  if (retention >= 80) return 10;
  if (retention >= 70) return 9;
  if (retention >= 60) return 8;
  if (retention >= 50) return 7;
  if (retention >= 40) return 6;
  if (retention >= 30) return 5;
  return 3;
}

function scoreDuration(duration, contentType) {
  const ideal = {
    'social': 60,
    'tutorial': 600,
    'podcast': 3600
  };

  const target = ideal[contentType] || 300;
  const ratio = duration / target;

  if (ratio >= 0.8 && ratio <= 1.2) return 10;  // Within 20%
  if (ratio >= 0.6 && ratio <= 1.4) return 8;   // Within 40%
  if (ratio >= 0.4 && ratio <= 1.6) return 6;   // Within 60%
  return 4;
}
```

---

## Common Quality Tiers

```javascript
const QUALITY_TIERS = {
  'Excellent': { min: 9.0, max: 10, action: 'Publish immediately' },
  'Very Good': { min: 8.0, max: 9.0, action: 'Minor polish, then publish' },
  'Good': { min: 7.0, max: 8.0, action: 'Small revisions recommended' },
  'Acceptable': { min: 6.0, max: 7.0, action: 'Moderate revisions needed' },
  'Below Average': { min: 5.0, max: 6.0, action: 'Significant rework required' },
  'Poor': { min: 0, max: 5.0, action: 'Major rework or discard' }
};

function getTier(score) {
  for (const [tier, range] of Object.entries(QUALITY_TIERS)) {
    if (score >= range.min && score < range.max) {
      return { tier, ...range };
    }
  }
  return QUALITY_TIERS['Poor'];
}
```

---

## When This Skill is Invoked

Claude will automatically use this skill when:
- Creating quality rubrics or scoring criteria
- Evaluating content across multiple dimensions
- Comparing quality between items
- Setting quality thresholds or standards
- Ranking items by quality
- Any systematic quality assessment
