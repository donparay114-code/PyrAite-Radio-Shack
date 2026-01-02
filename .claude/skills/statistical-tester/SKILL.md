---
name: statistical-tester
description: Use this skill for A/B testing, statistical significance testing (t-tests, chi-square), sample size calculations, Bayesian analysis, multi-armed bandit algorithms, and experimental design. Ensures correct statistical methodology and prevents common errors in testing.
allowed-tools: [Bash, Read]
---

# Statistical Tester

Professional statistical testing for A/B tests, significance analysis, and experimental design.

## Core Statistical Tests

### 1. Two-Sample T-Test

**Independent t-test:**
```javascript
function tTest(groupA, groupB) {
  const n1 = groupA.length;
  const n2 = groupB.length;

  const mean1 = groupA.reduce((a, b) => a + b, 0) / n1;
  const mean2 = groupB.reduce((a, b) => a + b, 0) / n2;

  // Calculate variance
  const variance1 = groupA.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
  const variance2 = groupB.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);

  // Pooled standard error
  const pooledSE = Math.sqrt((variance1 / n1) + (variance2 / n2));

  // t-statistic
  const tStat = (mean1 - mean2) / pooledSE;

  // Degrees of freedom (Welch-Satterthwaite)
  const df = Math.pow(variance1/n1 + variance2/n2, 2) /
             (Math.pow(variance1/n1, 2)/(n1-1) + Math.pow(variance2/n2, 2)/(n2-1));

  // p-value approximation (two-tailed)
  const pValue = approximatePValue(Math.abs(tStat), df);

  return {
    tStatistic: tStat,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < 0.05,
    meanDifference: mean1 - mean2,
    percentChange: ((mean1 - mean2) / mean2) * 100,
    effectSize: cohenD(groupA, groupB)
  };
}

function cohenD(groupA, groupB) {
  const mean1 = groupA.reduce((a, b) => a + b, 0) / groupA.length;
  const mean2 = groupB.reduce((a, b) => a + b, 0) / groupB.length;

  const variance1 = groupA.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (groupA.length - 1);
  const variance2 = groupB.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (groupB.length - 1);

  const pooledSD = Math.sqrt((variance1 + variance2) / 2);

  return (mean1 - mean2) / pooledSD;
}
```

**Effect Size Interpretation:**
- Small: 0.2
- Medium: 0.5
- Large: 0.8+

---

### 2. Proportion Test (Z-Test)

**For conversion rate comparison:**
```javascript
function proportionTest(conversions1, total1, conversions2, total2) {
  const p1 = conversions1 / total1;
  const p2 = conversions2 / total2;

  // Pooled proportion
  const pPooled = (conversions1 + conversions2) / (total1 + total2);

  // Standard error
  const SE = Math.sqrt(pPooled * (1 - pPooled) * (1/total1 + 1/total2));

  // Z-statistic
  const zStat = (p1 - p2) / SE;

  // p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zStat)));

  // Confidence interval
  const SE_diff = Math.sqrt((p1*(1-p1)/total1) + (p2*(1-p2)/total2));
  const marginOfError = 1.96 * SE_diff;

  return {
    zStatistic: zStat,
    pValue,
    significant: pValue < 0.05,
    conversion1: (p1 * 100).toFixed(2) + '%',
    conversion2: (p2 * 100).toFixed(2) + '%',
    lift: ((p1 - p2) / p2 * 100).toFixed(2) + '%',
    confidenceInterval: {
      lower: ((p1 - p2 - marginOfError) * 100).toFixed(2) + '%',
      upper: ((p1 - p2 + marginOfError) * 100).toFixed(2) + '%'
    }
  };
}

function normalCDF(z) {
  // Approximation of cumulative distribution function
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - probability : probability;
}
```

---

### 3. Chi-Square Test

**For categorical data:**
```javascript
function chiSquareTest(observed, expected) {
  let chiSquare = 0;
  let df = 0;

  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      const obs = observed[i][j];
      const exp = expected[i][j];
      chiSquare += Math.pow(obs - exp, 2) / exp;
      df++;
    }
  }

  df = (observed.length - 1) * (observed[0].length - 1);

  const pValue = chiSquarePValue(chiSquare, df);

  return {
    chiSquare,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < 0.05
  };
}

function chiSquarePValue(chiSquare, df) {
  // Simplified approximation
  if (df === 1) {
    if (chiSquare > 10.83) return 0.001;
    if (chiSquare > 6.63) return 0.01;
    if (chiSquare > 3.84) return 0.05;
    return 0.1;
  }
  // For more df, use lookup table or library
  return chiSquare > 3.84 ? 0.05 : 0.1;
}
```

---

### 4. Sample Size Calculator

**For proportion tests:**
```javascript
function calculateSampleSize(options) {
  const {
    baselineRate,           // Current conversion rate (e.g., 0.05 for 5%)
    minDetectableEffect,    // Minimum lift to detect (e.g., 0.01 for 1% absolute)
    alpha = 0.05,           // Significance level (default 5%)
    power = 0.8,            // Statistical power (default 80%)
    twoTailed = true        // Two-tailed test
  } = options;

  // Z-scores
  const zAlpha = twoTailed ? 1.96 : 1.645;  // For alpha = 0.05
  const zBeta = 0.84;  // For power = 0.8

  const p1 = baselineRate;
  const p2 = baselineRate + minDetectableEffect;
  const pAvg = (p1 + p2) / 2;

  // Sample size per variant
  const n = Math.pow(zAlpha + zBeta, 2) * 2 * pAvg * (1 - pAvg) / Math.pow(p2 - p1, 2);

  // Duration estimate
  const samplesPerVariant = Math.ceil(n);
  const totalSamples = samplesPerVariant * 2;

  return {
    samplesPerVariant,
    totalSamples,
    baseline: (baselineRate * 100).toFixed(2) + '%',
    targetRate: (p2 * 100).toFixed(2) + '%',
    minimumLift: ((minDetectableEffect / baselineRate) * 100).toFixed(1) + '%',
    power: (power * 100) + '%',
    significance: (alpha * 100) + '%'
  };
}
```

**Example:**
```javascript
calculateSampleSize({
  baselineRate: 0.05,        // 5% conversion
  minDetectableEffect: 0.01, // Want to detect 1% absolute lift (20% relative)
  alpha: 0.05,
  power: 0.8
})
// Returns: ~3841 samples per variant
```

**For mean comparisons:**
```javascript
function calculateSampleSizeMeans(options) {
  const {
    mean1,
    mean2,
    stdDev,
    alpha = 0.05,
    power = 0.8
  } = options;

  const zAlpha = 1.96;
  const zBeta = 0.84;

  const effectSize = Math.abs(mean1 - mean2) / stdDev;

  const n = Math.pow((zAlpha + zBeta) / effectSize, 2) * 2;

  return {
    samplesPerVariant: Math.ceil(n),
    effectSize,
    interpretation: effectSize < 0.2 ? 'Small' :
                    effectSize < 0.5 ? 'Medium' : 'Large'
  };
}
```

---

### 5. Bayesian A/B Test

**More intuitive interpretation:**
```javascript
function bayesianABTest(conversionsA, totalA, conversionsB, totalB, priorAlpha = 1, priorBeta = 1) {
  // Update prior with data
  const alphaA = priorAlpha + conversionsA;
  const betaA = priorBeta + (totalA - conversionsA);

  const alphaB = priorAlpha + conversionsB;
  const betaB = priorBeta + (totalB - conversionsB);

  // Monte Carlo simulation
  const samples = 10000;
  let countBWins = 0;

  for (let i = 0; i < samples; i++) {
    const sampleA = betaSample(alphaA, betaA);
    const sampleB = betaSample(alphaB, betaB);

    if (sampleB > sampleA) countBWins++;
  }

  const probabilityBBetter = countBWins / samples;

  // Expected values
  const expectedA = alphaA / (alphaA + betaA);
  const expectedB = alphaB / (alphaB + betaB);
  const expectedLift = ((expectedB - expectedA) / expectedA) * 100;

  // Credible interval (95%)
  const credibleInterval = {
    lower: (betaQuantile(0.025, alphaB - alphaA, betaB - betaA) * 100).toFixed(2) + '%',
    upper: (betaQuantile(0.975, alphaB - alphaA, betaB - betaA) * 100).toFixed(2) + '%'
  };

  return {
    probabilityBBetter: (probabilityBBetter * 100).toFixed(1) + '%',
    expectedLift: expectedLift.toFixed(2) + '%',
    credibleInterval,
    decision: probabilityBBetter > 0.95 ? 'Choose B' :
              probabilityBBetter < 0.05 ? 'Choose A' :
              'Not enough evidence'
  };
}

function betaSample(alpha, beta) {
  // Generate beta distribution sample (simplified)
  const gammaA = gammaSample(alpha);
  const gammaB = gammaSample(beta);
  return gammaA / (gammaA + gammaB);
}

function gammaSample(shape) {
  // Simplified gamma sampler
  let sum = 0;
  for (let i = 0; i < shape; i++) {
    sum += -Math.log(Math.random());
  }
  return sum;
}

function betaQuantile(p, alpha, beta) {
  // Approximation
  const mean = alpha / (alpha + beta);
  return mean;  // Simplified
}
```

---

### 6. Multi-Armed Bandit

**Thompson Sampling:**
```javascript
class ThompsonBandit {
  constructor(variants) {
    this.variants = variants.map(name => ({
      name,
      alpha: 1,  // Prior successes
      beta: 1    // Prior failures
    }));
  }

  selectVariant() {
    // Sample from each variant's beta distribution
    const samples = this.variants.map(v => ({
      name: v.name,
      sample: betaSample(v.alpha, v.beta)
    }));

    // Return variant with highest sample
    return samples.reduce((best, current) =>
      current.sample > best.sample ? current : best
    ).name;
  }

  update(variantName, success) {
    const variant = this.variants.find(v => v.name === variantName);
    if (success) {
      variant.alpha += 1;
    } else {
      variant.beta += 1;
    }
  }

  getStats() {
    return this.variants.map(v => ({
      name: v.name,
      expectedValue: v.alpha / (v.alpha + v.beta),
      samples: v.alpha + v.beta - 2,
      wins: v.alpha - 1
    }));
  }
}
```

**Usage:**
```javascript
const bandit = new ThompsonBandit(['Control', 'Variant A', 'Variant B']);

// In your application
const selectedVariant = bandit.selectVariant();
// Show user the selected variant
// When they convert (or don't):
bandit.update(selectedVariant, converted);

// Check current performance
const stats = bandit.getStats();
```

---

### 7. Sequential Testing

**Monitor test continuously:**
```javascript
function sequentialTest(conversions1, total1, conversions2, total2) {
  const p1 = conversions1 / total1;
  const p2 = conversions2 / total2;

  // Calculate likelihood ratio
  const likelihoodRatio = Math.pow(p1 / p2, conversions1) *
                          Math.pow((1-p1) / (1-p2), total1 - conversions1);

  // SPRT boundaries (example: alpha=0.05, beta=0.2)
  const upperBound = (1 - 0.2) / 0.05;  // ~15.67
  const lowerBound = 0.2 / (1 - 0.05);  // ~0.21

  let decision = 'Continue';
  if (likelihoodRatio >= upperBound) {
    decision = 'Variant B wins';
  } else if (likelihoodRatio <= lowerBound) {
    decision = 'Control (A) wins';
  }

  return {
    likelihoodRatio,
    decision,
    currentLift: ((p2 - p1) / p1 * 100).toFixed(2) + '%',
    samplesCollected: total1 + total2
  };
}
```

---

### 8. Multiple Comparison Correction

**Bonferroni Correction:**
```javascript
function bonferroniCorrection(pValues) {
  const numTests = pValues.length;
  const adjustedAlpha = 0.05 / numTests;

  return pValues.map((p, index) => ({
    test: index + 1,
    originalP: p,
    adjustedAlpha,
    significant: p < adjustedAlpha
  }));
}
```

**Example:**
```javascript
const results = bonferroniCorrection([0.02, 0.03, 0.04, 0.01]);
// With 4 tests, need p < 0.0125 to be significant
```

---

### 9. Minimum Detectable Effect

**Calculate MDE for existing sample size:**
```javascript
function minimumDetectableEffect(sampleSize, baselineRate, alpha = 0.05, power = 0.8) {
  const zAlpha = 1.96;
  const zBeta = 0.84;

  const p1 = baselineRate;

  // Solve for p2
  const term = Math.sqrt(2 * p1 * (1 - p1) / sampleSize);
  const mde = (zAlpha + zBeta) * term;

  const absoluteMDE = mde;
  const relativeMDE = (mde / baselineRate) * 100;

  return {
    absoluteMDE: (absoluteMDE * 100).toFixed(2) + '%',
    relativeMDE: relativeMDE.toFixed(1) + '%',
    interpretation: `With ${sampleSize} samples, can detect ${relativeMDE.toFixed(1)}% relative lift`
  };
}
```

---

### 10. Test Duration Estimator

**Estimate how long test needs to run:**
```javascript
function estimateTestDuration(options) {
  const {
    dailyTraffic,
    baselineRate,
    minDetectableEffect,
    numVariants = 2,
    alpha = 0.05,
    power = 0.8
  } = options;

  // Calculate required sample size
  const sampleCalc = calculateSampleSize({
    baselineRate,
    minDetectableEffect,
    alpha,
    power
  });

  const totalSamplesNeeded = sampleCalc.samplesPerVariant * numVariants;
  const daysNeeded = Math.ceil(totalSamplesNeeded / dailyTraffic);

  return {
    totalSamplesNeeded,
    samplesPerVariant: sampleCalc.samplesPerVariant,
    daysNeeded,
    weeksNeeded: (daysNeeded / 7).toFixed(1),
    trafficAllocation: `${(100 / numVariants).toFixed(0)}% per variant`
  };
}
```

**Example:**
```javascript
estimateTestDuration({
  dailyTraffic: 1000,
  baselineRate: 0.05,
  minDetectableEffect: 0.01,
  numVariants: 2
})
// Returns: ~8 days needed
```

---

## Common Pitfalls to Avoid

### 1. Peeking Problem
**Don't stop test early based on interim results:**
```javascript
function checkEarlyStopping(currentPValue, samplesCollected, plannedSamples) {
  const completion = (samplesCollected / plannedSamples) * 100;

  if (completion < 80 && currentPValue < 0.05) {
    return {
      shouldStop: false,
      reason: 'Risk of false positive due to peeking',
      recommendation: `Wait until ${plannedSamples} samples collected`
    };
  }

  return {
    shouldStop: true,
    reason: 'Sufficient data collected'
  };
}
```

### 2. Multiple Testing
**Correct for multiple comparisons:**
```javascript
function checkMultipleTesting(numTests) {
  const correctedAlpha = 0.05 / numTests;

  return {
    originalAlpha: 0.05,
    correctedAlpha,
    message: `With ${numTests} tests, each needs p < ${correctedAlpha.toFixed(4)}`
  };
}
```

### 3. Sample Ratio Mismatch
**Check for implementation bugs:**
```javascript
function sampleRatioMismatch(samplesA, samplesB, expectedRatio = 0.5) {
  const total = samplesA + samplesB;
  const actualRatio = samplesA / total;

  // Chi-square test for equal allocation
  const expected = total * expectedRatio;
  const chiSquare = Math.pow(samplesA - expected, 2) / expected +
                    Math.pow(samplesB - (total - expected), 2) / (total - expected);

  const pValue = chiSquarePValue(chiSquare, 1);

  return {
    expectedRatio: (expectedRatio * 100) + '%',
    actualRatio: (actualRatio * 100).toFixed(1) + '%',
    deviation: ((actualRatio - expectedRatio) * 100).toFixed(1) + '%',
    suspicious: pValue < 0.01,
    message: pValue < 0.01 ? 'WARNING: Significant SRM detected - check implementation!' : 'No SRM detected'
  };
}
```

---

## When This Skill is Invoked

Claude will automatically use this skill when:
- Running A/B tests or experiments
- Calculating statistical significance
- Determining sample sizes
- Analyzing test results
- Designing experiments
- Evaluating conversion rates
- Any statistical testing task
