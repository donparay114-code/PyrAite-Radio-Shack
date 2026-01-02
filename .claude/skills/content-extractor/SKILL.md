---
name: content-extractor
description: Use this skill to extract quotes, clips, key points, statistics, actionable tips from long-form content. Find quotable moments in transcripts, detect topic changes, and create summaries. Essential for content repurposing.
allowed-tools: [Read]
---

# Content Extractor

Extract valuable snippets from long-form content for repurposing.

## Extract Quotes

```javascript
function extractQuotes(text, options = {}) {
  const { minLength = 20, maxLength = 280, minImpact = 0.5 } = options;

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const quotes = [];

  sentences.forEach((sentence, index) => {
    const cleaned = sentence.trim();
    const wordCount = cleaned.split(/\s+/).length;

    if (wordCount >= minLength && wordCount <= maxLength) {
      const impact = scoreQuoteImpact(cleaned);
      if (impact >= minImpact) {
        quotes.push({
          quote: cleaned,
          position: index,
          wordCount,
          impact,
          context: getContext(sentences, index)
        });
      }
    }
  });

  return quotes.sort((a, b) => b.impact - a.impact);
}

function scoreQuoteImpact(quote) {
  let score = 0;

  // Power words
  const powerWords = ['amazing', 'critical', 'essential', 'key', 'secret', 'proven'];
  powerWords.forEach(word => {
    if (quote.toLowerCase().includes(word)) score += 0.2;
  });

  // Statistics
  if (/\d+%/.test(quote)) score += 0.3;

  // Action verbs
  if (/^(start|stop|avoid|do|don't|always|never)/i.test(quote)) score += 0.2;

  return Math.min(1, score);
}
```

## Extract Key Points

```javascript
function extractKeyPoints(text, count = 5) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  return sentences
    .map((s, i) => ({ sentence: s.trim(), score: scoreSentence(s), index: i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map(item => item.sentence);
}

function scoreSentence(sentence) {
  let score = 0;
  if (sentence.split(/\s+/).length > 10) score += 1;
  if (/\d+/.test(sentence)) score += 1;
  if (/important|key|essential|critical/i.test(sentence)) score += 2;
  return score;
}
```

## Find Quotable Moments (Transcript)

```javascript
function findQuotableMoments(transcript, options = {}) {
  const { minDuration = 5, maxDuration = 60 } = options;

  return transcript
    .filter(segment => {
      const duration = segment.end - segment.start;
      return duration >= minDuration && duration <= maxDuration;
    })
    .map(segment => ({
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      duration: segment.end - segment.start,
      score: scoreQuoteImpact(segment.text)
    }))
    .filter(m => m.score > 0.5)
    .sort((a, b) => b.score - a.score);
}
```

## When This Skill is Invoked

Use when repurposing content, creating social media snippets, or extracting highlights.
