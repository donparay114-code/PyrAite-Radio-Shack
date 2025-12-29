# Claude Code Slash Commands

This directory contains custom slash commands for Claude Code.

## Available Commands

### Tools

| Command | Description |
|---------|-------------|
| `/tools:create-api` | Generate a new API endpoint with models and tests |
| `/tools:add-test` | Generate comprehensive tests for a file or function |
| `/tools:security-scan` | Scan codebase for security vulnerabilities |
| `/tools:generate-docs` | Generate documentation for modules or project |

### Workflows

| Command | Description |
|---------|-------------|
| `/workflows:feature` | Start structured feature development process |
| `/workflows:bugfix` | Start structured bug fixing process |
| `/workflows:refactor` | Start structured refactoring process |
| `/workflows:review` | Perform comprehensive code review |

## Usage

Type the command followed by any required arguments:

```
/tools:create-api POST /users Create a new user
/workflows:feature Add user authentication
/workflows:review src/api/
```

## Creating New Commands

1. Create a new `.md` file in the appropriate directory
2. Start with a `#` heading describing the command
3. Include usage examples
4. Add instructions for Claude

### Command File Structure

```markdown
# Command Name

Description of what the command does.

## Usage
\`\`\`
/category:command <args>
\`\`\`

## Examples
\`\`\`
/category:command example usage
\`\`\`

## Instructions for Claude

What Claude should do when this command is invoked.
```

## Directory Structure

```
commands/
├── README.md           # This file
├── tools/              # Utility commands
│   ├── create-api.md
│   ├── add-test.md
│   ├── security-scan.md
│   └── generate-docs.md
└── workflows/          # Process workflows
    ├── feature.md
    ├── bugfix.md
    ├── refactor.md
    └── review.md
```
