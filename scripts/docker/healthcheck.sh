#!/bin/bash
# healthcheck.sh - Check health of all Docker services
# Usage: ./healthcheck.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== PYrte Radio Shack Health Check ===${NC}"
echo ""

check_service() {
    local name=$1
    local check_cmd=$2

    printf "%-20s" "$name:"
    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC}"
        return 0
    else
        echo -e "${RED}[FAIL]${NC}"
        return 1
    fi
}

# API Health
check_service "API" "curl -sf http://localhost:8000/health"

# Database Health
check_service "PostgreSQL" "docker exec pyrte-radio-db pg_isready -U radio_user"

# Redis Health
check_service "Redis" "docker exec pyrte-radio-redis redis-cli ping"

# n8n Health
check_service "n8n" "curl -sf http://localhost:5678/healthz"

# Optional: Icecast (streaming profile)
if docker ps --format '{{.Names}}' | grep -q 'pyrte-radio-icecast'; then
    check_service "Icecast" "curl -sf http://localhost:8080/status.xsl"
fi

echo ""
echo -e "${BLUE}=== Container Status ===${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep pyrte-radio || echo "No containers running"

echo ""
echo -e "${BLUE}=== Resource Usage ===${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep pyrte-radio || echo "No containers running"
