# n8n MCP Server Configuration

This directory contains configuration for n8n Model Context Protocol (MCP) servers, enabling Claude to interact with n8n workflows.

## What is MCP?

Model Context Protocol (MCP) is an open standard developed by Anthropic that allows AI models to connect to tools, APIs, and data sources in a standardized way.

## Available n8n MCP Servers

This project is configured with **four production-ready n8n MCP servers**:

### 1. n8n Production (`n8n-production`) ⭐ **PRIMARY**
**Package**: `@leonardsellem/n8n-mcp-server` by leonardsellem (1.5k+ stars)

**Purpose**: Production workflow management via REST API

**Features**:
- Full workflow lifecycle management (CRUD operations)
- Workflow execution control (run, stop, monitor)
- Execution history and monitoring
- Webhook management and triggering
- Credential operations
- Direct REST API integration

**Available Tools**:
- `workflow_list`, `workflow_get`, `workflow_create`, `workflow_update`, `workflow_delete`
- `workflow_activate`, `workflow_deactivate`
- `execution_run`, `execution_get`, `execution_list`, `execution_stop`
- `run_webhook`

**Requirements**:
- Running n8n instance
- n8n API key (Settings → API in n8n)
- n8n API URL (e.g., `https://n8n.yourdomain.com/api/v1`)

**Use Cases**:
- "List all active workflows and their execution status"
- "Execute workflow ID 42 with custom parameters"
- "Show me failed executions from the last 24 hours"
- "Activate the 'daily-backup' workflow"
- "Trigger the webhook at /webhook/customer-onboarding"

### 2. n8n Workflow Builder (`n8n-workflow-builder`)
**Package**: `n8n-mcp` by czlonkowski (10.5k+ stars)

**Purpose**: AI-assisted workflow building with node documentation

**Features**:
- Create workflows from natural language descriptions
- Access to n8n node documentation
- Generate workflow nodes with proper configuration
- Design automation flows interactively
- **No n8n instance required** for design

**Use Cases**:
- "Create a workflow that sends email notifications when a webhook is triggered"
- "Design a workflow to sync data between Google Sheets and a database"
- "Build an automation to process images uploaded to S3"
- "What nodes are available for sending Slack messages?"

### 3. n8n Workflow Creator (`n8n-workflow-creator`)
**Package**: `n8n-workflow-builder-mcp` by ifmelate

**Purpose**: Programmatic workflow creation and building

**Features**:
- Programmatic workflow construction
- Template-based workflow generation
- Batch workflow creation
- Advanced workflow composition

**Use Cases**:
- "Create 10 similar workflows with different parameters"
- "Build a workflow template for customer onboarding"
- "Generate workflows from configuration files"

### 4. n8n Illuminare (`n8n-illuminare`) - Backup
**Package**: `@illuminaresolutions/n8n-mcp-server` by illuminaresolutions

**Purpose**: Alternative n8n server management (backup to leonardsellem)

**Features**:
- Workflow management via n8n instance
- Execution monitoring
- Credential management
- Alternative implementation for redundancy

**Requirements**:
- Running n8n instance
- n8n API key
- n8n base URL (e.g., `https://n8n.yourdomain.com`)

## Installation & Setup

### Quick Install (Recommended)

```bash
# Install the primary production MCP server globally
npm install -g @leonardsellem/n8n-mcp-server

# The other servers will be installed automatically via npx when needed
```

### For Claude Code (CLI) - Production Ready ⭐

**Option 1: User-Level Configuration (Recommended)**

Configure MCP servers globally using `~/.claude.json`:

```bash
# Install the leonardsellem server for user-level access
npm install -g @leonardsellem/n8n-mcp-server

# Add to Claude Code with user scope
claude mcp add --transport stdio --scope user n8n-production \
  --env N8N_API_URL=https://n8n.yourdomain.com/api/v1 \
  --env N8N_API_KEY=your_n8n_api_key_here \
  -- npx @leonardsellem/n8n-mcp-server

# Verify the server is registered
claude mcp list
```

**Option 2: Manual Configuration**

Copy the template and customize:

```bash
# Copy the template to your home directory
cp .mcp/claude.json.template ~/.claude.json

# Edit with your credentials
nano ~/.claude.json
```

Update the values:
```json
{
  "mcpServers": {
    "n8n-production": {
      "type": "stdio",
      "command": "npx",
      "args": ["@leonardsellem/n8n-mcp-server"],
      "env": {
        "N8N_API_URL": "https://n8n.yourdomain.com/api/v1",
        "N8N_API_KEY": "your_actual_api_key"
      }
    }
  }
}
```

**Option 3: Project-Level Configuration**

The project already includes `.mcp/mcp-config.json` with all four servers configured.

Simply create `.env` in the project root:
```bash
cp .env.example .env
nano .env
```

Add your credentials:
```bash
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-api-key-here
```

### For Claude Desktop

1. **Locate your Claude Desktop config file**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Install MCP servers**:
   ```bash
   npm install -g @leonardsellem/n8n-mcp-server
   ```

3. **Copy and customize the configuration**:
   ```bash
   # macOS example
   cp .mcp/claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

4. **Set environment variables**:
   ```bash
   # Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
   export N8N_API_URL="https://n8n.yourdomain.com/api/v1"
   export N8N_API_KEY="your-n8n-api-key"
   ```

5. **Restart Claude Desktop**

### Getting Your n8n API Key

1. Open your n8n instance (e.g., http://localhost:5678)
2. Navigate to **Settings** → **n8n API**
3. Click **Create API Key**
4. Copy the key immediately (shown only once!)
5. Add to your `.env` or configuration file

**Important**: The API key provides full access to your n8n instance. Keep it secret!

## Usage Examples

### With n8n Production (Primary Server)

**Workflow Management:**
```
List all active workflows with their last execution status
```

```
Show me workflow ID 42's configuration and settings
```

```
Activate the workflow named "customer-onboarding"
```

**Execution Control:**
```
Execute workflow ID 15 with the following data: {"customer_id": "12345", "action": "process"}
```

```
Show me all failed executions from the last 24 hours
```

```
Stop execution ID 987654
```

**Webhook Operations:**
```
Trigger the webhook at /webhook/payment-processor with test data
```

**Monitoring:**
```
Get execution history for workflow "daily-backup" for the last 7 days
```

### With n8n Workflow Builder

**Design Workflows:**
```
Create an n8n workflow that:
1. Triggers on a webhook
2. Parses JSON data
3. Sends a Slack notification
4. Logs to a database
```

```
What nodes are available for processing CSV files?
```

```
Build a workflow to monitor GitHub issues and create Jira tickets
```

### With n8n Workflow Creator

**Programmatic Creation:**
```
Create 5 similar workflows for different customers with these parameters: [list of parameters]
```

```
Build a workflow template for automated customer onboarding
```

### Combined Usage

```
First, use the workflow builder to design a customer notification workflow,
then create it in my n8n instance using the production server,
and finally execute it with test data
```

## Troubleshooting

### "JSON parsing errors" in Claude Desktop

Make sure `MCP_MODE: "stdio"` is set in the environment variables. This ensures only JSON-RPC messages are sent to stdout.

### "Connection refused" errors

- Verify your n8n instance is running
- Check that N8N_BASE_URL is correct
- Ensure N8N_API_KEY is valid

### MCP server not loading

1. Check that npx can access the package:
   ```bash
   npx -y n8n-mcp --help
   ```

2. Verify environment variables are set:
   ```bash
   echo $N8N_BASE_URL
   echo $N8N_API_KEY
   ```

3. Check Claude logs for errors

## Security Notes

- **Never commit your N8N_API_KEY** to version control
- Use environment variables for sensitive data
- The `.env` file is gitignored by default
- Restrict API key permissions in n8n to minimum required

## Resources

- [n8n MCP GitHub (czlonkowski)](https://github.com/czlonkowski/n8n-mcp)
- [n8n MCP Server (illuminaresolutions)](https://glama.ai/mcp/servers/@illuminaresolutions/n8n-mcp-server)
- [MCP Integration Guide](https://generect.com/blog/n8n-mcp/)
- [n8n Documentation](https://docs.n8n.io/)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)

## Package Information

- **n8n-mcp**: Workflow builder MCP
- **@illuminaresolutions/n8n-mcp-server**: Instance management MCP

Both packages are installed on-demand via `npx -y` (no local installation required).

## Support

For issues with:
- MCP configuration: Check this README
- n8n-mcp package: [GitHub Issues](https://github.com/czlonkowski/n8n-mcp/issues)
- n8n-mcp-server package: [Glama](https://glama.ai/mcp/servers/@illuminaresolutions/n8n-mcp-server)
- Claude Code: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
