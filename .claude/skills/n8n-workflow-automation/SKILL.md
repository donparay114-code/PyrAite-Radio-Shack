---
name: n8n-workflow-automation
description: Build and debug n8n workflows, configure nodes, and integrate APIs. Use when creating automation workflows, connecting services, or setting up data pipelines with n8n.
---

# n8n Workflow Automation

## Instructions

1. Design workflow logic with appropriate nodes
2. Configure HTTP nodes for API integration
3. Use expressions for data transformation
4. Implement error handling and retries
5. Test workflows in n8n editor before activating
6. Monitor execution logs for debugging
7. Use credentials manager for API keys
8. Create reusable sub-workflows

## Key node types

- **Trigger nodes:** Telegram Trigger, Schedule Trigger, Webhook
- **MySQL nodes:** Execute Query for database operations
- **HTTP Request:** API calls to Suno, OpenAI
- **Function:** Custom JavaScript for data transformation
- **IF:** Conditional logic
- **Wait:** Delays for async operations
- **File Write:** Save MP3 files to disk

## n8n Expression syntax

- Access previous node: `$('Node Name').item.json.field`
- Current item: `$json.field`
- JavaScript expressions: `={{ Math.round($json.score) }}`
- String concatenation: `'Text {{ $json.value }}'`

## For AI Radio Station workflows

**Workflow 1: Request Handler**
- Telegram Trigger → Parse Message → OpenAI Moderation → MySQL Insert → Telegram Confirmation

**Workflow 2: Queue Processor**
- Schedule (every 2 min) → Get Next Song → Suno API → Download MP3 → Update Database

**Workflow 3: Reputation Calculator**
- Schedule (every 5 min) → Recalculate Priorities → Check Bans → Update Statistics

**Important:**
- Use placeholder credentials `YOUR_MYSQL_CREDENTIALS_ID` in exported JSONs
- Replace Suno API URL `https://your-suno-api.example.com` with actual endpoint
- Manual import via n8n UI is more reliable than MCP create_workflow
- Test with small data before activating on production database

## n8n Access

- Local: http://localhost:5678
- Cloud: https://donparay1.app.n8n.cloud
- MCP servers configured for both local and cloud instances
