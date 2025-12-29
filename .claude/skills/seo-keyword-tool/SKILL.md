---
name: seo-keyword-tool
description: Use this skill for SEO keyword research, density analysis, ranking strategies, and optimization. Helps identify primary/secondary keywords and optimal placement.
allowed-tools: [Read]
---

# SEO Keyword Tool

Keyword research and SEO optimization.

## Keyword Density

```javascript
function calculateKeywordDensity(text, keywords) {
  const words = text.toLowerCase().split(/\s+/);
  const totalWords = words.length;

  return keywords.map(keyword => {
    const keywordLower = keyword.toLowerCase();
    const count = words.filter(w => w.includes(keywordLower)).length;
    const density = (count / totalWords) * 100;

    return {
      keyword,
      count,
      density: density.toFixed(2) + '%',
      optimal: density >= 0.5 && density <= 2.5,
      status: density < 0.5 ? 'Too Low' : density > 2.5 ? 'Too High' : 'Optimal'
    };
  });
}
```

## SEO Optimization

```javascript
function optimizeForSEO(content, targetKeyword) {
  const recommendations = [];

  // Title check
  if (!content.title.toLowerCase().includes(targetKeyword.toLowerCase())) {
    recommendations.push('Include primary keyword in title');
  }

  // First 100 words check
  const first100 = content.body.split(/\s+/).slice(0, 100).join(' ');
  if (!first100.toLowerCase().includes(targetKeyword.toLowerCase())) {
    recommendations.push('Use primary keyword in first 100 words');
  }

  // Heading check
  if (!content.headings.some(h => h.toLowerCase().includes(targetKeyword.toLowerCase()))) {
    recommendations.push('Include keyword in at least one heading');
  }

  return {
    score: 100 - (recommendations.length * 20),
    recommendations
  };
}
```

## When This Skill is Invoked

Use for SEO content optimization, keyword research, or content strategy.
