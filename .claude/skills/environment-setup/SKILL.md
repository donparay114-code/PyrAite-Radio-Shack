---
name: environment-setup
description: Set up and manage development environments including MySQL, n8n, tunnels, and dependencies. Use when the user mentions environment setup, installation, configuration, or starting services.
---

# Environment Setup

## Purpose
Automate the setup and configuration of development environments for your projects, including all dependencies, services, and configurations.

## Your Tech Stack

### Core Services
- **MySQL 8.0** - Database server
- **n8n** - Workflow automation
- **Node.js** - Runtime environment
- **Cloudflare Tunnels / Ngrok** - Public access tunnels

### APIs
- Suno AI - Music generation
- OpenAI - Chat and moderation
- Telegram Bot - User interface

## Quick Start Script

### Complete Setup (Windows)

```batch
@echo off
:: setup_environment.bat

echo ===================================
echo Environment Setup for AI Radio Station
echo ===================================
echo.

:: Check Node.js
echo [1/7] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org/
    exit /b 1
)
echo OK: Node.js installed

:: Check MySQL
echo [2/7] Checking MySQL...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MySQL not found. Install MySQL 8.0
    exit /b 1
)
echo OK: MySQL installed

:: Install Node dependencies
echo [3/7] Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    exit /b 1
)
echo OK: Dependencies installed

:: Check MySQL connection
echo [4/7] Testing MySQL connection...
mysql -u root -pHunter0hunter2207 -e "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to MySQL
    echo Please check credentials in .env file
    exit /b 1
)
echo OK: MySQL connected

:: Setup databases
echo [5/7] Setting up databases...
mysql -u root -pHunter0hunter2207 < migrations/00_initial_setup.sql
echo OK: Databases created

:: Check n8n
echo [6/7] Checking n8n...
where n8n >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing n8n globally...
    npm install -g n8n
)
echo OK: n8n ready

:: Create directories
echo [7/7] Creating directories...
if not exist "C:\Users\Jesse\.gemini\antigravity\radio\songs" mkdir "C:\Users\Jesse\.gemini\antigravity\radio\songs"
if not exist "C:\Users\Jesse\.gemini\antigravity\radio\temp" mkdir "C:\Users\Jesse\.gemini\antigravity\radio\temp"
if not exist "C:\Users\Jesse\.gemini\antigravity\radio\broadcast" mkdir "C:\Users\Jesse\.gemini\antigravity\radio\broadcast"
if not exist "C:\Users\Jesse\.gemini\antigravity\backups" mkdir "C:\Users\Jesse\.gemini\antigravity\backups"
echo OK: Directories created

echo.
echo ===================================
echo Setup Complete!
echo ===================================
echo.
echo Next steps:
echo 1. Configure .env file with your API keys
echo 2. Run: start_n8n.bat
echo 3. Import workflows from n8n_workflows/
echo.
pause
```

## Environment Variables

### .env Template

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Hunter0hunter2207
DB_NAME_RADIO=radio_station

# n8n Configuration
N8N_PORT=5678
N8N_HOST=localhost
N8N_PROTOCOL=http

# Suno API
SUNO_API_URL=https://your-suno-api.example.com
SUNO_API_KEY=your_api_key_here

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Tunneling (choose one)
CLOUDFLARE_TUNNEL_ID=your_tunnel_id
NGROK_AUTH_TOKEN=your_ngrok_token

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Create .env from Template

```bash
#!/bin/bash
# create_env.sh

if [ -f .env ]; then
  echo "WARNING: .env file already exists"
  read -p "Overwrite? (y/N): " confirm
  if [ "$confirm" != "y" ]; then
    exit 0
  fi
fi

cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=CHANGE_ME
DB_NAME_RADIO=radio_station

# n8n Configuration
N8N_PORT=5678
N8N_HOST=localhost

# Suno API
SUNO_API_URL=CHANGE_ME

# OpenAI API
OPENAI_API_KEY=CHANGE_ME

# Telegram Bot
TELEGRAM_BOT_TOKEN=CHANGE_ME
EOF

echo "✓ .env file created"
echo "⚠ Please edit .env and replace CHANGE_ME values"
```

## Service Startup Scripts

### Start All Services

```batch
@echo off
:: start_all_services.bat

echo Starting all services...
echo.

:: Start MySQL (if not running)
echo [1/3] Starting MySQL...
net start MySQL80
if %errorlevel% equ 0 (
    echo OK: MySQL started
) else (
    echo MySQL already running or failed to start
)

:: Start n8n
echo [2/3] Starting n8n...
start "n8n" cmd /k "n8n start"
timeout /t 5 /nobreak >nul
echo OK: n8n started on http://localhost:5678

:: Start tunnel (Cloudflare or Ngrok)
echo [3/3] Starting tunnel...
start "Tunnel" cmd /k "start_ngrok_n8n.bat"
timeout /t 3 /nobreak >nul
echo OK: Tunnel started

echo.
echo ===================================
echo All services started!
echo ===================================
echo.
echo Services:
echo - MySQL: localhost:3306
echo - n8n: http://localhost:5678
echo - Tunnel: Check tunnel window
echo.
pause
```

### Stop All Services

```batch
@echo off
:: stop_all_services.bat

echo Stopping all services...
echo.

:: Stop n8n
taskkill /FI "WINDOWTITLE eq n8n*" /F 2>nul
echo OK: n8n stopped

:: Stop tunnel
taskkill /FI "WINDOWTITLE eq Tunnel*" /F 2>nul
taskkill /IM ngrok.exe /F 2>nul
taskkill /IM cloudflared.exe /F 2>nul
echo OK: Tunnel stopped

:: Optionally stop MySQL
:: net stop MySQL80

echo.
echo Services stopped
pause
```

## Database Initialization

### Initialize All Databases

```sql
-- init_databases.sql

-- Create databases
CREATE DATABASE IF NOT EXISTS radio_station
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create test databases
CREATE DATABASE IF NOT EXISTS radio_station_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Grant privileges
GRANT ALL PRIVILEGES ON radio_station.* TO 'root'@'localhost';
GRANT ALL PRIVILEGES ON radio_station_test.* TO 'root'@'localhost';

FLUSH PRIVILEGES;

SELECT 'Databases initialized successfully' AS status;
```

```bash
# Run initialization
mysql -u root -p < init_databases.sql
```

## Dependency Installation

### Install All Dependencies

```json
// package.json
{
  "name": "ai-radio-station",
  "version": "1.0.0",
  "scripts": {
    "setup": "npm install && node scripts/setup.js",
    "start": "start_all_services.bat",
    "test": "jest",
    "migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "mysql2": "^3.6.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

```bash
# Install dependencies
npm install

# Or use yarn
yarn install
```

## N8N Configuration

### Import Workflows Automatically

```javascript
// scripts/import_workflows.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const N8N_API_URL = 'http://localhost:5678/api/v1';
const WORKFLOWS_DIR = './n8n_workflows';

async function importWorkflows() {
  console.log('Importing n8n workflows...\n');

  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.json'));

  for (const file of files) {
    const workflowPath = path.join(WORKFLOWS_DIR, file);
    const workflow = JSON.parse(fs.readFileSync(workflowPath));

    try {
      console.log(`Importing: ${workflow.name}`);

      await axios.post(`${N8N_API_URL}/workflows`, workflow);

      console.log(`✓ ${workflow.name} imported\n`);
    } catch (error) {
      console.error(`✗ Failed to import ${file}:`, error.message);
    }
  }

  console.log('Workflow import complete!');
}

importWorkflows();
```

## Health Checks

### System Health Check

```javascript
// scripts/health_check.js
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

async function checkHealth() {
  console.log('=== System Health Check ===\n');

  const checks = {
    mysql: false,
    n8n: false,
    sunoAPI: false,
    openAI: false
  };

  // Check MySQL
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await connection.execute('SELECT 1');
    await connection.end();
    checks.mysql = true;
    console.log('✓ MySQL: Connected');
  } catch (error) {
    console.log('✗ MySQL: Failed -', error.message);
  }

  // Check n8n
  try {
    await axios.get('http://localhost:5678');
    checks.n8n = true;
    console.log('✓ n8n: Running');
  } catch (error) {
    console.log('✗ n8n: Not running');
  }

  // Check Suno API
  try {
    await axios.get(process.env.SUNO_API_URL + '/health');
    checks.sunoAPI = true;
    console.log('✓ Suno API: Accessible');
  } catch (error) {
    console.log('✗ Suno API: Not accessible');
  }

  // Check OpenAI
  try {
    await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });
    checks.openAI = true;
    console.log('✓ OpenAI API: Valid key');
  } catch (error) {
    console.log('✗ OpenAI API: Invalid key or unreachable');
  }

  console.log('\n=== Summary ===');
  const allHealthy = Object.values(checks).every(v => v);
  console.log(allHealthy ? '✓ All systems operational' : '⚠ Some systems need attention');

  return checks;
}

checkHealth();
```

## Troubleshooting Setup Issues

### Common Issues

**MySQL Won't Start:**
```bash
# Check if port 3306 is in use
netstat -ano | findstr :3306

# Check MySQL service
net start | findstr MySQL

# View MySQL error log
type "C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err"
```

**n8n Won't Start:**
```bash
# Check if port 5678 is in use
netstat -ano | findstr :5678

# Kill process using port
taskkill /PID <pid> /F

# Check n8n logs
n8n start --log-level debug
```

**Dependencies Won't Install:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rmdir /s /q node_modules
del package-lock.json
npm install
```

## One-Command Setup

```bash
# Complete setup in one command
npm run setup && npm run migrate && npm run start
```

## Docker Setup (Alternative)

```dockerfile
# docker-compose.yml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: Hunter0hunter2207
      MYSQL_DATABASE: radio_station
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=mysqldb
      - DB_MYSQLDB_HOST=mysql
      - DB_MYSQLDB_DATABASE=n8n
      - DB_MYSQLDB_USER=root
      - DB_MYSQLDB_PASSWORD=Hunter0hunter2207
    depends_on:
      - mysql

volumes:
  mysql_data:
```

```bash
# Start with Docker
docker-compose up -d

# Stop
docker-compose down
```

## When to Use This Skill

- Setting up new development environment
- Installing dependencies
- Configuring services (MySQL, n8n, etc.)
- Starting/stopping services
- Running health checks
- Troubleshooting environment issues
- Initializing databases
- Importing workflows
- Creating environment configuration files
