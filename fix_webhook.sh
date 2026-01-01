#!/bin/bash
# fix_webhook.sh - Fix N8N Webhook Configuration for PYrte Radio Shack
# This script updates the N8N webhook URL and restarts the container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_WEBHOOK_URL="https://n8nbigdata.com/"
N8N_CONTAINER_NAME="pyrte-radio-n8n"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  PYrte Radio Shack - Webhook Fix${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if docker-compose.yml exists in current directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}ERROR: docker-compose.yml not found in current directory!${NC}"
    echo "Please run this script from the directory containing docker-compose.yml"
    exit 1
fi

# Step 1: Check if n8n container is running
echo -e "${YELLOW}Step 1: Checking N8N container status...${NC}"
if docker ps --format '{{.Names}}' | grep -q "${N8N_CONTAINER_NAME}"; then
    echo -e "  ${GREEN}✓${NC} N8N container is running"
else
    echo -e "  ${YELLOW}!${NC} N8N container is not running - will start it after configuration"
fi

# Step 2: Update WEBHOOK_URL in docker-compose.yml
echo -e "${YELLOW}Step 2: Updating WEBHOOK_URL in docker-compose.yml...${NC}"

# Check current WEBHOOK_URL
CURRENT_URL=$(grep -E "^\s*- WEBHOOK_URL=" docker-compose.yml | head -1 | cut -d'=' -f2)
echo "  Current WEBHOOK_URL: ${CURRENT_URL}"
echo "  New WEBHOOK_URL: ${PRODUCTION_WEBHOOK_URL}"

# Create backup
cp docker-compose.yml docker-compose.yml.backup
echo -e "  ${GREEN}✓${NC} Created backup: docker-compose.yml.backup"

# Update the WEBHOOK_URL
sed -i "s|WEBHOOK_URL=http://localhost:5678/|WEBHOOK_URL=${PRODUCTION_WEBHOOK_URL}|g" docker-compose.yml
echo -e "  ${GREEN}✓${NC} Updated WEBHOOK_URL"

# Also update N8N_HOST and N8N_PROTOCOL for production
sed -i "s|N8N_HOST=localhost|N8N_HOST=n8nbigdata.com|g" docker-compose.yml
sed -i "s|N8N_PROTOCOL=http|N8N_PROTOCOL=https|g" docker-compose.yml
echo -e "  ${GREEN}✓${NC} Updated N8N_HOST and N8N_PROTOCOL"

# Step 3: Restart N8N container
echo -e "${YELLOW}Step 3: Restarting N8N container...${NC}"
docker-compose up -d n8n
echo -e "  ${GREEN}✓${NC} N8N container restarted"

# Wait for n8n to be ready
echo -e "${YELLOW}Step 4: Waiting for N8N to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker logs ${N8N_CONTAINER_NAME} 2>&1 | grep -q "Editor is now accessible"; then
        echo -e "  ${GREEN}✓${NC} N8N is ready!"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo -e "  ${YELLOW}!${NC} N8N may take longer to start. Check manually."
        break
    fi
    sleep 2
done

# Step 5: Display verification instructions
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Fix Applied Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps - Verify in N8N:${NC}"
echo "1. Log in to your N8N at https://n8nbigdata.com/"
echo "2. Open the 'Telegram Bot Radio Handler' workflow"
echo "3. Ensure the workflow is ACTIVE (toggle on)"
echo "4. Open the Telegram Trigger node"
echo "5. Click 'Webhook URLs' -> 'Production URL'"
echo "6. Verify it starts with: ${PRODUCTION_WEBHOOK_URL}"
echo ""
echo -e "${YELLOW}If using Telegram Bot, set the webhook:${NC}"
echo "curl -X POST 'https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=${PRODUCTION_WEBHOOK_URL}webhook/<WEBHOOK_PATH>'"
echo ""
echo -e "${YELLOW}To check Telegram webhook status:${NC}"
echo "curl 'https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo'"
echo ""
echo -e "${GREEN}Done!${NC}"
