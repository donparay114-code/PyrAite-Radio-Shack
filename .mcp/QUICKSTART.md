# n8n MCP Server Quick Start Guide

Get started with n8n MCP integration in 5 minutes!

## 🚀 Quick Setup

### Step 1: Choose Your MCP Server

**Option A: Workflow Builder Only** (No n8n instance needed)
```bash
# Just use Claude to design workflows
# No additional setup required!
```

**Option B: Full n8n Integration** (Requires running n8n)
```bash
# Continue to Step 2
```

### Step 2: Install n8n (if not already installed)

```bash
# Using npx (recommended for testing)
npx n8n

# OR using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# OR using npm globally
npm install -g n8n
n8n start
```

n8n will be available at: http://localhost:5678

### Step 3: Get Your n8n API Key

1. Open http://localhost:5678
2. Complete initial setup (create account)
3. Go to **Settings** → **API**
4. Click **Create API Key**
5. Copy the key (you'll only see it once!)

### Step 4: Configure Environment

```bash
# In the project root directory
cp .env.example .env

# Edit .env and add your API key
nano .env
```

Add your API key to `.env`:
```bash
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here
```

### Step 5: Update MCP Config

Edit `.mcp/mcp-config.json`:

```json
{
  "mcpServers": {
    "n8n-server": {
      "env": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-actual-api-key"
      }
    }
  }
}
```

### Step 6: Restart Claude

- **Claude Desktop**: Quit and restart the application
- **Claude Code**: Start a new session

### Step 7: Test It!

Ask Claude:

```
List my n8n workflows
```

or

```
Create an n8n workflow that sends me a daily email summary
```

## ✅ Verification

To verify everything is working:

1. **Test Workflow Builder**:
   ```
   Create a simple n8n workflow with a webhook trigger and HTTP request node
   ```

2. **Test n8n Server** (if configured):
   ```
   Show me all workflows in my n8n instance
   ```

## 🎯 Example Use Cases

### Design Workflows
```
Create an n8n workflow that:
1. Monitors a GitHub repo for new issues
2. Analyzes the issue content
3. Assigns labels automatically
4. Sends a Slack notification
```

### Manage Workflows
```
Show me all workflows that haven't been executed in the last 7 days
```

### Execute Workflows
```
Run the "daily-backup" workflow now
```

### Monitor Executions
```
Show me the last 10 failed workflow executions
```

## 🔧 Troubleshooting

### "Cannot connect to n8n"
- Verify n8n is running: `curl http://localhost:5678/healthz`
- Check your N8N_BASE_URL in `.env`
- Ensure n8n API is enabled

### "Invalid API key"
- Regenerate API key in n8n settings
- Update `.env` and `.mcp/mcp-config.json`
- Restart Claude

### "MCP server not found"
- Verify npx can access the package: `npx -y n8n-mcp --help`
- Check your internet connection (for first-time package download)
- Restart Claude after configuration changes

## 📚 Next Steps

- Read the full [README.md](.mcp/README.md) for advanced configuration
- Explore [n8n documentation](https://docs.n8n.io/)
- Check out [example workflows](https://n8n.io/workflows)
- Join the [n8n community](https://community.n8n.io/)

## 🔐 Security Reminders

- ✅ Never commit `.env` to version control
- ✅ Use different API keys for dev/prod
- ✅ Restrict API key permissions in n8n
- ✅ Keep your n8n instance updated
- ✅ Use HTTPS for production instances

## 💡 Tips

- Use workflow builder to design, then export to your n8n instance
- Name your workflows descriptively for easy management
- Tag workflows for better organization
- Set up error notifications for critical workflows
- Regular backups of your n8n data

## 🤝 Getting Help

- **MCP Issues**: See [README.md](.mcp/README.md)
- **n8n Issues**: [n8n Community](https://community.n8n.io/)
- **Claude Code**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)

---

**Ready to automate?** Start by asking Claude to create your first workflow! 🎉
