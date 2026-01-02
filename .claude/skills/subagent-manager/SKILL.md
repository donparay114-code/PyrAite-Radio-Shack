---
name: subagent-manager
description: Design, create, and manage custom subagents for complex workflows. Use when the user mentions subagents, multi-agent workflows, parallel tasks, or wants to create specialized agents.
---

# Subagent Manager

## Purpose
Design and orchestrate custom subagents to handle complex, multi-step tasks through specialized AI agents with isolated contexts and specific tool permissions.

## What Are Subagents?

**Subagents** are specialized AI assistants that Claude can delegate tasks to. Each subagent has:
- **Isolated context window** (200K tokens, separate from main conversation)
- **Custom system prompt** (specialized expertise)
- **Curated tools** (only what they need)
- **Specific model** (can use haiku for speed, sonnet/opus for quality)

## Built-in Subagents

### 1. Explore Agent
**Use via Task tool**: `subagent_type: "Explore"`

**Purpose**: Read-only codebase exploration

**Thoroughness levels**:
- `"quick"` - Fast, targeted searches
- `"medium"` - Balanced exploration
- `"very thorough"` - Comprehensive analysis

**Example**:
```
Find all files that handle Suno API calls
→ Uses Explore agent with "medium" thoroughness
```

### 2. Plan Agent
**Use via Task tool**: `subagent_type: "Plan"`

**Purpose**: Software architecture and implementation planning

**Example**:
```
Plan how to add DJ intro generation to radio station
→ Uses Plan agent to design approach
```

### 3. General-Purpose Agent
**Use via Task tool**: `subagent_type: "general-purpose"`

**Purpose**: Complex multi-step tasks, research, file operations

**Example**:
```
Research how to optimize MySQL query performance
→ Uses General-Purpose agent with full tool access
```

## Creating Custom Subagents

### Directory Structure

```
.claude/agents/
├── migration-reviewer/
│   ├── AGENT.md
│   └── examples.md
├── workflow-optimizer/
│   ├── AGENT.md
│   └── reference.md
└── api-integrator/
    └── AGENT.md
```

### Subagent Template

```markdown
<!-- .claude/agents/agent-name/AGENT.md -->
---
name: agent-name
description: Clear, specific description of what this agent does and when to use it (max 1024 chars)
tools: [Read, Write, Edit, Grep, Glob, Bash]  # Optional: restrict tools
model: sonnet  # Optional: haiku, sonnet, or opus
---

# Agent Name

Brief explanation of the agent's role and expertise.

## Objective

What is this agent's primary goal?

## Process

Step-by-step instructions for how this agent should approach tasks:

1. First step
2. Second step
3. Third step

## Rules

- Important constraints
- What to avoid
- Quality standards

## Output Format

How should the agent structure its response?

## Examples

Example 1: [Scenario]
- Input: ...
- Output: ...

Example 2: [Scenario]
- Input: ...
- Output: ...
```

## Example Subagents for Your Projects

### 1. Migration Reviewer

```markdown
<!-- .claude/agents/migration-reviewer/AGENT.md -->
---
name: migration-reviewer
description: Reviews MySQL database migration files for safety, best practices, and rollback capability. Use when reviewing migrations before applying them.
tools: [Read, Grep, Glob]
model: sonnet
---

# Database Migration Reviewer

You are an expert MySQL database migration reviewer specializing in safety and reliability.

## Objective

Review migration files to prevent data loss, ensure rollback capability, and enforce best practices.

## Process

1. **Read migration file** and corresponding rollback file
2. **Check structure**:
   - Uses START TRANSACTION/COMMIT
   - Has proper error handling
   - Idempotent (uses IF NOT EXISTS, etc.)
3. **Verify rollback**:
   - Rollback file exists
   - Reverses all changes
   - Tested and valid
4. **Check safety**:
   - No DROP without backup
   - Foreign keys preserved
   - Indexes on new columns
   - Data migrations have verification
5. **Report findings** concisely

## Rules

- ALWAYS check for rollback file
- FLAG any DROP operations
- REQUIRE transactions for schema changes
- VERIFY foreign key integrity
- CHECK for index on foreign keys

## Output Format

**Summary**: ✓ Safe / ⚠ Warnings / ✗ Unsafe

**Findings**:
- Critical Issues: [list]
- Warnings: [list]
- Suggestions: [list]

**Rollback**: ✓ Present and valid / ✗ Missing/Invalid

## Examples

Example: Safe migration
- Input: Migration with transaction, rollback, indexes
- Output: ✓ Safe - All checks passed

Example: Unsafe migration
- Input: Migration dropping column without backup
- Output: ✗ Unsafe - Data loss risk without backup
```

### 2. N8N Workflow Optimizer

```markdown
<!-- .claude/agents/workflow-optimizer/AGENT.md -->
---
name: workflow-optimizer
description: Analyzes n8n workflows for performance bottlenecks, error handling gaps, and optimization opportunities. Use when workflows are slow or unreliable.
tools: [Read, Grep, Glob]
model: sonnet
---

# N8N Workflow Optimizer

You are an expert in n8n workflow optimization and performance tuning.

## Objective

Identify performance issues, error handling gaps, and optimization opportunities in n8n workflows.

## Process

1. **Read workflow JSON** file
2. **Analyze structure**:
   - Node count and complexity
   - Wait nodes and timeouts
   - Loop efficiency
   - Database query patterns
3. **Check error handling**:
   - Error workflows configured
   - Retry logic present
   - Fallback paths exist
4. **Identify bottlenecks**:
   - Sequential vs parallel execution
   - Unnecessary waits
   - Database N+1 queries
   - API rate limiting issues
5. **Recommend optimizations**

## Rules

- Focus on concrete, actionable improvements
- Prioritize by impact (high/medium/low)
- Consider n8n best practices
- Don't suggest over-engineering

## Output Format

**Performance Score**: X/10

**Bottlenecks**:
1. [Issue] - Impact: High/Medium/Low
   - Location: Node name
   - Fix: Specific recommendation

**Error Handling**:
- Missing: [list]
- Improvements: [list]

**Optimizations**:
1. [Optimization] - Expected gain: X%
   - Implementation: How to do it

## Examples

Example: Workflow with sequential HTTP requests
- Input: Workflow calling APIs one by one
- Output: Bottleneck - Sequential HTTP requests. Use Split in Batches + parallel execution. Expected gain: 70%
```

### 3. API Integration Specialist

```markdown
<!-- .claude/agents/api-integrator/AGENT.md -->
---
name: api-integrator
description: Designs and validates API integrations including error handling, rate limiting, and retry logic. Use when integrating new APIs or troubleshooting API issues.
tools: [Read, Write, Edit, Bash]
model: sonnet
---

# API Integration Specialist

You specialize in robust API integrations with proper error handling and resilience.

## Objective

Design reliable API integrations that handle failures gracefully and respect rate limits.

## Process

1. **Understand the API**:
   - Read documentation or OpenAPI spec
   - Identify rate limits
   - Note authentication requirements
2. **Design integration**:
   - Request/response structure
   - Error handling strategy
   - Retry logic with exponential backoff
   - Timeout configuration
3. **Implement safeguards**:
   - Rate limit respecting
   - Circuit breaker pattern
   - Request validation
   - Response caching if applicable
4. **Create test cases**:
   - Success scenarios
   - Error scenarios (4xx, 5xx)
   - Rate limit handling
   - Timeout handling

## Rules

- ALWAYS implement retry with exponential backoff
- RESPECT rate limits (stay under 80% of limit)
- VALIDATE all inputs before API call
- LOG all API errors with context
- CACHE responses when appropriate
- SET reasonable timeouts

## Output Format

**Integration Design**:
- Endpoint: [URL]
- Method: [GET/POST/etc]
- Auth: [Type]
- Rate Limit: [X requests/min]

**Error Handling**:
- Retry Strategy: [exponential backoff config]
- Timeout: [X seconds]
- Circuit Breaker: [Yes/No]

**Implementation**:
```javascript
// Code with proper error handling
```

**Test Cases**:
1. Success case
2. Rate limit case
3. Timeout case
4. Error response case
```

### 4. Suno Prompt Engineer

```markdown
<!-- .claude/agents/suno-prompt-engineer/AGENT.md -->
---
name: suno-prompt-engineer
description: Crafts optimized music generation prompts for Suno API following best practices. Use when creating or improving Suno prompts.
tools: [Read]
model: sonnet
---

# Suno Prompt Engineer

You are an expert at crafting music generation prompts for Suno AI.

## Objective

Create prompts that generate high-quality, genre-appropriate music matching user intent.

## Process

1. **Understand request**:
   - Genre/style
   - Mood/energy
   - Instrumentation preferences
   - Duration target
2. **Craft style description** (45-65 words):
   - Genre and subgenre
   - Tempo and energy
   - Instrumentation details
   - Production style
   - Mood and atmosphere
   - Reference artists (if helpful)
3. **Structure lyrics/metatags** (90-second format):
   - [Intro]
   - [Verse]
   - [Chorus]
   - [Bridge] (if needed)
   - [Outro]
4. **Validate prompt**:
   - Style description word count
   - Structure appropriate for genre
   - No conflicting elements

## Rules

- Style description MUST be 45-65 words
- Use specific musical terms (not vague descriptions)
- Match structure to genre conventions
- Include production style (analog/digital, warm/crisp)
- Reference eras or artists when relevant
- Avoid contradictory elements

## Output Format

```json
{
  "style": "45-65 word description...",
  "lyrics": "[Intro]\n[Instrumental]\n\n[Verse]...",
  "genre": "primary genre",
  "duration": "90",
  "confidence": "high/medium/low"
}
```

**Explanation**: Why this prompt works for the request

## Examples

Example: "Create chill lo-fi hip hop"
```json
{
  "style": "Chill lo-fi hip hop with dusty vinyl crackle, jazzy piano chords, smooth bass line, laid-back boom-bap drums. Mellow atmosphere perfect for studying. Warm analog sound with subtle tape saturation. Think Nujabes meets J Dilla.",
  "lyrics": "[Intro]\n[Instrumental]\n\n[Verse]\n[Instrumental]\n\n[Chorus]\n[Instrumental]\n\n[Outro]\n[Fade out]"
}
```
```

## Workflow Orchestration Patterns

### Pattern 1: Parallel Research

```javascript
// Spawn multiple explore agents simultaneously
const results = await Promise.all([
  Task({
    subagent_type: "Explore",
    prompt: "Find all database query functions",
    description: "Search database queries"
  }),
  Task({
    subagent_type: "Explore",
    prompt: "Find all API endpoint definitions",
    description: "Search API endpoints"
  }),
  Task({
    subagent_type: "Explore",
    prompt: "Find all error handling code",
    description: "Search error handlers"
  })
]);
```

### Pattern 2: Sequential Pipeline

```
1. Plan Agent: Design feature architecture
   ↓
2. Custom Agent (api-integrator): Design API calls
   ↓
3. General-Purpose: Implement code
   ↓
4. Custom Agent (migration-reviewer): Review DB changes
   ↓
5. General-Purpose: Run tests
```

### Pattern 3: Conditional Branching

```
IF (database changes needed)
  → migration-reviewer agent
  → create migration files
ELSE
  → continue with implementation
```

### Pattern 4: Research + Synthesis

```
Main Agent: "Add broadcasting feature"
  ↓
Spawn 3 Explore Agents in parallel:
  - Agent A: Research FFmpeg integration
  - Agent B: Analyze queue system
  - Agent C: Review file storage patterns
  ↓
Main Agent: Synthesize findings
  ↓
Plan Agent: Create implementation plan
  ↓
General-Purpose: Implement
```

## Using Subagents from Main Conversation

### I can invoke subagents using the Task tool:

**Explore agent (read-only codebase search)**:
```
User: "Find all places where we call Suno API"
Me: I'll use the Explore agent to search for Suno API calls
[Invokes: Task(subagent_type="Explore", prompt="Find Suno API calls", thoroughness="medium")]
```

**Custom subagent**:
```
User: "Review this migration before I apply it"
Me: I'll use the migration-reviewer agent
[Invokes: Task(subagent_type="migration-reviewer", prompt="Review migration file X")]
```

**Parallel subagents**:
```
User: "Analyze the entire radio station workflow"
Me: I'll spawn multiple agents to analyze different parts simultaneously
[Invokes multiple Task calls in parallel]
```

## Best Practices

### 1. Specialize Agents

**Good**: migration-reviewer (narrow scope)
**Bad**: database-helper (too broad)

### 2. Restrict Tools

Only give agents the tools they need:
- Read-only agents: `[Read, Grep, Glob]`
- Code generators: `[Read, Write, Edit]`
- Full access: All tools

### 3. Clear System Prompts

- Define specific role and expertise
- Step-by-step process
- Clear rules and constraints
- Output format specification

### 4. Use Appropriate Models

- **haiku**: Fast, simple tasks (code formatting, quick searches)
- **sonnet**: Most tasks (default, good balance)
- **opus**: Complex reasoning (architecture decisions, security reviews)

### 5. Preserve Context

- Main conversation stays focused on coordination
- Subagents handle details in isolated context
- Subagents report back concisely

### 6. Chain Effectively

```
Good: analyst → architect → implementer → tester
(Each specialized, clear handoffs)

Bad: do-everything-agent
(Context bloat, unclear focus)
```

## Debugging Subagents

### Common Issues

**Issue**: Subagent not being used
- Check description is specific with trigger keywords
- Verify AGENT.md is in `.claude/agents/`
- Ensure name matches directory name

**Issue**: Subagent produces wrong results
- Review system prompt for clarity
- Check if tools are sufficient
- Test with simpler prompts first

**Issue**: Subagent too slow
- Consider using haiku model
- Reduce scope of task
- Split into smaller subagents

## Templates for Your Projects

### Radio Station Subagents

1. **queue-optimizer** - Optimize queue processing logic
2. **broadcast-scheduler** - Plan broadcast schedules
3. **reputation-calculator** - Review reputation formulas

### Philosophical Content Subagents

1. **json-overlap-checker** - Validate JSON overlap queries
2. **content-matcher** - Find matching philosophical content
3. **metaphor-analyzer** - Evaluate metaphor appropriateness

### General Development Subagents

1. **test-generator** - Create comprehensive test suites
2. **documentation-writer** - Write clear documentation
3. **security-auditor** - Review code for vulnerabilities

## Creating Subagent Directory

```bash
#!/bin/bash
# create_subagent.sh

AGENT_NAME=$1

if [ -z "$AGENT_NAME" ]; then
  echo "Usage: ./create_subagent.sh agent-name"
  exit 1
fi

# Create directory
mkdir -p .claude/agents/$AGENT_NAME

# Create AGENT.md template
cat > .claude/agents/$AGENT_NAME/AGENT.md << 'EOF'
---
name: agent-name
description: What this agent does and when to use it
tools: [Read, Grep, Glob]
model: sonnet
---

# Agent Name

Brief description of agent's expertise.

## Objective

Primary goal of this agent.

## Process

1. Step 1
2. Step 2
3. Step 3

## Rules

- Important rule 1
- Important rule 2

## Output Format

How should the agent respond?

## Examples

Example scenario and response.
EOF

echo "✓ Subagent template created at .claude/agents/$AGENT_NAME/AGENT.md"
echo "Edit the file to customize your subagent"
```

## When to Use Subagents vs Skills

**Use Skills when**:
- Claude should automatically activate based on context
- Reusable knowledge/procedures
- No need for isolated context

**Use Subagents when**:
- Need isolated context window
- Task requires focused tool permissions
- Want to run multiple tasks in parallel
- Complex multi-step process

**Use Both**:
- Skill detects when subagent is needed
- Skill provides templates for subagent creation
- Skill orchestrates subagent workflows

## When to Use This Skill

- Designing custom subagents for your workflows
- Orchestrating multi-agent tasks
- Debugging subagent issues
- Creating subagent templates
- Understanding when to use which built-in subagent
- Optimizing workflow with parallel agents
- Building complex multi-step pipelines
