---
name: api-tester
description: Test and monitor APIs including Suno, Telegram, OpenAI, and custom endpoints. Use when the user mentions API testing, endpoint validation, health checks, or troubleshooting API issues.
---

# API Tester

## Purpose
Test, validate, and monitor API endpoints to ensure reliability, catch issues early, and debug integration problems.

## Your APIs

### Suno API
**Endpoint**: Configure in n8n workflows
**Operations**:
- `POST /api/custom_generate` - Generate music
- `GET /api/get?ids={job_id}` - Check status

### Telegram Bot API
**Bot Token**: Configured in n8n
**Operations**:
- Send messages
- Receive updates
- Handle commands

### OpenAI API
**Operations**:
- Chat completions (GPT-4o-mini)
- Moderation API
- Text-to-speech (DJ intros)

### N8N Webhook Endpoints
**Base URL**: Your n8n instance
**Workflows**: Various webhook-triggered workflows

## Testing Strategies

### Quick Health Check

```bash
# Test Suno API
curl -X GET "https://your-suno-api.example.com/health" \
  -H "Accept: application/json"

# Test n8n webhook
curl -X POST "http://localhost:5678/webhook/test" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test OpenAI (with API key)
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### Comprehensive API Test

```bash
#!/bin/bash
# api_health_check.sh

echo "=== API Health Check ==="
echo ""

# Suno API
echo "Testing Suno API..."
SUNO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://your-suno-api.example.com/health)
if [ "$SUNO_RESPONSE" -eq 200 ]; then
  echo "✓ Suno API: OK"
else
  echo "✗ Suno API: FAILED (HTTP $SUNO_RESPONSE)"
fi

# N8N
echo "Testing n8n..."
N8N_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5678)
if [ "$N8N_RESPONSE" -eq 200 ]; then
  echo "✓ n8n: OK"
else
  echo "✗ n8n: FAILED (HTTP $N8N_RESPONSE)"
fi

# MySQL
echo "Testing MySQL..."
mysql -u root -pHunter0hunter2207 -e "SELECT 1" &> /dev/null
if [ $? -eq 0 ]; then
  echo "✓ MySQL: OK"
else
  echo "✗ MySQL: FAILED"
fi

echo ""
echo "=== Health Check Complete ==="
```

### Test Suno Music Generation

```javascript
// test_suno.js
const axios = require('axios');

const SUNO_API_URL = 'https://your-suno-api.example.com';

async function testSunoGeneration() {
  try {
    console.log('Testing Suno API music generation...');

    // Step 1: Generate
    const generateResponse = await axios.post(`${SUNO_API_URL}/api/custom_generate`, {
      prompt: "Test lo-fi hip hop beat with piano and drums",
      make_instrumental: true,
      wait_audio: false
    });

    console.log('✓ Generation started:', generateResponse.data);
    const jobId = generateResponse.data.data[0].id;

    // Step 2: Wait
    console.log('Waiting 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Step 3: Check status
    const statusResponse = await axios.get(`${SUNO_API_URL}/api/get?ids=${jobId}`);
    console.log('✓ Status check:', statusResponse.data);

    if (statusResponse.data.data[0].status === 'complete') {
      console.log('✓ Generation completed successfully');
      console.log('Audio URL:', statusResponse.data.data[0].audio_url);
      return { success: true, jobId, audioUrl: statusResponse.data.data[0].audio_url };
    } else {
      console.log('⚠ Generation still in progress or failed');
      return { success: false, status: statusResponse.data.data[0].status };
    }
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testSunoGeneration();
```

### Test Telegram Bot

```javascript
// test_telegram.js
const axios = require('axios');

const BOT_TOKEN = 'YOUR_BOT_TOKEN';
const CHAT_ID = 'YOUR_CHAT_ID'; // Your Telegram user ID

async function testTelegramBot() {
  try {
    console.log('Testing Telegram Bot...');

    // Get bot info
    const botInfo = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    console.log('✓ Bot info:', botInfo.data.result);

    // Send test message
    const sendMessage = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: '🧪 API Test: Telegram bot is working correctly!'
      }
    );
    console.log('✓ Message sent:', sendMessage.data);

    return { success: true };
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testTelegramBot();
```

### Test OpenAI Moderation

```javascript
// test_openai_moderation.js
const axios = require('axios');

const OPENAI_API_KEY = 'YOUR_API_KEY';

async function testOpenAIModeration() {
  try {
    console.log('Testing OpenAI Moderation API...');

    const testPrompts = [
      'Create a peaceful lo-fi hip hop beat',
      'Generate epic orchestral music'
    ];

    for (const prompt of testPrompts) {
      const response = await axios.post(
        'https://api.openai.com/v1/moderations',
        { input: prompt },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.results[0];
      console.log(`\nPrompt: "${prompt}"`);
      console.log('Flagged:', result.flagged);
      console.log('Categories:', result.categories);
    }

    return { success: true };
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

testOpenAIModeration();
```

## Load Testing

### Simple Load Test

```javascript
// load_test.js
const axios = require('axios');

async function loadTest(url, requests, concurrency) {
  console.log(`Load testing ${url}`);
  console.log(`Total requests: ${requests}, Concurrency: ${concurrency}`);

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  const makeRequest = async () => {
    try {
      await axios.get(url);
      completed++;
    } catch (error) {
      failed++;
    }
  };

  // Run in batches
  for (let i = 0; i < requests; i += concurrency) {
    const batch = Math.min(concurrency, requests - i);
    await Promise.all(
      Array(batch).fill().map(() => makeRequest())
    );
  }

  const duration = (Date.now() - startTime) / 1000;
  const rps = completed / duration;

  console.log('\n=== Results ===');
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Requests/sec: ${rps.toFixed(2)}`);
}

// Test your endpoints
loadTest('http://localhost:5678', 100, 10);
```

## Monitoring & Alerts

### API Response Time Monitor

```javascript
// monitor_api.js
const axios = require('axios');

const endpoints = [
  { name: 'Suno API', url: 'https://your-suno-api.example.com/health' },
  { name: 'n8n', url: 'http://localhost:5678' }
];

async function monitorEndpoints() {
  console.log('=== API Monitor ===');
  console.log(new Date().toISOString());
  console.log('');

  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await axios.get(endpoint.url, { timeout: 5000 });
      const duration = Date.now() - startTime;

      const status = response.status === 200 ? '✓' : '⚠';
      console.log(`${status} ${endpoint.name}: ${duration}ms (HTTP ${response.status})`);

      // Alert if slow
      if (duration > 2000) {
        console.log(`  ⚠ WARNING: Slow response (>${duration}ms)`);
      }
    } catch (error) {
      console.log(`✗ ${endpoint.name}: FAILED - ${error.message}`);
    }
  }

  console.log('');
}

// Run every minute
setInterval(monitorEndpoints, 60000);
monitorEndpoints(); // Run immediately
```

## Database Query as API Check

```sql
-- Check recent API failures in n8n executions
SELECT
  DATE(finished_at) as date,
  workflow_name,
  COUNT(*) as failures,
  GROUP_CONCAT(DISTINCT error_message SEPARATOR '; ') as errors
FROM n8n.execution_entity
WHERE finished = TRUE
  AND success = FALSE
  AND finished_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(finished_at), workflow_name
ORDER BY date DESC, failures DESC;
```

## Integration Tests

### End-to-End Radio Station Flow

```javascript
// e2e_test_radio.js
async function testRadioStationFlow() {
  console.log('=== E2E Radio Station Test ===\n');

  // 1. Submit song request via Telegram
  console.log('1. Submitting song request...');
  // (Implementation depends on your Telegram setup)

  // 2. Check database for request
  console.log('2. Checking database...');
  const requestQuery = `
    SELECT * FROM radio_station.song_requests
    ORDER BY created_at DESC LIMIT 1
  `;
  // Execute query

  // 3. Check if added to queue
  console.log('3. Checking queue...');
  const queueQuery = `
    SELECT * FROM radio_station.radio_queue
    WHERE request_id = ?
  `;

  // 4. Monitor generation status
  console.log('4. Monitoring generation...');
  // Poll until completed

  // 5. Verify MP3 file exists
  console.log('5. Checking MP3 file...');
  // Check filesystem

  console.log('\n✓ E2E test completed');
}
```

## Best Practices

1. **Test early, test often**: Run API tests before deploying changes
2. **Automate**: Set up monitoring scripts to run periodically
3. **Check status codes**: Don't just check if request succeeded
4. **Validate responses**: Ensure response structure matches expectations
5. **Handle timeouts**: Set appropriate timeout values
6. **Test edge cases**: Empty requests, invalid data, rate limits
7. **Monitor in production**: Track API health continuously

## Common Issues

### API Returns 429 (Rate Limited)
```javascript
// Add retry logic with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(url, options);
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### API Returns 500 (Server Error)
- Check API logs
- Verify request payload is valid
- Check if API service is running
- Test with minimal payload

### Connection Timeout
- Check network connectivity
- Verify API URL is correct
- Increase timeout value if API is legitimately slow
- Check firewall/proxy settings

## Tools

### Recommended Testing Tools
- **curl** - Command-line API testing
- **Postman** - GUI API testing
- **k6** - Load testing
- **Artillery** - Load testing and monitoring

### Save Test Collection

Create a `tests/api/` directory with:
- `health_check.sh` - Quick health checks
- `test_suno.js` - Suno API tests
- `test_telegram.js` - Telegram bot tests
- `e2e_radio.js` - Full workflow test
- `monitor.js` - Continuous monitoring

## When to Use This Skill

- Testing API endpoints before deployment
- Debugging API integration issues
- Monitoring API health and performance
- Validating API responses
- Load testing endpoints
- Setting up automated API monitoring
- Troubleshooting failed API calls
- Checking if external APIs are operational
