---
name: cost-calculator
description: Use this skill to calculate costs for AI models (token-based pricing for Claude, GPT, etc.), API services (Suno, RunwayML, etc.), and track usage. Includes cost optimization suggestions and monthly estimates.
allowed-tools: [Read]
---

# Cost Calculator

Calculate and track costs across AI models, APIs, and services.

## Model Pricing Database

```javascript
const MODEL_PRICING = {
  // Anthropic Claude (per 1K tokens)
  'claude-opus-4-5': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-5': { input: 0.003, output: 0.015 },
  'claude-haiku-4': { input: 0.0003, output: 0.00125 },

  // OpenAI (per 1K tokens)
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

  // API Services (per operation)
  'suno-generate': 0.50,
  'runwayml-gen3': 0.05,  // per second
  'elevenlabs-tts': 0.30  // per 1K characters
};

function calculateLLMCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  return {
    inputCost: (inputTokens / 1000) * pricing.input,
    outputCost: (outputTokens / 1000) * pricing.output,
    totalCost: ((inputTokens / 1000) * pricing.input) +
               ((outputTokens / 1000) * pricing.output),
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

function calculateAPICost(service, quantity) {
  const price = MODEL_PRICING[service];
  return price * quantity;
}
```

## Cost Tracking

```javascript
function trackUsage(service, cost, metadata = {}) {
  return {
    timestamp: new Date().toISOString(),
    service,
    cost,
    ...metadata
  };
}

function calculateMonthlyCost(usageLog, daysElapsed) {
  const totalCost = usageLog.reduce((sum, entry) => sum + entry.cost, 0);
  return (totalCost / daysElapsed) * 30;
}
```

## Optimization Suggestions

```javascript
function suggestCheaperModel(currentModel, taskComplexity) {
  if (taskComplexity < 3 && currentModel.includes('opus')) {
    return 'claude-haiku-4';  // 50x cheaper
  }
  if (taskComplexity < 7 && currentModel.includes('opus')) {
    return 'claude-sonnet-4-5';  // 5x cheaper
  }
  return currentModel;
}
```

## When This Skill is Invoked

Use for cost tracking, budget planning, or cost optimization analysis.
