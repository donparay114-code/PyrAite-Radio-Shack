#!/bin/bash
# n8n MCP Servers Installation Script
# Installs all required n8n MCP servers for Claude Code integration

set -e

echo "================================================"
echo "n8n MCP Servers Installation Script"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    echo "Please install Node.js and npm first: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm found: $(npm --version)"
echo ""

# Install primary production MCP server
echo "Installing primary production MCP server..."
echo -e "${YELLOW}[@leonardsellem/n8n-mcp-server]${NC}"
npm install -g @leonardsellem/n8n-mcp-server

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Successfully installed @leonardsellem/n8n-mcp-server"
else
    echo -e "${RED}✗${NC} Failed to install @leonardsellem/n8n-mcp-server"
    exit 1
fi

echo ""
echo "================================================"
echo "Installation Complete!"
echo "================================================"
echo ""
echo "The following MCP servers are now available:"
echo ""
echo -e "${GREEN}1. n8n-production${NC} (leonardsellem) - Installed globally"
echo "   Command: n8n-mcp-server"
echo ""
echo -e "${GREEN}2. n8n-workflow-builder${NC} (czlonkowski) - Via npx"
echo "   Command: npx -y n8n-mcp"
echo ""
echo -e "${GREEN}3. n8n-workflow-creator${NC} (ifmelate) - Via npx"
echo "   Command: npx -y n8n-workflow-builder-mcp"
echo ""
echo -e "${GREEN}4. n8n-illuminare${NC} (illuminaresolutions) - Via npx"
echo "   Command: npx -y @illuminaresolutions/n8n-mcp-server"
echo ""
echo "================================================"
echo "Next Steps:"
echo "================================================"
echo ""
echo "1. Copy the environment template:"
echo "   cp .env.example .env"
echo ""
echo "2. Edit .env and add your n8n credentials:"
echo "   nano .env"
echo ""
echo "3. Get your n8n API key:"
echo "   - Open n8n (http://localhost:5678)"
echo "   - Go to Settings → n8n API"
echo "   - Create API Key"
echo ""
echo "4. Update .mcp/mcp-config.json with your credentials"
echo ""
echo "5. For Claude Code user-level config:"
echo "   cp .mcp/claude.json.template ~/.claude.json"
echo "   nano ~/.claude.json"
echo ""
echo "6. Restart Claude Code or Claude Desktop"
echo ""
echo "For detailed setup instructions, see:"
echo "- .mcp/README.md"
echo "- .mcp/QUICKSTART.md"
echo ""
echo -e "${GREEN}Installation successful!${NC}"
