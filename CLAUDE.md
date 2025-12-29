# PYrte Radio Shack - Claude Code Guide

This file provides context and guidelines for Claude Code when working on this project.

## Project Overview

PYrte Radio Shack is a Python project. Claude Code has been configured with comprehensive skills, sub-agents, and slash commands to assist with development.

## Available Skills

Claude has access to the following domain skills:

| Skill | Description |
|-------|-------------|
| `python-development` | Expert Python development with best practices |
| `testing` | Comprehensive testing with pytest |
| `documentation` | Technical documentation writing |
| `api-development` | RESTful API design and implementation |
| `security` | Security auditing and vulnerability detection |
| `debugging` | Systematic debugging and troubleshooting |

## Available Sub-Agents

Specialized agents for delegated tasks:

| Agent | Role |
|-------|------|
| `code-reviewer` | Review code for security, performance, and quality |
| `test-engineer` | Write comprehensive tests |
| `documentation-writer` | Create technical documentation |
| `security-auditor` | Perform security audits |
| `performance-optimizer` | Profile and optimize code |
| `refactoring-specialist` | Improve code structure |
| `database-specialist` | Database design and optimization |
| `devops-engineer` | CI/CD and infrastructure |

## Slash Commands

### Tools
- `/tools:create-api` - Generate API endpoints
- `/tools:add-test` - Generate tests for a file
- `/tools:security-scan` - Scan for vulnerabilities
- `/tools:generate-docs` - Generate documentation

### Workflows
- `/workflows:feature` - Feature development process
- `/workflows:bugfix` - Bug fix process
- `/workflows:refactor` - Refactoring process
- `/workflows:review` - Code review process

## Directory Structure

```
PYrte-Radio-Shack/
├── .claude/                  # Claude Code configuration
│   ├── settings.json         # Permissions and hooks
│   ├── skills/               # Domain expertise
│   ├── agents/               # Specialized sub-agents
│   └── commands/             # Slash commands
├── src/                      # Source code (to be created)
├── tests/                    # Test files (to be created)
├── docs/                     # Documentation (to be created)
├── README.md                 # Project readme
└── CLAUDE.md                 # This file
```

## Development Guidelines

### Code Style
- Follow PEP 8 for Python code
- Use type hints for all function signatures
- Write docstrings for public APIs
- Keep functions focused and small

### Testing
- Write tests for all new features
- Aim for 80%+ code coverage
- Use pytest as the testing framework
- Follow the AAA pattern (Arrange, Act, Assert)

### Security
- Never commit secrets or credentials
- Use environment variables for configuration
- Validate all user input
- Use parameterized queries for databases

### Git Workflow
- Create feature branches from main
- Write meaningful commit messages
- Run tests before committing
- Request reviews for significant changes

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Run tests with coverage
pytest --cov=src --cov-report=html

# Format code
black src/ tests/

# Lint code
ruff check src/ tests/

# Type check
mypy src/
```

## Important Notes

- Environment files (.env) should never be committed
- Keep dependencies up to date for security
- Document breaking changes in releases
- Follow semantic versioning

## Getting Help

- Ask Claude for help with any development task
- Use slash commands for structured workflows
- Sub-agents are available for specialized tasks
- Skills provide domain expertise automatically
