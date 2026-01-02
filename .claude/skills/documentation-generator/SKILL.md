---
name: documentation-generator
description: Automatically generate documentation for code, APIs, databases, and workflows. Use when the user mentions documentation, README files, API docs, or needs to document code.
---

# Documentation Generator

## Purpose
Automatically generate comprehensive documentation for your projects, including README files, API documentation, database schemas, and workflow guides.

## Documentation Types

### 1. README Files
### 2. API Documentation
### 3. Database Schema Docs
### 4. Workflow Documentation
### 5. Code Comments
### 6. Setup Guides

## README Generator

### Project README Template

```markdown
# {Project Name}

{One-line description}

## Overview

{Detailed project description}

## Features

- Feature 1
- Feature 2
- Feature 3

## Tech Stack

- **Backend**: Node.js, n8n
- **Database**: MySQL 8.0
- **APIs**: Suno AI, OpenAI, Telegram
- **Infrastructure**: Cloudflare Tunnels, Ngrok

## Prerequisites

- Node.js 18+
- MySQL 8.0+
- n8n installed
- API keys for Suno, OpenAI, Telegram

## Installation

\`\`\`bash
# Clone repository
git clone https://github.com/yourusername/project.git

# Install dependencies
npm install

# Setup database
mysql -u root -p < migrations/setup.sql

# Configure environment
cp .env.example .env
# Edit .env with your API keys
\`\`\`

## Configuration

\`\`\`env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=radio_station

# APIs
SUNO_API_URL=https://your-suno-api.example.com
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=...
\`\`\`

## Usage

\`\`\`bash
# Start n8n
npm run start:n8n

# Run tests
npm test

# View logs
npm run logs
\`\`\`

## Project Structure

\`\`\`
project/
├── migrations/          # Database migrations
├── n8n_workflows/      # n8n workflow definitions
├── scripts/            # Utility scripts
├── tests/              # Test files
└── README.md           # This file
\`\`\`

## Documentation

- [API Documentation](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Workflow Guide](docs/WORKFLOWS.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Contributing

1. Fork the repository
2. Create feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit changes (\`git commit -m 'Add amazing feature'\`)
4. Push to branch (\`git push origin feature/amazing-feature\`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Contact

Your Name - your.email@example.com

Project Link: https://github.com/yourusername/project
```

### Auto-Generate README

```javascript
// generate_readme.js
const fs = require('fs');
const path = require('path');

function analyzeProject() {
  // Detect package.json
  const hasPackageJson = fs.existsSync('package.json');
  const packageData = hasPackageJson ? JSON.parse(fs.readFileSync('package.json')) : {};

  // Detect files
  const hasN8N = fs.existsSync('n8n_workflows') || fs.existsSync('n8n_complete_workflow.json');
  const hasMySQL = fs.existsSync('migrations') || fs.existsSync('setup_database.bat');
  const hasTests = fs.existsSync('tests');

  // Detect dependencies
  const dependencies = packageData.dependencies || {};
  const devDependencies = packageData.devDependencies || {};

  return {
    name: packageData.name || 'Project',
    description: packageData.description || 'Description needed',
    version: packageData.version || '1.0.0',
    hasN8N,
    hasMySQL,
    hasTests,
    dependencies: Object.keys(dependencies),
    devDependencies: Object.keys(devDependencies)
  };
}

function generateREADME(projectInfo) {
  let readme = `# ${projectInfo.name}\n\n`;
  readme += `${projectInfo.description}\n\n`;
  readme += `## Version\n\n${projectInfo.version}\n\n`;

  if (projectInfo.hasN8N) {
    readme += `## n8n Workflows\n\nThis project uses n8n for automation workflows.\n\n`;
  }

  if (projectInfo.hasMySQL) {
    readme += `## Database\n\nMySQL database with migration support.\n\n`;
  }

  if (projectInfo.dependencies.length > 0) {
    readme += `## Dependencies\n\n`;
    projectInfo.dependencies.forEach(dep => {
      readme += `- ${dep}\n`;
    });
    readme += `\n`;
  }

  return readme;
}

const projectInfo = analyzeProject();
const readme = generateREADME(projectInfo);
fs.writeFileSync('README.md', readme);
console.log('✓ README.md generated');
```

## API Documentation

### Generate from N8N Workflows

```javascript
// generate_api_docs.js
const fs = require('fs');

function documentWorkflow(workflowPath) {
  const workflow = JSON.parse(fs.readFileSync(workflowPath));

  let docs = `# ${workflow.name}\n\n`;

  // Find webhook nodes
  const webhooks = workflow.nodes.filter(n =>
    n.type === 'n8n-nodes-base.webhook'
  );

  if (webhooks.length > 0) {
    docs += `## Endpoints\n\n`;

    webhooks.forEach(webhook => {
      const method = webhook.parameters.httpMethod || 'POST';
      const path = webhook.parameters.path || '/';

      docs += `### ${method} ${path}\n\n`;
      docs += `**Description**: ${webhook.parameters.description || 'No description'}\n\n`;

      docs += `**Request Body**:\n\`\`\`json\n{\n  "field": "value"\n}\n\`\`\`\n\n`;
      docs += `**Response**:\n\`\`\`json\n{\n  "success": true\n}\n\`\`\`\n\n`;
    });
  }

  return docs;
}

// Generate docs for all workflows
const workflowDir = 'n8n_workflows';
let allDocs = '# API Documentation\n\n';

fs.readdirSync(workflowDir).forEach(file => {
  if (file.endsWith('.json')) {
    allDocs += documentWorkflow(path.join(workflowDir, file));
    allDocs += '\n---\n\n';
  }
});

fs.writeFileSync('docs/API.md', allDocs);
console.log('✓ API.md generated');
```

## Database Schema Documentation

### Generate Schema Docs

```javascript
// generate_schema_docs.js
const mysql = require('mysql2/promise');

async function generateSchemaDocs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hunter0hunter2207',
    database: 'radio_station'
  });

  let docs = `# Database Schema Documentation\n\n`;
  docs += `## radio_station Database\n\n`;

  // Get all tables
  const [tables] = await connection.execute(
    'SHOW TABLES'
  );

  for (const tableRow of tables) {
    const tableName = Object.values(tableRow)[0];

    docs += `### ${tableName}\n\n`;

    // Get columns
    const [columns] = await connection.execute(
      `DESCRIBE ${tableName}`
    );

    docs += `| Column | Type | Null | Key | Default |\n`;
    docs += `|--------|------|------|-----|----------|\n`;

    columns.forEach(col => {
      docs += `| ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'} |\n`;
    });

    docs += `\n`;

    // Get indexes
    const [indexes] = await connection.execute(
      `SHOW INDEX FROM ${tableName}`
    );

    if (indexes.length > 0) {
      docs += `**Indexes**:\n`;
      const uniqueIndexes = [...new Set(indexes.map(i => i.Key_name))];
      uniqueIndexes.forEach(idx => {
        docs += `- ${idx}\n`;
      });
      docs += `\n`;
    }

    // Get foreign keys
    const [fks] = await connection.execute(
      `SELECT
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'radio_station'
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [tableName]
    );

    if (fks.length > 0) {
      docs += `**Foreign Keys**:\n`;
      fks.forEach(fk => {
        docs += `- ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}\n`;
      });
      docs += `\n`;
    }

    docs += `---\n\n`;
  }

  await connection.end();

  fs.writeFileSync('docs/DATABASE.md', docs);
  console.log('✓ DATABASE.md generated');
}

generateSchemaDocs();
```

## Inline Code Documentation

### JSDoc Comments

```javascript
/**
 * Generates enhanced music prompt for Suno API
 *
 * @param {string} userPrompt - User's music request
 * @param {string} genre - Detected or specified genre
 * @param {Object} options - Additional options
 * @param {boolean} options.instrumental - Generate instrumental only
 * @param {number} options.duration - Target duration in seconds
 * @returns {Object} Enhanced prompt with style and lyrics
 * @throws {Error} If userPrompt is empty
 *
 * @example
 * const prompt = generateMusicPrompt('chill lo-fi beat', 'lo-fi');
 * // Returns: { style: '...', lyrics: '...' }
 */
function generateMusicPrompt(userPrompt, genre, options = {}) {
  if (!userPrompt) {
    throw new Error('User prompt required');
  }

  // Implementation...
}
```

### Generate JSDoc Documentation

```bash
# Install JSDoc
npm install --save-dev jsdoc

# Add script to package.json
{
  "scripts": {
    "docs": "jsdoc -c jsdoc.json"
  }
}

# Configure jsdoc.json
{
  "source": {
    "include": ["."],
    "includePattern": ".js$",
    "excludePattern": "(node_modules|tests)"
  },
  "opts": {
    "destination": "./docs/jsdoc",
    "recurse": true
  }
}

# Generate docs
npm run docs
```

## Workflow Documentation

### Document N8N Workflow

```markdown
# Radio Queue Processor Workflow

## Overview

Processes queued songs by generating music via Suno API and downloading MP3 files.

## Trigger

**Schedule**: Every 2 minutes

## Flow Diagram

\`\`\`
Schedule Trigger
  ↓
Get Next Queued Song (MySQL)
  ↓
Check If Song Found (IF)
  ↓
Update Status - Generating (MySQL)
  ↓
Load Suno V7 Prompt (Function)
  ↓
Generate Enhanced Prompt (OpenAI GPT-4o-mini)
  ↓
Suno API - Generate (HTTP Request)
  ↓
Save Suno Job ID (MySQL)
  ↓
Wait 2 Minutes
  ↓
Check Suno Status (HTTP Request)
  ↓
Check If Complete (IF)
  ↓ (Yes)                    ↓ (No)
Download MP3                Update Status - Failed
Write to Disk               Notify User - Failed
Update Status - Completed
Notify User - Success
\`\`\`

## Nodes

### Get Next Queued Song
- **Type**: MySQL
- **Operation**: Execute Query
- **Purpose**: Fetch highest priority queued song

### Generate Enhanced Prompt
- **Type**: OpenAI
- **Model**: gpt-4o-mini
- **Purpose**: Enhance user prompt with Suno V7 system instructions

### Suno API - Generate
- **Type**: HTTP Request
- **URL**: `https://your-suno-api.example.com/api/custom_generate`
- **Purpose**: Initiate music generation

## Error Handling

- If generation fails: Update status to 'failed', notify user
- If API timeout: Retry with exponential backoff
- If MySQL error: Log and continue to next run

## Outputs

- **MP3 File**: `C:\Users\Jesse\.gemini\antigravity\radio\songs\{queue_id}_{job_id}.mp3`
- **Database**: Updated queue status and user reputation
- **Notification**: Telegram message to user
```

## Auto-Documentation Script

```bash
#!/bin/bash
# generate_all_docs.sh

echo "=== Generating Documentation ==="

# Create docs directory
mkdir -p docs

# Generate README
node scripts/generate_readme.js

# Generate API docs
node scripts/generate_api_docs.js

# Generate schema docs
node scripts/generate_schema_docs.js

# Generate JSDoc
npm run docs 2>/dev/null

# Generate changelog from git
git log --pretty=format:"- %s (%an, %ar)" --date=short > docs/CHANGELOG.md

echo "✓ Documentation generated in docs/"
```

## Documentation Best Practices

1. **Keep it updated**: Auto-generate where possible
2. **Use examples**: Include code examples and use cases
3. **Visual aids**: Add diagrams, flowcharts, screenshots
4. **Version docs**: Document version-specific features
5. **Search-friendly**: Use clear headings and structure
6. **Link related docs**: Cross-reference related documentation
7. **Include troubleshooting**: Common issues and solutions

## When to Use This Skill

- Creating README files for projects
- Documenting API endpoints
- Generating database schema documentation
- Writing code comments
- Creating setup/installation guides
- Documenting workflows and processes
- Generating changelog from git history
- Creating user guides
