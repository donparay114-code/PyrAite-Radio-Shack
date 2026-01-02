---
name: api-integration-testing
description: Test APIs, create test suites, validate integrations with n8n and external services. Use for API testing, integration testing, and validation of workflows.
---

# API Integration Testing

## Instructions

1. Create test files for API routes
2. Mock external service calls (Suno, OpenAI, Stripe)
3. Test error scenarios and edge cases
4. Validate n8n webhook integrations
5. Performance test critical endpoints
6. Document test coverage
7. Use proper test data cleanup

## Testing frameworks

- **Jest** - Unit and integration tests
- **Supertest** - HTTP assertions for Express/Next.js
- **Vitest** - Fast alternative to Jest
- **Mock Service Worker (MSW)** - API mocking
- **Postman/Insomnia** - Manual API testing

## For AI Radio Station APIs

### API Routes to test

**Next.js API routes:**
- `GET /api/nowplaying` - Current song
- `GET /api/queue` - Upcoming songs
- `POST /api/request` - Submit song request
- `POST /api/upvote/:songId` - Upvote song
- `GET /api/leaderboard` - Top users by reputation
- `GET /api/history` - Recently played songs
- `POST /api/create-subscription` - Stripe checkout

**n8n webhooks:**
- Telegram bot webhook
- Suno API callback
- OpenAI moderation response

### Example test suite

```javascript
// __tests__/api/nowplaying.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/nowplaying/route';

describe('/api/nowplaying', () => {
  it('should return current playing song', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toHaveProperty('song_title');
    expect(res._getJSONData()).toHaveProperty('username');
  });

  it('should handle no song playing', async () => {
    // Mock empty queue
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData().song_title).toBeNull();
  });
});
```

### Testing database operations

```javascript
// __tests__/db/reputation.test.ts
import { calculatePriority } from '@/lib/reputation';

describe('Reputation System', () => {
  it('should calculate priority score correctly', () => {
    const reputation = 100;
    const upvotes = 5;
    const isPremium = false;

    const priority = calculatePriority(reputation, upvotes, isPremium);

    // 100 + (100 * 0.5) + (5 * 10) + 0 = 200
    expect(priority).toBe(200);
  });

  it('should add premium bonus', () => {
    const priority = calculatePriority(100, 0, true);

    // 100 + (100 * 0.5) + 0 + 50 = 200
    expect(priority).toBe(200);
  });
});
```

### Mocking external APIs

```javascript
// __tests__/api/suno.test.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('https://your-suno-api.example.com/api/custom_generate', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [{
          id: 'mock-suno-id-123',
          status: 'generating'
        }]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Suno API Integration', () => {
  it('should generate song', async () => {
    const result = await generateSong('Create a chill lo-fi beat');

    expect(result.id).toBe('mock-suno-id-123');
    expect(result.status).toBe('generating');
  });
});
```

### Testing n8n workflows

```javascript
// Manual testing with curl
curl -X POST http://localhost:5678/webhook/telegram-radio-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "from": {
        "id": 123456789,
        "username": "test_user"
      },
      "text": "Create a chill lo-fi beat",
      "chat": {
        "id": 123456789
      },
      "message_id": 1
    }
  }'
```

### Performance testing

```javascript
// __tests__/performance/queue.test.ts
describe('Queue Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const startTime = Date.now();

    const promises = Array.from({ length: 100 }, () =>
      fetch('/api/queue')
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete in 5 seconds
  });
});
```

### Test data cleanup

```javascript
// __tests__/setup.ts
import db from '@/lib/db';

afterEach(async () => {
  // Clean up test data
  await db.query('DELETE FROM radio_users WHERE username LIKE "test_%"');
  await db.query('DELETE FROM song_requests WHERE user_id IN (SELECT user_id FROM radio_users WHERE username LIKE "test_%")');
});

afterAll(async () => {
  await db.end();
});
```

## Running tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- nowplaying.test.ts

# Watch mode for development
npm test -- --watch
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

## Test coverage goals

- **API routes:** 80%+ coverage
- **Database operations:** 90%+ coverage
- **Business logic (reputation, queue):** 95%+ coverage
- **UI components:** 70%+ coverage
