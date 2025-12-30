---
name: n8n-workflow-manager
description: Manage n8n workflows using MCP tools - list, create, update, activate, deactivate, and monitor executions. Use when the user mentions n8n, workflows, automation, or workflow management.
---

# N8N Workflow Manager

## Purpose
Manage n8n workflows using the MCP n8n server integration. Perform CRUD operations, monitor executions, and troubleshoot workflow issues.

## Available MCP Tools

### Workflow Management

**List all workflows:**
```javascript
mcp__n8n__list_workflows()
mcp__n8n__list_workflows({ active: true })  // Only active workflows
mcp__n8n__list_workflows({ active: false }) // Only inactive workflows
```

**Get specific workflow:**
```javascript
mcp__n8n__get_workflow("workflow_id")
```

**Create new workflow:**
```javascript
mcp__n8n__create_workflow({
  name: "My New Workflow",
  nodes: [...],
  connections: {...},
  active: false,
  tags: ["automation", "project-name"]
})
```

**Update workflow:**
```javascript
mcp__n8n__update_workflow({
  workflowId: "workflow_id",
  name: "Updated Name",
  nodes: [...],
  connections: {...}
})
```

**Delete workflow:**
```javascript
mcp__n8n__delete_workflow("workflow_id")
```

**Activate/Deactivate:**
```javascript
mcp__n8n__activate_workflow("workflow_id")
mcp__n8n__deactivate_workflow("workflow_id")
```

### Execution Management

**List executions:**
```javascript
// All executions
mcp__n8n__list_executions()

// Filter by workflow
mcp__n8n__list_executions({ workflowId: "workflow_id" })

// Filter by status
mcp__n8n__list_executions({ status: "success" })
mcp__n8n__list_executions({ status: "error" })
mcp__n8n__list_executions({ status: "waiting" })

// With pagination
mcp__n8n__list_executions({ limit: 20, lastId: "execution_id" })

// With summary
mcp__n8n__list_executions({ includeSummary: true })
```

**Get execution details:**
```javascript
mcp__n8n__get_execution("execution_id")
```

**Delete execution:**
```javascript
mcp__n8n__delete_execution("execution_id")
```

### Webhook Execution

**Run workflow via webhook:**
```javascript
// Basic webhook call
mcp__n8n__run_webhook({
  workflowName: "my-workflow-name"
})

// With input data
mcp__n8n__run_webhook({
  workflowName: "my-workflow-name",
  data: {
    user_input: "some value",
    parameters: { key: "value" }
  }
})

// With custom headers
mcp__n8n__run_webhook({
  workflowName: "my-workflow-name",
  data: { input: "data" },
  headers: {
    "X-Custom-Header": "value"
  }
})
```

## Common Workflows

### Create a Simple Workflow

```javascript
mcp__n8n__create_workflow({
  name: "My Test Workflow",
  nodes: [
    {
      parameters: {},
      name: "Manual Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [250, 300]
    },
    {
      parameters: {
        functionCode: "return { json: { message: 'Hello World' } };"
      },
      name: "Function",
      type: "n8n-nodes-base.function",
      typeVersion: 1,
      position: [450, 300]
    }
  ],
  connections: {
    "Manual Trigger": {
      "main": [
        [
          {
            "node": "Function",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  active: false
})
```

### Check for Failed Executions

```javascript
// Get recent errors
const errorExecs = mcp__n8n__list_executions({
  status: "error",
  limit: 10
})

// Get details of specific error
const errorDetails = mcp__n8n__get_execution("error_execution_id")
```

### Bulk Activate/Deactivate

```javascript
// Get all inactive workflows
const workflows = mcp__n8n__list_workflows({ active: false })

// Activate each one
workflows.forEach(workflow => {
  mcp__n8n__activate_workflow(workflow.id)
})
```

## Workflow File Locations

### Your Workflow Files

```
C:\Users\Jesse\.gemini\antigravity\radio\n8n_workflows\
├── ai_radio_mysql_v2.json
├── queue_processor.json
├── radio_station_director.json
└── reputation_calculator.json
```

## Importing Workflows from Files

### Step-by-Step Import

1. **Read the workflow file:**
```javascript
const fs = require('fs')
const workflowData = JSON.parse(fs.readFileSync('path/to/workflow.json', 'utf8'))
```

2. **Create in n8n:**
```javascript
mcp__n8n__create_workflow({
  name: workflowData.name,
  nodes: workflowData.nodes,
  connections: workflowData.connections,
  active: false  // Start inactive for safety
})
```

3. **Update credentials:**
- Get the created workflow ID
- Manually update credential IDs in n8n UI
- Or update programmatically if you know the credential IDs

4. **Activate:**
```javascript
mcp__n8n__activate_workflow("new_workflow_id")
```

## Troubleshooting

### Workflow Won't Activate

**Check:**
1. All required credentials are configured
2. No syntax errors in Function nodes
3. All required nodes are installed
4. Webhook URLs are unique

**Debug:**
```javascript
// Get workflow details
const workflow = mcp__n8n__get_workflow("workflow_id")

// Check for missing credentials
workflow.nodes.forEach(node => {
  if (node.credentials) {
    console.log(`Node ${node.name} requires:`, node.credentials)
  }
})
```

### Executions Failing

**Steps:**
1. List recent failures:
```javascript
mcp__n8n__list_executions({ status: "error", limit: 5 })
```

2. Get detailed error:
```javascript
const execution = mcp__n8n__get_execution("failed_execution_id")
console.log(execution.data.resultData.error)
```

3. Check specific node errors:
```javascript
execution.data.executionData.forEach(node => {
  if (node.error) {
    console.log(`Error in ${node.nodeName}:`, node.error)
  }
})
```

### Webhook Not Triggering

**Check:**
1. Workflow is active
2. Webhook node is configured correctly
3. Correct workflow name is used

**Test:**
```javascript
// Test with simple data
mcp__n8n__run_webhook({
  workflowName: "test-workflow",
  data: { test: "data" }
})
```

## Best Practices

### Development Workflow

1. **Create inactive**: Always create workflows with `active: false`
2. **Test manually**: Use manual triggers to test before activating
3. **Version control**: Keep workflow JSON files in git
4. **Incremental updates**: Test small changes before big refactors
5. **Monitor executions**: Regularly check for failures

### Naming Conventions

- Use descriptive names: "AI Radio - Music Generator v2"
- Include version numbers for iterations
- Use tags to organize workflows
- Consistent naming across related workflows

### Error Handling

- Add error workflows for critical paths
- Use IF nodes to check conditions
- Set timeouts on Wait nodes
- Add retry logic for API calls
- Log errors to database or file

### Performance

- Limit execution history: Regularly delete old executions
- Use pagination when listing executions
- Deactivate unused workflows
- Optimize long-running workflows with batching

## Monitoring Checklist

Regular monitoring tasks:

```javascript
// 1. Check for errors
mcp__n8n__list_executions({ status: "error", limit: 10 })

// 2. Verify active workflows
mcp__n8n__list_workflows({ active: true })

// 3. Check waiting executions (might be stuck)
mcp__n8n__list_executions({ status: "waiting" })

// 4. Get execution summary
mcp__n8n__list_executions({ includeSummary: true })
```

## Integration with Your Projects

### Radio Station Workflows

Monitor the 4 radio workflows:
- AI Radio MySQL v2
- Queue Processor
- Radio Station Director
- Reputation Calculator

### Custom Automations

Create new workflows for:
- Data processing
- API integrations
- Scheduled tasks
- Event-driven automations

## When to Use This Skill

- Listing or searching for workflows
- Creating new automation workflows
- Updating existing workflows
- Checking workflow execution status
- Debugging workflow failures
- Activating/deactivating workflows
- Managing workflow executions
- Triggering workflows via webhook
- General n8n workflow operations
