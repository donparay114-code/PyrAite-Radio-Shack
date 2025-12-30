# Suno API Integration Manager

**Purpose**: Manage complete Suno API integration for radio station including generation workflow, webhook handling, polling fallback, error recovery, and S3 upload orchestration.

**When to invoke**: Suno API setup, music generation workflow issues, webhook debugging, API cost optimization, generation failures, audio file management.

## API Provider Selection

### Recommended: SunoAPI.org
- **Pricing**: $0.01-0.02 per generation
- **Uptime**: 99.9%
- **Webhook support**: Yes
- **Polling**: Available as fallback
- **Documentation**: [sunoapi.org/docs](https://sunoapi.org/docs)

### Alternative: MusicAPI.ai
- **Pricing**: Similar to SunoAPI.org
- **Multi-model**: Supports Suno, Udio, others
- **Use case**: If SunoAPI.org unavailable

## Complete Generation Workflow

### Step 1: Submit Generation Request
```javascript
// n8n HTTP Request Node
const response = await $this.helpers.httpRequest({
  method: 'POST',
  url: 'https://api.sunoapi.org/api/generate',
  headers: {
    'Authorization': `Bearer ${credentials.sunoApiKey}`,
    'Content-Type': 'application/json'
  },
  body: {
    prompt: $input.item.json.prompt,
    make_instrumental: false,
    mv: 'chirp-v4-5',  // Latest Suno model
    wait_audio: false,  // Don't block, use callback
    callback_url: `${process.env.N8N_WEBHOOK_URL}/suno-callback`
  },
  timeout: 10000
});

return [{
  json: {
    taskId: response.task_id,
    clipIds: response.clip_ids,
    requestId: $input.item.json.requestId,
    status: 'submitted'
  }
}];
```

### Step 2: Update Database
```sql
UPDATE song_requests
SET
  generation_status = 'generating',
  suno_task_id = $taskId,
  suno_clip_ids = $clipIds::jsonb,
  generation_started_at = NOW()
WHERE id = $requestId;
```

### Step 3: Webhook Callback Handler
```javascript
// n8n Webhook Trigger Node
// Endpoint: /webhook/suno-callback

const payload = $input.item.json;

// Verify webhook signature (if provided by Suno API)
const isValid = verifyWebhookSignature(payload, req.headers['x-suno-signature']);
if (!isValid) {
  return [{ json: { error: 'Invalid signature' }, statusCode: 401 }];
}

// Extract audio URL and metadata
const audioUrl = payload.clips[0].audio_url;
const duration = payload.clips[0].metadata.duration;
const taskId = payload.task_id;

// Find corresponding request
const request = await db.query(
  'SELECT id, channel_id, user_id FROM song_requests WHERE suno_task_id = ?',
  [taskId]
);

if (!request) {
  return [{ json: { error: 'Request not found' }, statusCode: 404 }];
}

// Download audio from Suno
const audioBuffer = await $this.helpers.httpRequest({
  method: 'GET',
  url: audioUrl,
  encoding: 'arraybuffer',
  returnFullResponse: true
});

// Upload to S3
const s3Key = `audio/${request.channel_id}/${Date.now()}-${request.id}.mp3`;
await uploadToS3(audioBuffer.body, s3Key);

// Update database
await db.query(`
  UPDATE song_requests
  SET
    generation_status = 'completed',
    queue_status = 'queued',
    audio_url = ?,
    audio_duration_seconds = ?,
    audio_metadata = ?::jsonb,
    generation_completed_at = NOW()
  WHERE id = ?
`, [s3Key, duration, JSON.stringify(payload.clips[0].metadata), request.id]);

// Calculate initial priority
await db.query(`
  UPDATE song_requests sr
  SET calculated_priority = calculate_priority_v2(
    sr.base_priority,
    u.reputation_score,
    sr.upvotes,
    u.is_premium,
    sr.created_at,
    (SELECT COUNT(*) FROM song_requests sr2
     WHERE sr2.user_id = sr.user_id AND DATE(sr2.created_at) = CURRENT_DATE),
    (SELECT COUNT(*) FROM song_requests sr3
     WHERE sr3.user_id = sr.user_id AND sr3.queue_status IN ('played', 'playing'))
  )
  FROM users u
  WHERE sr.user_id = u.id AND sr.id = ?
`, [request.id]);

// Notify user via platform (Telegram/WhatsApp)
await notifyUser(request.user_id, {
  message: '🎵 Your track is ready and queued!',
  trackTitle: payload.clips[0].title
});

return [{ json: { status: 'success' }, statusCode: 200 }];
```

### Step 4: Polling Fallback (if webhook fails)
```javascript
// n8n Schedule Trigger: Every 15 seconds
// Check for requests in 'generating' status

const pendingRequests = await db.query(`
  SELECT id, suno_task_id
  FROM song_requests
  WHERE generation_status = 'generating'
    AND generation_started_at > NOW() - INTERVAL '10 minutes'
    AND generation_started_at < NOW() - INTERVAL '15 seconds'
  ORDER BY generation_started_at ASC
  LIMIT 10
`);

for (const request of pendingRequests.rows) {
  // Poll Suno API for status
  const statusCheck = await $this.helpers.httpRequest({
    method: 'GET',
    url: `https://api.sunoapi.org/api/get?ids=${request.suno_task_id}`,
    headers: { 'Authorization': `Bearer ${credentials.sunoApiKey}` }
  });

  if (statusCheck[0].status === 'complete') {
    // Process same as webhook (extract audio, upload to S3, update DB)
    await processCompletedGeneration(statusCheck[0], request.id);
  } else if (statusCheck[0].status === 'error') {
    // Mark as failed
    await db.query(`
      UPDATE song_requests
      SET generation_status = 'failed',
          moderation_reason = ?
      WHERE id = ?
    `, [statusCheck[0].error_message, request.id]);

    // Notify user
    await notifyUser(request.user_id, {
      message: '❌ Sorry, your track generation failed. Please try again.',
      error: statusCheck[0].error_message
    });
  }
}
```

## Error Handling

### Generation Timeout
```javascript
// n8n Schedule Trigger: Every 1 minute
// Mark stuck requests as failed

await db.query(`
  UPDATE song_requests
  SET generation_status = 'failed',
      moderation_reason = 'Generation timeout after 10 minutes'
  WHERE generation_status = 'generating'
    AND generation_started_at < NOW() - INTERVAL '10 minutes'
`);
```

### Retry Logic
```javascript
// n8n workflow: Retry failed generations

const failedRequests = await db.query(`
  SELECT id, prompt, user_id
  FROM song_requests
  WHERE generation_status = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour'
    AND suno_task_id IS NOT NULL
  LIMIT 5
`);

for (const request of failedRequests.rows) {
  try {
    // Retry generation with exponential backoff
    const response = await submitSunoGeneration(request.prompt);

    await db.query(`
      UPDATE song_requests
      SET generation_status = 'generating',
          suno_task_id = ?,
          generation_started_at = NOW()
      WHERE id = ?
    `, [response.task_id, request.id]);
  } catch (error) {
    // Don't retry more than 3 times
    await db.query(`
      UPDATE song_requests
      SET generation_status = 'failed',
          moderation_reason = 'Max retries exceeded'
      WHERE id = ?
    `, [request.id]);
  }
}
```

## Cost Optimization

### Caching Similar Prompts
```javascript
// Before calling Suno API, check cache
const promptHash = crypto.createHash('md5').update(prompt.toLowerCase().trim()).digest('hex');

const cached = await db.query(`
  SELECT audio_url, suno_clip_ids
  FROM song_requests
  WHERE MD5(LOWER(TRIM(prompt))) = ?
    AND generation_status = 'completed'
    AND created_at > NOW() - INTERVAL '30 days'
  LIMIT 1
`, [promptHash]);

if (cached.rows.length > 0) {
  // Reuse existing audio
  await db.query(`
    UPDATE song_requests
    SET audio_url = ?,
        generation_status = 'completed',
        queue_status = 'queued',
        audio_metadata = jsonb_set(
          audio_metadata,
          '{reused}',
          'true'
        )
    WHERE id = ?
  `, [cached.rows[0].audio_url, requestId]);

  // Estimated savings: 15-20% of Suno costs
  return { cached: true };
}
```

### Batch Processing (if API supports)
```javascript
// Batch similar requests together
const batchSize = 5;
const pendingRequests = await db.query(`
  SELECT id, prompt, detected_genre
  FROM song_requests
  WHERE generation_status = 'pending'
  ORDER BY created_at ASC
  LIMIT ${batchSize}
`);

if (pendingRequests.rows.length >= batchSize) {
  // Submit as batch (hypothetical - check if Suno supports)
  const batchResponse = await $this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.sunoapi.org/api/generate_batch',
    body: {
      requests: pendingRequests.rows.map(r => ({ prompt: r.prompt })),
      callback_url: process.env.BATCH_CALLBACK_URL
    }
  });

  // Update all requests with task IDs
  for (let i = 0; i < batchResponse.tasks.length; i++) {
    await db.query(`
      UPDATE song_requests
      SET suno_task_id = ?, generation_status = 'generating'
      WHERE id = ?
    `, [batchResponse.tasks[i].id, pendingRequests.rows[i].id]);
  }
}
```

## S3 Upload Integration

```javascript
async function uploadToS3(audioBuffer, s3Key) {
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1'
  });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    ACL: 'private',
    Metadata: {
      'uploaded-by': 'suno-integration',
      'upload-timestamp': Date.now().toString()
    }
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}
```

## Monitoring & Alerts

### Daily Cost Tracking
```javascript
// n8n Schedule Trigger: Daily at midnight
const dailyStats = await db.query(`
  SELECT
    COUNT(*) AS total_generations,
    COUNT(*) * 0.015 AS estimated_cost,
    COUNT(*) FILTER (WHERE generation_status = 'completed') AS successful,
    COUNT(*) FILTER (WHERE generation_status = 'failed') AS failed
  FROM song_requests
  WHERE DATE(created_at) = CURRENT_DATE
`);

if (dailyStats.rows[0].estimated_cost > 20) {
  await sendAlert({
    severity: 'WARNING',
    message: `Daily Suno cost exceeded $20: $${dailyStats.rows[0].estimated_cost}`,
    stats: dailyStats.rows[0]
  });
}
```

### Generation Success Rate
```javascript
const successRate = await db.query(`
  SELECT
    (COUNT(*) FILTER (WHERE generation_status = 'completed')::float /
     NULLIF(COUNT(*), 0) * 100) AS success_rate
  FROM song_requests
  WHERE created_at > NOW() - INTERVAL '24 hours'
`);

if (successRate.rows[0].success_rate < 90) {
  await sendAlert({
    severity: 'CRITICAL',
    message: `Suno generation success rate below 90%: ${successRate.rows[0].success_rate.toFixed(2)}%`
  });
}
```

## Best Practices

1. **Always use webhooks as primary method** (polling as fallback)
2. **Implement exponential backoff** for retries (2s, 4s, 8s, 16s)
3. **Cache prompts for 30 days** to reduce API costs by 15-20%
4. **Set timeout at 10 minutes** - mark as failed after that
5. **Monitor success rate** - alert if <90%
6. **Upload to S3 immediately** after generation completes
7. **Store full metadata** for debugging and analytics
8. **Implement circuit breaker** if daily budget exceeded

## Troubleshooting

### Issue: Webhook not receiving callbacks
1. Check n8n webhook URL is publicly accessible
2. Verify SSL certificate is valid
3. Test with ngrok for local development
4. Enable polling fallback as backup

### Issue: High failure rate
1. Check Suno API status page
2. Verify API key is valid and has credits
3. Review failed request error messages
4. Switch to alternative provider if needed

### Issue: Slow generation times
1. Check Suno API response times (should be <60s)
2. Monitor queue depth on Suno side
3. Consider upgrading to priority queue (if available)

Use this agent for all Suno API integration and music generation workflows!
