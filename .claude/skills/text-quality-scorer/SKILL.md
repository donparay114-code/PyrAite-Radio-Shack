---
name: text-quality-scorer
description: Use this skill for analyzing text quality across dimensions - readability (Flesch-Kincaid, Gunning Fog), sentiment, tone detection (formal/casual, enthusiastic/reserved), cliché detection, keyword density, sentence structure variety, voice consistency, and AI-writing pattern detection. Provides standardized scoring for content analysis.
allowed-tools: [Read, Bash]
---

# Text Quality Scorer

Universal text quality analysis and scoring framework for content evaluation.

## Core Scoring Dimensions

### 1. Readability Scores

**Flesch Reading Ease:**
```javascript
function fleschReadingEase(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = countSyllables(text);

  if (sentences === 0 || words === 0) return 0;

  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

  return Math.max(0, Math.min(100, score));
}

function countSyllables(text) {
  const words = text.toLowerCase().split(/\s+/);
  let syllables = 0;

  words.forEach(word => {
    word = word.replace(/[^a-z]/g, '');
    if (word.length === 0) return;

    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 0;

    // Adjust for silent e
    if (word.endsWith('e') && count > 1) count--;

    // Minimum 1 syllable per word
    syllables += Math.max(1, count);
  });

  return syllables;
}
```

**Interpretation:**
- 90-100: Very Easy (5th grade)
- 80-89: Easy (6th grade)
- 70-79: Fairly Easy (7th grade)
- 60-69: Standard (8th-9th grade)
- 50-59: Fairly Difficult (10th-12th grade)
- 30-49: Difficult (College)
- 0-29: Very Confusing (College graduate)

**Target Scores by Content Type:**
- Social Media: 70-80
- Blog Posts: 60-70
- Technical Docs: 50-60
- Academic: 30-50

---

**Flesch-Kincaid Grade Level:**
```javascript
function fleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = countSyllables(text);

  if (sentences === 0 || words === 0) return 0;

  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;

  const grade = (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;

  return Math.max(0, grade);
}
```

**Target Grade Levels:**
- Social Media: 6-8
- Marketing: 8-10
- General Web: 10-12
- Professional: 12-14
- Technical: 14+

---

**Gunning Fog Index:**
```javascript
function gunningFogIndex(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;

  // Count complex words (3+ syllables)
  const complexWords = text.split(/\s+/).filter(word => {
    const syllables = countSyllables(word);
    return syllables >= 3;
  }).length;

  if (sentences === 0 || words === 0) return 0;

  const avgSentenceLength = words / sentences;
  const percentComplexWords = (complexWords / words) * 100;

  const fog = 0.4 * (avgSentenceLength + percentComplexWords);

  return fog;
}
```

**Interpretation:**
- <8: Easy reading
- 8-10: Ideal for web content
- 10-12: High school level
- 12-14: College level
- 14+: Postgraduate level

---

### 2. Sentiment Analysis

**Basic Sentiment Scoring:**
```javascript
const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
  'love', 'best', 'perfect', 'beautiful', 'awesome', 'brilliant',
  'outstanding', 'superior', 'exceptional', 'remarkable', 'impressive'
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'awful', 'horrible', 'poor', 'worst',
  'hate', 'disappointing', 'useless', 'pathetic', 'mediocre',
  'failed', 'failure', 'wrong', 'broken', 'inferior'
];

const INTENSIFIERS = ['very', 'extremely', 'really', 'absolutely', 'completely'];
const NEGATIONS = ['not', 'no', "n't", 'never', 'neither', 'nobody'];

function sentimentScore(text) {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let intensity = 1;
  let negate = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z']/g, '');

    // Check for intensifiers
    if (INTENSIFIERS.includes(word)) {
      intensity = 1.5;
      continue;
    }

    // Check for negations
    if (NEGATIONS.some(neg => word.includes(neg))) {
      negate = true;
      continue;
    }

    // Score sentiment
    if (POSITIVE_WORDS.includes(word)) {
      score += (negate ? -1 : 1) * intensity;
    } else if (NEGATIVE_WORDS.includes(word)) {
      score += (negate ? 1 : -1) * intensity;
    }

    // Reset modifiers
    intensity = 1;
    negate = false;
  }

  // Normalize to -1 to 1 range
  const normalized = Math.max(-1, Math.min(1, score / (words.length / 10)));

  return {
    score: normalized,
    classification: normalized > 0.1 ? 'Positive' :
                    normalized < -0.1 ? 'Negative' : 'Neutral',
    strength: Math.abs(normalized) > 0.5 ? 'Strong' : 'Weak'
  };
}
```

---

### 3. Tone Detection

**Formality Detector:**
```javascript
const INFORMAL_INDICATORS = [
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'nope',
  'ok', 'omg', 'lol', 'btw', 'fyi', 'asap', 'hey', 'hi there'
];

const FORMAL_INDICATORS = [
  'therefore', 'furthermore', 'moreover', 'nevertheless', 'consequently',
  'hence', 'thus', 'accordingly', 'whereas', 'henceforth'
];

const CONTRACTIONS = ["n't", "'ll", "'re", "'ve", "'d", "'s", "'m"];

function formalityScore(text) {
  const words = text.toLowerCase().split(/\s+/);
  let formalityScore = 50; // Start neutral

  // Check for informal indicators
  words.forEach(word => {
    if (INFORMAL_INDICATORS.some(ind => word.includes(ind))) {
      formalityScore -= 5;
    }
    if (FORMAL_INDICATORS.includes(word)) {
      formalityScore += 5;
    }
    if (CONTRACTIONS.some(cont => word.includes(cont))) {
      formalityScore -= 2;
    }
  });

  // Check for first/second person (informal)
  const personalPronouns = (text.match(/\b(I|we|you|me|us|my|our|your)\b/gi) || []).length;
  formalityScore -= personalPronouns * 1;

  // Sentence length (longer = more formal)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = words.length / Math.max(1, sentences.length);
  if (avgSentenceLength > 20) formalityScore += 5;
  if (avgSentenceLength < 10) formalityScore -= 5;

  const normalized = Math.max(0, Math.min(100, formalityScore));

  return {
    score: normalized,
    level: normalized > 70 ? 'Formal' :
           normalized > 40 ? 'Neutral' : 'Casual'
  };
}
```

---

**Enthusiasm Detector:**
```javascript
const ENTHUSIASM_INDICATORS = [
  'amazing', 'awesome', 'fantastic', 'incredible', 'exciting',
  'wow', 'love', 'great', 'excellent', 'brilliant', 'wonderful'
];

function enthusiasmScore(text) {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;

  // Count enthusiasm words
  words.forEach(word => {
    if (ENTHUSIASM_INDICATORS.some(ind => word.includes(ind))) {
      score += 10;
    }
  });

  // Count exclamation marks
  const exclamations = (text.match(/!/g) || []).length;
  score += exclamations * 15;

  // Count ALL CAPS words
  const capsWords = text.split(/\s+/).filter(word =>
    word.length > 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
  ).length;
  score += capsWords * 10;

  // Count emojis (basic detection)
  const emojis = (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  score += emojis * 5;

  // Normalize to 0-100
  const normalized = Math.min(100, score);

  return {
    score: normalized,
    level: normalized > 60 ? 'Enthusiastic' :
           normalized > 30 ? 'Moderate' : 'Reserved'
  };
}
```

---

### 4. Cliché and Filler Detection

**Common Clichés:**
```javascript
const CLICHES = [
  'at the end of the day',
  'think outside the box',
  'low-hanging fruit',
  'circle back',
  'touch base',
  'move the needle',
  'paradigm shift',
  'game changer',
  'synergy',
  'leverage',
  'deep dive',
  'drill down',
  'bottom line',
  'win-win',
  'best practices',
  'cutting edge',
  'state of the art',
  'revolutionary',
  'next generation',
  'world-class'
];

const FILLER_WORDS = [
  'very', 'really', 'just', 'actually', 'basically', 'literally',
  'obviously', 'clearly', 'simply', 'essentially', 'totally',
  'absolutely', 'definitely', 'certainly', 'quite', 'rather'
];

function detectCliches(text) {
  const lowerText = text.toLowerCase();
  const foundCliches = [];

  CLICHES.forEach(cliche => {
    if (lowerText.includes(cliche)) {
      const count = (lowerText.match(new RegExp(cliche, 'g')) || []).length;
      foundCliches.push({ phrase: cliche, count });
    }
  });

  return foundCliches;
}

function detectFillerWords(text) {
  const words = text.toLowerCase().split(/\s+/);
  const fillerCount = {};
  let totalFillers = 0;

  words.forEach(word => {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (FILLER_WORDS.includes(cleaned)) {
      fillerCount[cleaned] = (fillerCount[cleaned] || 0) + 1;
      totalFillers++;
    }
  });

  const fillerPercentage = (totalFillers / words.length) * 100;

  return {
    count: totalFillers,
    percentage: fillerPercentage,
    breakdown: fillerCount,
    severity: fillerPercentage > 5 ? 'High' :
              fillerPercentage > 2 ? 'Moderate' : 'Low'
  };
}
```

---

### 5. AI Writing Pattern Detection

**Common AI Patterns:**
```javascript
const AI_PHRASES = [
  'delve into',
  'tapestry',
  'intricate',
  'nuanced',
  'multifaceted',
  'paramount',
  'it\'s worth noting',
  'it\'s important to note',
  'in conclusion',
  'in summary',
  'in today\'s world',
  'in today\'s fast-paced world',
  'unlock',
  'unleash',
  'harness',
  'leverage',
  'navigate',
  'realm',
  'landscape',
  'ecosystem',
  'dive deep',
  'let\'s explore'
];

const AI_PATTERNS = {
  listIntro: /^(here are|here's) \d+ (ways|reasons|tips|steps)/i,
  excessiveHedging: /(might|could|possibly|perhaps|potentially) (be|have)/gi,
  overlyFormal: /it is (important|crucial|essential|vital) to (note|understand|recognize)/gi,
  genericOpeners: /^(in|during|with|as) (today's|our|the modern)/i
};

function detectAIPatterns(text) {
  const lowerText = text.toLowerCase();
  const patterns = {
    aiPhrases: [],
    patternMatches: {},
    score: 0
  };

  // Check for AI phrases
  AI_PHRASES.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      const count = (lowerText.match(new RegExp(phrase, 'g')) || []).length;
      patterns.aiPhrases.push({ phrase, count });
      patterns.score += count * 10;
    }
  });

  // Check for patterns
  Object.keys(AI_PATTERNS).forEach(patternName => {
    const matches = text.match(AI_PATTERNS[patternName]);
    if (matches && matches.length > 0) {
      patterns.patternMatches[patternName] = matches.length;
      patterns.score += matches.length * 5;
    }
  });

  // Check for perfect grammar (AI tends to be too perfect)
  const grammarPerfection = checkGrammarPerfection(text);
  if (grammarPerfection > 0.95) patterns.score += 10;

  return {
    ...patterns,
    likelihood: patterns.score > 40 ? 'High' :
                patterns.score > 20 ? 'Moderate' : 'Low'
  };
}

function checkGrammarPerfection(text) {
  // Simple heuristic: check for varied sentence structure
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const startWords = sentences.map(s => s.trim().split(/\s+/)[0].toLowerCase());
  const uniqueStarts = new Set(startWords);

  // Human writing has more variety
  return 1 - (uniqueStarts.size / sentences.length);
}
```

---

### 6. Keyword Density

**Calculate Keyword Density:**
```javascript
function keywordDensity(text, keywords) {
  const words = text.toLowerCase().split(/\s+/);
  const totalWords = words.length;
  const densities = {};

  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    const count = words.filter(word => word.includes(keywordLower)).length;
    const density = (count / totalWords) * 100;

    densities[keyword] = {
      count,
      density: density.toFixed(2),
      optimal: density >= 0.5 && density <= 2.5,  // SEO best practice
      status: density < 0.5 ? 'Too Low' :
              density > 2.5 ? 'Too High' : 'Optimal'
    };
  });

  return densities;
}
```

**Optimal Density:**
- Primary keyword: 1-2%
- Secondary keywords: 0.5-1%
- Total keyword density: <5%

---

### 7. Sentence Structure Variety

**Analyze Sentence Patterns:**
```javascript
function analyzeSentenceStructure(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  const lengths = sentences.map(s => s.split(/\s+/).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const stdDev = Math.sqrt(
    lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
  );

  // Check for variety
  const short = lengths.filter(l => l < 10).length;
  const medium = lengths.filter(l => l >= 10 && l < 20).length;
  const long = lengths.filter(l => l >= 20).length;

  const variety = {
    avgLength: avgLength.toFixed(1),
    standardDeviation: stdDev.toFixed(1),
    distribution: {
      short: (short / sentences.length * 100).toFixed(1) + '%',
      medium: (medium / sentences.length * 100).toFixed(1) + '%',
      long: (long / sentences.length * 100).toFixed(1) + '%'
    },
    varietyScore: stdDev > 5 ? 'Good' :
                   stdDev > 3 ? 'Moderate' : 'Low'
  };

  return variety;
}
```

**Ideal Distribution:**
- Short sentences (<10 words): 30-40%
- Medium sentences (10-20 words): 40-50%
- Long sentences (>20 words): 10-20%

---

### 8. Voice Consistency

**Check Consistency:**
```javascript
function checkVoiceConsistency(text, brandVoiceProfile) {
  const {
    targetFormality,      // 0-100 scale
    targetEnthusiasm,     // 0-100 scale
    allowedClichés,       // array of acceptable clichés
    forbiddenPhrases      // array of forbidden phrases
  } = brandVoiceProfile;

  const formality = formalityScore(text);
  const enthusiasm = enthusiasmScore(text);
  const clichés = detectCliches(text);
  const aiPatterns = detectAIPatterns(text);

  const violations = [];
  let consistencyScore = 100;

  // Check formality deviation
  const formalityDiff = Math.abs(formality.score - targetFormality);
  if (formalityDiff > 20) {
    violations.push(`Formality mismatch (target: ${targetFormality}, actual: ${formality.score})`);
    consistencyScore -= 20;
  }

  // Check enthusiasm deviation
  const enthusiasmDiff = Math.abs(enthusiasm.score - targetEnthusiasm);
  if (enthusiasmDiff > 20) {
    violations.push(`Enthusiasm mismatch (target: ${targetEnthusiasm}, actual: ${enthusiasm.score})`);
    consistencyScore -= 20;
  }

  // Check for forbidden clichés
  clichés.forEach(cliche => {
    if (!allowedClichés || !allowedClichés.includes(cliche.phrase)) {
      violations.push(`Cliché detected: "${cliche.phrase}"`);
      consistencyScore -= 10;
    }
  });

  // Check for AI patterns
  if (aiPatterns.likelihood === 'High') {
    violations.push('High likelihood of AI-generated patterns');
    consistencyScore -= 15;
  }

  return {
    score: Math.max(0, consistencyScore),
    violations,
    consistent: consistencyScore >= 70
  };
}
```

---

## Composite Text Quality Score

**Overall Quality Assessment:**
```javascript
function overallTextQuality(text, options = {}) {
  const readability = fleschReadingEase(text);
  const gradeLevel = fleschKincaidGrade(text);
  const sentiment = sentimentScore(text);
  const formality = formalityScore(text);
  const enthusiasm = enthusiasmScore(text);
  const clichés = detectCliches(text);
  const fillers = detectFillerWords(text);
  const aiPatterns = detectAIPatterns(text);
  const structure = analyzeSentenceStructure(text);

  // Calculate composite score
  let score = 100;

  // Readability penalty
  if (options.targetAudience === 'general' && readability < 60) score -= 10;
  if (options.targetAudience === 'social' && readability < 70) score -= 15;

  // Filler words penalty
  if (fillers.severity === 'High') score -= 15;
  if (fillers.severity === 'Moderate') score -= 5;

  // Cliché penalty
  score -= clichés.length * 3;

  // AI pattern penalty
  if (aiPatterns.likelihood === 'High') score -= 20;
  if (aiPatterns.likelihood === 'Moderate') score -= 10;

  // Structure penalty
  if (structure.varietyScore === 'Low') score -= 10;

  score = Math.max(0, Math.min(100, score));

  return {
    overallScore: score,
    grade: score >= 90 ? 'A' :
           score >= 80 ? 'B' :
           score >= 70 ? 'C' :
           score >= 60 ? 'D' : 'F',
    metrics: {
      readability: { score: readability, gradeLevel },
      sentiment,
      tone: { formality, enthusiasm },
      quality: {
        clichés: clichés.length,
        fillerPercentage: fillers.percentage.toFixed(2),
        aiLikelihood: aiPatterns.likelihood,
        sentenceVariety: structure.varietyScore
      }
    },
    recommendations: generateRecommendations({
      readability,
      gradeLevel,
      clichés,
      fillers,
      aiPatterns,
      structure,
      options
    })
  };
}

function generateRecommendations(analysis) {
  const recommendations = [];

  if (analysis.readability < 60) {
    recommendations.push('Improve readability: Use shorter sentences and simpler words');
  }

  if (analysis.gradeLevel > 12) {
    recommendations.push('Lower reading level: Target 8-10th grade for general audience');
  }

  if (analysis.clichés.length > 0) {
    recommendations.push(`Remove clichés: ${analysis.clichés.slice(0, 3).map(c => c.phrase).join(', ')}`);
  }

  if (analysis.fillers.percentage > 5) {
    recommendations.push('Reduce filler words: Remove excessive "very", "really", "just"');
  }

  if (analysis.aiPatterns.likelihood !== 'Low') {
    recommendations.push('Add human touch: Vary sentence structure, use contractions, add personality');
  }

  if (analysis.structure.varietyScore === 'Low') {
    recommendations.push('Improve sentence variety: Mix short, medium, and long sentences');
  }

  return recommendations;
}
```

---

## Bash Implementation

**Quick readability check:**
```bash
#!/bin/bash
# Simple readability scorer

text_file="$1"

# Count stats
sentences=$(grep -o '[.!?]' "$text_file" | wc -l)
words=$(wc -w < "$text_file")

# Estimate syllables (rough approximation)
syllables=$(grep -o '[aeiouAEIOU]' "$text_file" | wc -l)

# Flesch Reading Ease (approximation)
avg_sentence_length=$(echo "scale=2; $words / $sentences" | bc)
avg_syllables_per_word=$(echo "scale=2; $syllables / $words" | bc)

flesch=$(echo "206.835 - (1.015 * $avg_sentence_length) - (84.6 * $avg_syllables_per_word)" | bc)

echo "Readability Analysis:"
echo "  Words: $words"
echo "  Sentences: $sentences"
echo "  Avg Sentence Length: $avg_sentence_length"
echo "  Flesch Reading Ease: $flesch"
```

---

## When This Skill is Invoked

Claude will automatically use this skill when:
- Analyzing text quality or readability
- Scoring content before publication
- Detecting AI-generated content
- Checking brand voice consistency
- Evaluating writing style
- Performing content audits
- Any text quality assessment task
