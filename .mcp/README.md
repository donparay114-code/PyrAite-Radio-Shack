# n8n MCP Server Configuration

This directory contains configuration for n8n Model Context Protocol (MCP) servers, enabling Claude to interact with n8n workflows.

## What is MCP?

Model Context Protocol (MCP) is an open standard developed by Anthropic that allows AI models to connect to tools, APIs, and data sources in a standardized way.

## Available n8n MCP Servers

This project is configured with two n8n MCP servers:

### 1. n8n Workflow Builder (`n8n-workflow-builder`)
**Package**: `n8n-mcp` by czlonkowski

**Purpose**: Build and create n8n workflows using natural language

**Features**:
- Create workflows from descriptions
- Generate workflow nodes
- Design automation flows
- No n8n instance required for workflow design

**Use Cases**:
- "Create a workflow that sends email notifications when a webhook is triggered"
- "Design a workflow to sync data between Google Sheets and a database"
- "Build an automation to process images uploaded to S3"

### 2. n8n Server (`n8n-server`)
**Package**: `@illuminaresolutions/n8n-mcp-server`

**Purpose**: Interact with a running n8n instance

**Features**:
- List and manage workflows
- Execute workflows
- View execution history
- Manage credentials
- Monitor workflow status

**Requirements**:
- Running n8n instance
- n8n API key
- n8n base URL

**Use Cases**:
- "Show me all active workflows"
- "Execute the 'daily-backup' workflow"
- "Get the last 10 executions for workflow ID 123"
- "List all credentials in the instance"

## Installation & Setup

### For Claude Desktop

1. **Locate your Claude Desktop config file**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Copy the configuration**:
   ```bash
   # Use the claude-desktop-config.json from this directory
   cp .mcp/claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Set environment variables** (for n8n-server):
   ```bash
   # Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
   export N8N_BASE_URL="http://localhost:5678"
   export N8N_API_KEY="your-n8n-api-key"
   ```

4. **Restart Claude Desktop**

### For Claude Code (CLI)

Claude Code automatically looks for MCP configuration in:
- Project-level: `.mcp/mcp-config.json` (this directory)
- Global: `~/.config/claude-code/mcp.json`

The project-level configuration is already set up in `.mcp/mcp-config.json`.

### For n8n Server MCP

To use the n8n-server MCP, you need a running n8n instance:

1. **Get your n8n API key**:
   - Open n8n (usually http://localhost:5678)
   - Go to Settings → API
   - Create a new API key

2. **Configure environment**:

   Create a `.env` file in the project root:
   ```bash
   N8N_BASE_URL=http://localhost:5678
   N8N_API_KEY=your-api-key-here
   ```

3. **Update the configuration**:

   Edit `.mcp/mcp-config.json` and replace the placeholder values:
   ```json
   "N8N_BASE_URL": "http://localhost:5678",
   "N8N_API_KEY": "your-actual-api-key"
   ```

## Usage Examples

### With n8n Workflow Builder

Ask Claude:
```
Create an n8n workflow that:
1. Triggers on a webhook
2. Parses JSON data
3. Sends a Slack notification
4. Logs to a database
```

### With n8n Server

Ask Claude:
```
Show me all my n8n workflows
```

```
Execute the workflow named "daily-report"
```

```
What were the last 5 executions of workflow ID 42?
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
