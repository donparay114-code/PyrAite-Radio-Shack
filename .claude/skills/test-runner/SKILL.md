---
name: test-runner
description: Run automated tests, generate coverage reports, and manage testing workflows. Use when the user mentions running tests, test coverage, unit tests, integration tests, or test automation.
---

# Test Runner

## Purpose
Automate test execution, track coverage, and ensure code quality through comprehensive testing strategies.

## Testing Stack

### Recommended Tools

**JavaScript/Node.js:**
- Jest - Unit and integration testing
- Mocha + Chai - Alternative testing framework
- Supertest - HTTP endpoint testing

**Python:**
- pytest - Comprehensive testing framework
- unittest - Built-in testing

**Database:**
- MySQL test database
- Test fixtures and seeders

## Test Directory Structure

```
C:\Users\Jesse\.gemini\antigravity\
├── tests\
│   ├── unit\
│   │   ├── suno_music_director.test.js
│   │   ├── prompt_generator.test.js
│   │   └── ...
│   ├── integration\
│   │   ├── radio_workflow.test.js
│   │   ├── database.test.js
│   │   └── ...
│   ├── e2e\
│   │   ├── radio_station_flow.test.js
│   │   └── ...
│   ├── fixtures\
│   │   ├── sample_users.json
│   │   ├── sample_songs.json
│   │   └── ...
│   └── setup\
│       ├── test_db.sql
│       └── teardown.sql
```

## Jest Configuration

### package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "**/*.js",
      "!**/node_modules/**",
      "!**/tests/**",
      "!coverage/**"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 70,
        "lines": 70,
        "statements": 70
      }
    }
  }
}
```

## Example Tests

### Unit Test - Suno Music Director

```javascript
// tests/unit/suno_music_director.test.js
const { generateMusicPrompt } = require('../../suno_music_director_v7');

describe('Suno Music Director', () => {
  describe('generateMusicPrompt', () => {
    test('generates valid prompt for lo-fi genre', () => {
      const userInput = 'Create a chill lo-fi beat';
      const result = generateMusicPrompt(userInput, 'lo-fi');

      expect(result).toHaveProperty('style');
      expect(result).toHaveProperty('lyrics');
      expect(result.style.length).toBeGreaterThan(45);
      expect(result.style.length).toBeLessThan(65);
    });

    test('handles empty user input', () => {
      expect(() => {
        generateMusicPrompt('', 'lo-fi');
      }).toThrow('User input required');
    });

    test('validates genre', () => {
      const result = generateMusicPrompt('test', 'unknown-genre');
      expect(result.genre).toBe('electronic'); // default fallback
    });
  });
});
```

### Integration Test - Database Operations

```javascript
// tests/integration/database.test.js
const mysql = require('mysql2/promise');

describe('Radio Station Database', () => {
  let connection;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Hunter0hunter2207',
      database: 'radio_station_test'
    });
  });

  afterAll(async () => {
    await connection.end();
  });

  beforeEach(async () => {
    // Clear test data
    await connection.execute('DELETE FROM radio_queue');
    await connection.execute('DELETE FROM radio_users');
  });

  test('creates user successfully', async () => {
    const [result] = await connection.execute(
      'INSERT INTO radio_users (user_id, username) VALUES (?, ?)',
      [12345, 'testuser']
    );

    expect(result.affectedRows).toBe(1);

    const [rows] = await connection.execute(
      'SELECT * FROM radio_users WHERE user_id = ?',
      [12345]
    );

    expect(rows[0].username).toBe('testuser');
    expect(rows[0].reputation_score).toBe(100); // default
  });

  test('adds song to queue with correct priority', async () => {
    // Create user first
    await connection.execute(
      'INSERT INTO radio_users (user_id, username, reputation_score) VALUES (?, ?, ?)',
      [12345, 'testuser', 150]
    );

    // Add song to queue
    await connection.execute(
      `INSERT INTO radio_queue (user_id, prompt, genre, priority_score)
       VALUES (?, ?, ?, ?)`,
      [12345, 'Test song', 'lo-fi', 175]
    );

    const [rows] = await connection.execute(
      'SELECT * FROM radio_queue WHERE user_id = ?',
      [12345]
    );

    expect(rows[0].priority_score).toBe(175);
  });
});
```

### E2E Test - Radio Station Flow

```javascript
// tests/e2e/radio_station_flow.test.js
const axios = require('axios');
const mysql = require('mysql2/promise');

describe('Radio Station E2E Flow', () => {
  let connection;

  beforeAll(async () => {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Hunter0hunter2207',
      database: 'radio_station_test'
    });
  });

  afterAll(async () => {
    await connection.end();
  });

  test('complete song request flow', async () => {
    // 1. User requests song via webhook
    const requestResponse = await axios.post(
      'http://localhost:5678/webhook/radio-request',
      {
        user_id: 99999,
        username: 'e2e_tester',
        prompt: 'Create epic orchestral music'
      }
    );

    expect(requestResponse.status).toBe(200);

    // 2. Check song added to queue
    const [queueRows] = await connection.execute(
      'SELECT * FROM radio_queue WHERE user_id = ?',
      [99999]
    );

    expect(queueRows.length).toBeGreaterThan(0);
    expect(queueRows[0].suno_status).toBe('queued');

    // 3. Simulate queue processor
    // (In real test, wait for workflow to process)

    // 4. Check reputation was updated
    const [userRows] = await connection.execute(
      'SELECT * FROM radio_users WHERE user_id = ?',
      [99999]
    );

    expect(userRows[0].total_requests).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for E2E
});
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npm test tests/unit/suno_music_director.test.js

# Run tests matching pattern
npm test -- --testNamePattern="generates valid prompt"

# Update snapshots
npm test -- -u
```

### Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View report
start coverage/index.html  # Windows
open coverage/index.html   # Mac
xdg-open coverage/index.html  # Linux
```

### Test Output

```
PASS  tests/unit/suno_music_director.test.js
  Suno Music Director
    generateMusicPrompt
      ✓ generates valid prompt for lo-fi genre (5ms)
      ✓ handles empty user input (2ms)
      ✓ validates genre (1ms)

PASS  tests/integration/database.test.js
  Radio Station Database
    ✓ creates user successfully (45ms)
    ✓ adds song to queue with correct priority (32ms)

Test Suites: 2 passed, 2 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        2.456s
Coverage:    85.2%
```

## Database Test Setup

### Create Test Database

```sql
-- Create test database
CREATE DATABASE IF NOT EXISTS radio_station_test;

-- Copy structure from production
CREATE TABLE radio_station_test.radio_users LIKE radio_station.radio_users;
CREATE TABLE radio_station_test.radio_queue LIKE radio_station.radio_queue;
-- ... copy other tables

-- Grant permissions
GRANT ALL PRIVILEGES ON radio_station_test.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Test Fixtures

```javascript
// tests/fixtures/sample_users.json
[
  {
    "user_id": 11111,
    "username": "test_user_1",
    "reputation_score": 100,
    "is_premium": false
  },
  {
    "user_id": 22222,
    "username": "test_user_2",
    "reputation_score": 250,
    "is_premium": true
  }
]
```

```javascript
// tests/setup/load_fixtures.js
const mysql = require('mysql2/promise');
const fs = require('fs');

async function loadFixtures() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hunter0hunter2207',
    database: 'radio_station_test'
  });

  const users = JSON.parse(fs.readFileSync('tests/fixtures/sample_users.json'));

  for (const user of users) {
    await connection.execute(
      'INSERT INTO radio_users (user_id, username, reputation_score, is_premium) VALUES (?, ?, ?, ?)',
      [user.user_id, user.username, user.reputation_score, user.is_premium]
    );
  }

  await connection.end();
}

module.exports = { loadFixtures };
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: Hunter0hunter2207
          MYSQL_DATABASE: radio_station_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test one thing**: Each test should verify one behavior
3. **Descriptive names**: Test names should explain what they test
4. **Independent tests**: Tests shouldn't depend on each other
5. **Fast execution**: Keep tests fast (< 100ms for unit tests)
6. **Use fixtures**: Reusable test data
7. **Clean up**: Always clean test data after tests
8. **Mock external APIs**: Don't call real APIs in tests

## Mocking External APIs

```javascript
// Mock Suno API
jest.mock('axios');
const axios = require('axios');

test('handles Suno API failure gracefully', async () => {
  axios.post.mockRejectedValue(new Error('API Error'));

  await expect(callSunoAPI('test prompt')).rejects.toThrow('API Error');
});

// Mock successful response
test('processes Suno response correctly', async () => {
  axios.post.mockResolvedValue({
    data: {
      data: [{
        id: 'job_123',
        status: 'generating'
      }]
    }
  });

  const result = await callSunoAPI('test prompt');
  expect(result.jobId).toBe('job_123');
});
```

## Performance Testing

```javascript
// tests/performance/queue_processing.test.js
describe('Queue Processing Performance', () => {
  test('processes 100 songs in under 5 seconds', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await processQueueItem(mockQueueItem);
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });
});
```

## Test Reports

### Generate HTML Report

```bash
# Install reporter
npm install --save-dev jest-html-reporter

# Add to package.json
{
  "jest": {
    "reporters": [
      "default",
      ["jest-html-reporter", {
        "pageTitle": "Radio Station Test Report",
        "outputPath": "test-report.html"
      }]
    ]
  }
}
```

## When to Use This Skill

- Running automated tests
- Checking test coverage
- Writing new unit tests
- Creating integration tests
- Setting up test databases
- Mocking external APIs
- CI/CD test integration
- Debugging failing tests
- Performance testing
