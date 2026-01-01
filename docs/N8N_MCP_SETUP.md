# n8n Oracle MCP Server Setup Guide

This guide helps you connect Claude Code to your n8n instance on Oracle Cloud.

## Configuration Completed

✅ **MCP Server Added**: n8n Oracle MCP server configured in `.claude/settings.json`
✅ **MCP Package**: `mcp-n8n` by gomakers (npm)
✅ **Server Address**: `http://140.238.79.211:5678`
✅ **Environment Template**: Updated `.env.example` with Oracle IP

## Next Steps

### 1. Get Your n8n API Key

**Option A: Via n8n UI**
1. Open your browser and go to: `http://140.238.79.211:5678`
2. Log in to your n8n instance
3. Click on **Settings** (gear icon) in the left sidebar
4. Navigate to **API** section
5. Click **Create API Key**
6. Give it a name like "Claude Code MCP"
7. Copy the generated API key (you'll only see it once!)

**Option B: Via n8n CLI** (if you have SSH access)
```bash
ssh user@140.238.79.211
n8n user:create-api-key --email=your-email@example.com
```

### 2. Configure Environment Variables

**Create your `.env` file:**
```bash
cp .env.example .env
```

**Edit `.env` and add your n8n API key:**
```bash
# ===========================================
# n8n Configuration (Oracle Cloud)
# ===========================================
N8N_HOST=http://140.238.79.211:5678
N8N_API_KEY=n8n_api_your_actual_key_here
```

⚠️ **Security Note**: Never commit `.env` files to git. They're already in `.gitignore`.

### 3. Restart Claude Code

After adding your API key:
1. Exit Claude Code completely
2. Restart Claude Code
3. The n8n MCP server will initialize automatically

### 4. Verify Connection

Once restarted, you should have access to these MCP tools:

```javascript
// List all workflows
mcp__n8n__list_workflows()

// Get specific workflow
mcp__n8n__get_workflow("workflow_id")

// List recent executions
mcp__n8n__list_executions({ limit: 10 })

// Activate a workflow
mcp__n8n__activate_workflow("workflow_id")

// Run workflow via webhook
mcp__n8n__run_webhook({
  workflowName: "my-workflow",
  data: { input: "test" }
})
```

## Available n8n MCP Tools

### Workflow Management
| Tool | Description |
|------|-------------|
| `mcp__n8n__list_workflows()` | List all workflows |
| `mcp__n8n__get_workflow(id)` | Get specific workflow details |
| `mcp__n8n__create_workflow(data)` | Create new workflow |
| `mcp__n8n__update_workflow(data)` | Update existing workflow |
| `mcp__n8n__delete_workflow(id)` | Delete workflow |
| `mcp__n8n__activate_workflow(id)` | Activate workflow |
| `mcp__n8n__deactivate_workflow(id)` | Deactivate workflow |

### Execution Management
| Tool | Description |
|------|-------------|
| `mcp__n8n__list_executions(filters)` | List workflow executions |
| `mcp__n8n__get_execution(id)` | Get execution details |
| `mcp__n8n__delete_execution(id)` | Delete execution |
| `mcp__n8n__run_webhook(data)` | Trigger workflow via webhook |

## Testing the Connection

Ask Claude Code to test the connection:

```
List all my n8n workflows
```

Or use the skill:
```
/skill n8n-workflow-manager
```

## Troubleshooting

### Error: "Cannot connect to n8n"

**Check:**
1. ✅ n8n instance is running: `curl http://140.238.79.211:5678/healthz`
2. ✅ API key is correctly set in `.env`
3. ✅ Firewall allows connection to port 5678
4. ✅ Claude Code has been restarted after adding API key

### Error: "Unauthorized" or 401

**Fix:**
- Your API key is incorrect or expired
- Generate a new API key in n8n Settings → API
- Update the `N8N_API_KEY` in your `.env` file
- Restart Claude Code

### Error: "MCP server not found"

**Fix:**
- The `mcp-n8n` package will be installed automatically via `npx`
- Ensure you have internet connection for first-time installation
- Check that `npx` is available: `npx --version`

### Firewall Issues

If connecting from outside Oracle Cloud network:

**Check Oracle Cloud Security Rules:**
1. Go to Oracle Cloud Console
2. Navigate to your instance's subnet
3. Check Security List rules
4. Ensure port 5678 is open for ingress from your IP

**Or use SSH tunneling:**
```bash
ssh -L 5678:localhost:5678 user@140.238.79.211
```

Then update `.env`:
```bash
N8N_HOST=http://localhost:5678
```

## MCP Configuration Details

The configuration in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "mcp-n8n"],
      "env": {
        "N8N_API_URL": "http://140.238.79.211:5678",
        "N8N_API_KEY": "${N8N_API_KEY}"
      }
    }
  }
}
```

**How it works:**
- `npx -y mcp-n8n` - Runs the mcp-n8n server (by gomakers)
- `N8N_API_URL` - Direct connection to your Oracle Cloud instance
- `N8N_API_KEY` - Loaded from your `.env` file via environment variable substitution

**Package Info:**
- Package: [`mcp-n8n`](https://www.npmjs.com/package/mcp-n8n) v1.1.1
- Provider: gomakers
- Features: Complete n8n API integration for workflow automation

## Use Cases

Once connected, you can:

1. **List and manage your 3 radio workflows:**
   - `telegram_bot_handler.json`
   - `queue_processor.json`
   - `broadcast_director.json`

2. **Monitor workflow executions:**
   - Check for failed executions
   - View execution logs
   - Debug workflow issues

3. **Deploy workflow updates:**
   - Update workflows from JSON files
   - Activate/deactivate workflows
   - Test workflows before going live

4. **Automate workflow operations:**
   - Trigger workflows programmatically
   - Batch activate/deactivate workflows
   - Export workflows for version control

## Next Steps

After setup:
1. ✅ Ask Claude Code: "List all my n8n workflows"
2. ✅ Import the radio station workflows from `n8n_workflows/` directory
3. ✅ Set up monitoring for workflow executions
4. ✅ Use the `n8n-workflow-manager` skill for advanced operations

## Support

- **n8n Documentation**: https://docs.n8n.io/api/
- **MCP Documentation**: https://modelcontextprotocol.io/
- **Project Skills**: See `.claude/skills/n8n-workflow-manager/SKILL.md`

---

**Status**: Ready to connect once you add your n8n API key to `.env`
