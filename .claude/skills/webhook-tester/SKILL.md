---
name: webhook-tester
description: Use this skill to test and debug webhook integrations - validate payloads, check signatures, simulate webhooks, and troubleshoot common webhook issues.
allowed-tools: [Bash, Read]
---

# Webhook Tester

Test and debug webhook integrations.

## Validate Webhook Signature

```javascript
function validateWebhookSignature(payload, signature, secret) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## Test Webhook Locally

```bash
# Using curl to simulate webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Signature: abc123" \
  -d '{"event": "test", "data": {"id": 1}}'

# Using webhook.site for testing
curl -X POST https://webhook.site/unique-url \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Common Issues

```javascript
const WEBHOOK_ISSUES = {
  timeout: {
    symptom: 'Webhook not received',
    check: ['Firewall blocking', 'Incorrect URL', 'Server down'],
    solution: 'Verify endpoint is accessible and responding within 5s'
  },
  signature_mismatch: {
    symptom: '401/403 errors',
    check: ['Wrong secret', 'Payload modified', 'Encoding issue'],
    solution: 'Verify secret matches and payload is not modified'
  },
  duplicate_events: {
    symptom: 'Same event received multiple times',
    check: ['Retry logic triggering', 'No idempotency key'],
    solution: 'Implement idempotency using event IDs'
  }
};

function diagnoseWebhookIssue(errorType) {
  return WEBHOOK_ISSUES[errorType] || {
    symptom: 'Unknown issue',
    solution: 'Check logs and webhook provider documentation'
  };
}
```

## Replay Attack Prevention

```javascript
function checkReplayAttack(timestamp, maxAge = 300000) {
  const requestTime = new Date(timestamp).getTime();
  const now = Date.now();

  if (now - requestTime > maxAge) {
    return {
      valid: false,
      reason: 'Request too old (possible replay attack)'
    };
  }

  return { valid: true };
}
```

## When This Skill is Invoked

Use for webhook debugging, testing integrations, or troubleshooting webhook issues.
