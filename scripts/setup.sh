#!/bin/bash
# PYrte Radio Shack - Complete Setup Script
# This script sets up the entire radio station infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         PYrte Radio Shack - Complete Setup                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

cd "$PROJECT_DIR"

# Step 1: Check Python
echo -e "${YELLOW}[1/7] Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: Python 3 is not installed${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "  ${GREEN}✓${NC} $PYTHON_VERSION"

# Step 2: Check/Create virtual environment
echo -e "${YELLOW}[2/7] Setting up virtual environment...${NC}"
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo -e "  ${GREEN}✓${NC} Virtual environment activated"

# Step 3: Install dependencies
echo -e "${YELLOW}[3/7] Installing dependencies...${NC}"
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo -e "  ${GREEN}✓${NC} Dependencies installed"

# Step 4: Check .env file
echo -e "${YELLOW}[4/7] Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo "  Creating .env from .env.example..."
    cp .env.example .env
    echo -e "  ${YELLOW}!${NC} Please edit .env with your actual credentials"
    echo ""
    echo "  Required settings:"
    echo "    - POSTGRES_PASSWORD"
    echo "    - TELEGRAM_BOT_TOKEN"
    echo "    - OPENAI_API_KEY"
    echo ""
    read -p "  Press Enter to continue after editing .env, or Ctrl+C to exit..."
else
    echo -e "  ${GREEN}✓${NC} .env file exists"
fi

# Step 5: Check PostgreSQL connection
echo -e "${YELLOW}[5/7] Checking database connection...${NC}"
python3 -c "
from src.utils.config import settings
from sqlalchemy import create_engine, text
try:
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('  \033[0;32m✓\033[0m PostgreSQL connection successful')
except Exception as e:
    print(f'  \033[0;31mERROR:\033[0m Could not connect to PostgreSQL')
    print(f'    {e}')
    print('')
    print('  Make sure PostgreSQL is running:')
    print('    - Docker: docker-compose up -d postgres')
    print('    - Local: sudo systemctl start postgresql')
    exit(1)
"

# Step 6: Run database migrations
echo -e "${YELLOW}[6/7] Running database migrations...${NC}"
alembic upgrade head
echo -e "  ${GREEN}✓${NC} Migrations complete"

# Step 7: Seed initial data
echo -e "${YELLOW}[7/7] Seeding initial data...${NC}"
python3 scripts/seed_data.py
echo -e "  ${GREEN}✓${NC} Database seeded"

# Create storage directories
echo ""
echo -e "${YELLOW}Creating storage directories...${NC}"
mkdir -p data/songs data/temp data/broadcast
echo -e "  ${GREEN}✓${NC} Storage directories created"

# Generate n8n credentials
echo ""
echo -e "${YELLOW}Generating n8n credential files...${NC}"
python3 scripts/setup_n8n.py --output-dir ./n8n_credentials
echo -e "  ${GREEN}✓${NC} n8n credentials generated"

# Final summary
echo ""
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Next steps:"
echo ""
echo "  1. Configure n8n:"
echo "     - Import credentials from n8n_credentials/"
echo "     - Import workflows from n8n_workflows/"
echo "     - Activate the workflows"
echo ""
echo "  2. Start the API server:"
echo "     cd $PROJECT_DIR"
echo "     source venv/bin/activate"
echo "     uvicorn src.api.main:app --reload"
echo ""
echo "  3. Set up Telegram webhook:"
echo "     curl -X POST 'https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_N8N_WEBHOOK_URL>'"
echo ""
echo "  4. Test your bot:"
echo "     Send /help to your Telegram bot"
echo ""
echo -e "${BLUE}Happy broadcasting! 📻${NC}"
