---
name: error-pattern-detector
description: Use this skill to detect common errors and anti-patterns in code, workflows, or content. Provides error classification, suggested fixes, and pattern matching for known issues.
allowed-tools: [Read]
---

# Error Pattern Detector

Detect common errors and suggest fixes.

## Common Error Patterns

```javascript
const ERROR_PATTERNS = {
  rate_limit: {
    pattern: /429|rate.*limit/i,
    solution: 'Implement exponential backoff and retry logic',
    severity: 'high'
  },
  timeout: {
    pattern: /timeout|ETIMEDOUT/i,
    solution: 'Increase timeout or add retry mechanism',
    severity: 'medium'
  },
  auth_failed: {
    pattern: /401|unauthorized/i,
    solution: 'Check API credentials and token expiry',
    severity: 'high'
  },
  not_found: {
    pattern: /404|not found/i,
    solution: 'Verify resource exists and path is correct',
    severity: 'medium'
  }
};

function detectErrorPattern(errorMessage) {
  for (const [name, config] of Object.entries(ERROR_PATTERNS)) {
    if (config.pattern.test(errorMessage)) {
      return {
        pattern: name,
        solution: config.solution,
        severity: config.severity
      };
    }
  }

  return {
    pattern: 'unknown',
    solution: 'Review error message and logs for details',
    severity: 'medium'
  };
}
```

## Anti-Pattern Detection

```javascript
function detectAntipatterns(code) {
  const issues = [];

  // Callback hell
  if ((code.match(/function.*{/g) || []).length > 3) {
    issues.push({
      pattern: 'callback_hell',
      severity: 'high',
      suggestion: 'Use async/await or Promises'
    });
  }

  // Missing error handling
  if (code.includes('await') && !code.includes('try')) {
    issues.push({
      pattern: 'missing_error_handling',
      severity: 'high',
      suggestion: 'Add try/catch blocks'
    });
  }

  return issues;
}
```

## When This Skill is Invoked

Use for debugging, code review, or error analysis.
