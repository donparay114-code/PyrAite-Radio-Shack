#!/bin/bash
# logs-all.sh - View logs from all containers with color coding
# Usage: ./logs-all.sh [lines]

LINES=${1:-100}

# Colors for different services
API_COLOR='\033[0;32m'      # Green
DB_COLOR='\033[0;33m'       # Yellow
REDIS_COLOR='\033[0;31m'    # Red
N8N_COLOR='\033[0;34m'      # Blue
NC='\033[0m'

echo "Showing last $LINES lines from all containers..."
echo "Press Ctrl+C to exit"
echo ""

docker compose logs --tail=$LINES -f 2>/dev/null || \
docker-compose logs --tail=$LINES -f
