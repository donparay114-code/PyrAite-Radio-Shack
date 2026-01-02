---
name: sentiment-analyzer
description: Use this skill to analyze emotional tone and sentiment in text - positive/negative/neutral classification, emotion detection, sentiment strength, and trend analysis.
allowed-tools: [Read]
---

# Sentiment Analyzer

Analyze emotional tone and sentiment in text.

## Sentiment Scoring

```javascript
const SENTIMENT_LEXICON = {
  positive: ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect', 'wonderful'],
  negative: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'worst', 'poor', 'disappointing'],
  intensifiers: ['very', 'extremely', 'really', 'absolutely'],
  negations: ['not', 'no', "n't", 'never', 'neither']
};

function analyzeSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let intensity = 1;
  let negate = false;

  words.forEach(word => {
    if (SENTIMENT_LEXICON.intensifiers.includes(word)) {
      intensity = 1.5;
    } else if (SENTIMENT_LEXICON.negations.some(n => word.includes(n))) {
      negate = true;
    } else if (SENTIMENT_LEXICON.positive.includes(word)) {
      score += (negate ? -1 : 1) * intensity;
      intensity = 1;
      negate = false;
    } else if (SENTIMENT_LEXICON.negative.includes(word)) {
      score += (negate ? 1 : -1) * intensity;
      intensity = 1;
      negate = false;
    }
  });

  const normalized = Math.max(-1, Math.min(1, score / (words.length / 10)));

  return {
    score: normalized,
    classification: normalized > 0.1 ? 'Positive' : normalized < -0.1 ? 'Negative' : 'Neutral',
    strength: Math.abs(normalized) > 0.5 ? 'Strong' : 'Moderate'
  };
}
```

## When This Skill is Invoked

Use for content analysis, brand voice checking, or user feedback analysis.
