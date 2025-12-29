---
name: deployment-helper
description: Deploy applications to Railway, Render, VPS, and manage deployments with health checks and rollback capabilities. Use when the user mentions deployment, Railway, Render, production, or deployment issues.
---

# Deployment Helper

## Purpose
Streamline deployment processes to various platforms including Railway, Render, VPS, and manage environment variables, health checks, and rollback procedures.

## Deployment Platforms

### Railway
- Suno API deployment
- Database hosting
- Auto-deploy from GitHub

### Render
- Alternative to Railway
- Web services and databases

### DigitalOcean / VPS
- Icecast + Liquidsoap (radio streaming)
- Full control over infrastructure

### Local Development
- Testing before deployment

## Railway Deployment

### Deploy Suno API

```bash
#!/bin/bash
# deploy_suno_railway.sh

echo "=== Deploying Suno API to Railway ==="

# Install Railway CLI if needed
if ! command -v railway &> /dev/null; then
  echo "Installing Railway CLI..."
  npm install -g @railway/cli
fi

# Login to Railway
railway login

# Link to project
railway link

# Set environment variables
railway variables set SUNO_API_KEY="your_api_key"
railway variables set PORT="8080"

# Deploy
railway up

# Get deployment URL
DEPLOY_URL=$(railway status --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

echo "✓ Deployment complete!"
echo "URL: $DEPLOY_URL"

# Update n8n workflows with new URL
echo ""
echo "Next steps:"
echo "1. Update Suno API URL in n8n workflows"
echo "2. Test endpoints: $DEPLOY_URL/health"
echo "3. Monitor logs: railway logs"
```

### Railway Environment Variables

```bash
# Set all variables at once
railway variables set \
  OPENAI_API_KEY="sk-..." \
  MYSQL_HOST="containers-us-west-123.railway.app" \
  MYSQL_PORT="3306" \
  MYSQL_USER="root" \
  MYSQL_PASSWORD="..." \
  MYSQL_DATABASE="radio_station" \
  NODE_ENV="production"
```

### Railway.json Configuration

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Render Deployment

### render.yaml Configuration

```yaml
# render.yaml
services:
  - type: web
    name: suno-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: SUNO_API_KEY
        sync: false  # Use Render dashboard

databases:
  - name: radio-station-db
    databaseName: radio_station
    user: radio_user
```

### Deploy to Render

```bash
#!/bin/bash
# deploy_render.sh

# Install Render CLI
if ! command -v render &> /dev/null; then
  npm install -g render-cli
fi

# Login
render login

# Create service from render.yaml
render services create

# Deploy
render deploy

echo "✓ Deployed to Render"
echo "Check status: https://dashboard.render.com"
```

## VPS Deployment (DigitalOcean)

### Setup Script for VPS

```bash
#!/bin/bash
# setup_vps.sh

echo "=== Setting up VPS for Radio Station ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install n8n
npm install -g n8n

# Install Icecast
sudo apt install -y icecast2

# Install Liquidsoap
sudo apt install -y liquidsoap

# Install FFmpeg
sudo apt install -y ffmpeg

# Create app directory
sudo mkdir -p /var/www/radio-station
sudo chown $USER:$USER /var/www/radio-station

# Clone repository
git clone https://github.com/yourusername/radio-station.git /var/www/radio-station

# Install dependencies
cd /var/www/radio-station
npm install

# Setup systemd service for n8n
sudo cat > /etc/systemd/system/n8n.service << 'EOF'
[Unit]
Description=n8n
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/radio-station
ExecStart=/usr/bin/n8n start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable n8n
sudo systemctl start n8n

echo "✓ VPS setup complete"
echo "n8n running on http://your-vps-ip:5678"
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/radio-station

server {
    listen 80;
    server_name your-domain.com;

    # n8n
    location /n8n/ {
        proxy_pass http://localhost:5678/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Icecast stream
    location /stream {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/radio-station /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Environment Management

### Production .env

```bash
# production.env
NODE_ENV=production
PORT=8080

# Database (Railway/Render hosted)
DB_HOST=containers-us-west-123.railway.app
DB_PORT=3306
DB_USER=root
DB_PASSWORD=xxx
DB_NAME=radio_station

# APIs
SUNO_API_URL=https://suno-api.railway.app
OPENAI_API_KEY=sk-prod-xxx
TELEGRAM_BOT_TOKEN=xxx

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Sync Environment Variables

```javascript
// sync_env.js
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function syncToRailway() {
  const envContent = fs.readFileSync('.env.production', 'utf8');
  const envVars = envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('='));

  for (const [key, value] of envVars) {
    console.log(`Setting ${key}...`);
    await execPromise(`railway variables set ${key}="${value}"`);
  }

  console.log('✓ Environment variables synced to Railway');
}

syncToRailway();
```

## Health Checks

### Health Check Endpoint

```javascript
// health.js
const mysql = require('mysql2/promise');

async function healthCheck(req, res) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      disk: false,
      memory: false
    }
  };

  // Check database
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    await connection.execute('SELECT 1');
    await connection.end();
    health.checks.database = true;
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = false;
  }

  // Check disk space
  const diskUsage = require('disk-usage');
  const disk = await diskUsage.check('/');
  health.checks.disk = disk.available > 1024 * 1024 * 1024; // > 1GB free

  // Check memory
  const used = process.memoryUsage();
  health.checks.memory = used.heapUsed < 500 * 1024 * 1024; // < 500MB

  res.status(health.status === 'ok' ? 200 : 503).json(health);
}

module.exports = { healthCheck };
```

### Monitor Deployment Health

```bash
#!/bin/bash
# monitor_deployment.sh

URL="$1"

if [ -z "$URL" ]; then
  echo "Usage: ./monitor_deployment.sh https://your-app.railway.app"
  exit 1
fi

echo "Monitoring deployment: $URL"

while true; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)

  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "$(date): ✓ Healthy (HTTP $HTTP_CODE)"
  else
    echo "$(date): ✗ Unhealthy (HTTP $HTTP_CODE)"
    # Send alert
  fi

  sleep 60  # Check every minute
done
```

## Deployment Checklist

### Pre-Deployment

```markdown
# Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Database migrations prepared
- [ ] Environment variables documented
- [ ] Secrets rotated if needed
- [ ] Dependencies updated
- [ ] Build succeeds locally
- [ ] Performance tested
- [ ] Security scan completed
- [ ] Rollback plan prepared
- [ ] Team notified of deployment
```

### Deploy Script

```bash
#!/bin/bash
# deploy.sh

set -e  # Exit on error

echo "=== Pre-Deployment Checks ==="

# Run tests
echo "[1/5] Running tests..."
npm test
echo "✓ Tests passed"

# Check environment
echo "[2/5] Checking environment..."
if [ ! -f .env.production ]; then
  echo "✗ .env.production not found"
  exit 1
fi
echo "✓ Environment configured"

# Build
echo "[3/5] Building..."
npm run build
echo "✓ Build successful"

# Backup database
echo "[4/5] Backing up database..."
./scripts/backup_database.sh
echo "✓ Database backed up"

# Deploy
echo "[5/5] Deploying to Railway..."
railway up

# Wait for deployment
echo "Waiting for deployment to complete..."
sleep 30

# Health check
DEPLOY_URL=$(railway status --json | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
HEALTH_STATUS=$(curl -s "$DEPLOY_URL/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "ok" ]; then
  echo "✓ Deployment successful and healthy"
  echo "URL: $DEPLOY_URL"
else
  echo "✗ Deployment unhealthy, consider rollback"
  exit 1
fi
```

## Rollback Procedures

### Rollback to Previous Deployment

```bash
#!/bin/bash
# rollback.sh

echo "=== Rolling Back Deployment ==="

# Railway rollback
if command -v railway &> /dev/null; then
  echo "Rolling back Railway deployment..."
  railway rollback
fi

# Restore database from backup
read -p "Restore database from backup? (y/N): " confirm
if [ "$confirm" = "y" ]; then
  echo "Available backups:"
  ls -1 backups/*.sql | tail -5

  read -p "Enter backup filename: " backup_file
  mysql -u root -p radio_station < "backups/$backup_file"
  echo "✓ Database restored"
fi

echo "✓ Rollback complete"
```

## CI/CD Pipeline

### GitHub Actions Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          npm install -g @railway/cli
          railway up --service suno-api

      - name: Health Check
        run: |
          sleep 30
          curl -f https://suno-api.railway.app/health || exit 1
```

## Monitoring Post-Deployment

### Check Logs

```bash
# Railway logs
railway logs --tail 100

# Render logs
render logs --tail 100

# VPS logs
ssh user@vps "tail -100 /var/log/n8n/app.log"
```

### Monitor Metrics

```javascript
// metrics.js
const mysql = require('mysql2/promise');

setInterval(async () => {
  const connection = await mysql.createConnection({...});

  // Check queue depth
  const [queue] = await connection.execute(
    'SELECT COUNT(*) as depth FROM radio_queue WHERE suno_status = "queued"'
  );

  // Check error rate
  const [errors] = await connection.execute(`
    SELECT COUNT(*) as errors
    FROM n8n.execution_entity
    WHERE success = FALSE
      AND finished_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
  `);

  console.log('Metrics:', {
    queueDepth: queue[0].depth,
    recentErrors: errors[0].errors,
    timestamp: new Date()
  });

  await connection.end();
}, 60000);  // Every minute
```

## When to Use This Skill

- Deploying to Railway or Render
- Setting up VPS infrastructure
- Managing environment variables
- Creating deployment scripts
- Setting up health checks
- Implementing rollback procedures
- CI/CD pipeline configuration
- Post-deployment monitoring
- Troubleshooting deployment issues
