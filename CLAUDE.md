# PYrte Radio Shack - Claude Code Guide

This file provides context and guidelines for Claude Code when working on this project.

## Project Overview

PYrte Radio Shack is an AI-powered community radio station built with Python, n8n workflows, and Suno AI for music generation. Claude Code has been configured with comprehensive skills, sub-agents, and slash commands to assist with development.

## Available Skills (71 Total)

Claude has access to domain expertise skills organized by category:

### Music & Audio
| Skill | Description |
|-------|-------------|
| `music-theory-agent` | Music production, genre taxonomy, Suno/Udio prompt engineering |
| `audio-architect` | Liquidsoap scripting, FFmpeg transcoding, streaming |
| `suno-music-helper` | Suno API integration and prompt optimization |
| `music-metadata-analyzer` | Audio file metadata extraction and analysis |
| `audio-quality-validator` | Audio file quality validation for broadcast |
| `ffmpeg-audio-processor` | FFmpeg audio processing commands |
| `ffmpeg-video-processor` | FFmpeg video processing commands |

### n8n & Automation
| Skill | Description |
|-------|-------------|
| `flow-orchestrator` | n8n workflow architecture and JavaScript Code nodes |
| `n8n-radio-station` | Radio station n8n workflow management |
| `n8n-workflow-automation` | General n8n workflow automation |
| `n8n-workflow-helper` | n8n workflow patterns and best practices |
| `n8n-workflow-manager` | Workflow lifecycle management |

### Database & Backend
| Skill | Description |
|-------|-------------|
| `mysql-query-helper` | MySQL queries and JSON functions |
| `mysql-database-operations` | Database CRUD operations |
| `database-migrator` | Schema migrations and versioning |
| `database-migrations-seeding` | Migration and seed data management |
| `redis-cache-helper` | Redis caching patterns |

### Security & Moderation
| Skill | Description |
|-------|-------------|
| `moderation-sentinel` | Prompt injection detection, content safety |
| `content-moderation-assistant` | Content filtering and safety |
| `security` | Security auditing and vulnerability detection |

### Development
| Skill | Description |
|-------|-------------|
| `python-development` | Python best practices and patterns |
| `api-development` | RESTful API design with FastAPI/Flask |
| `testing` | Pytest testing framework |
| `debugging` | Systematic debugging and troubleshooting |
| `documentation` | Technical documentation writing |
| `ui-virtuoso` | Premium frontend with React, Tailwind, Framer Motion |
| `nextjs-development` | Next.js application development |

### Infrastructure
| Skill | Description |
|-------|-------------|
| `infrastructure-warden` | AWS, Terraform, Docker, secure networking |
| `deployment-helper` | Railway, Render, VPS deployment |
| `vps-deployment-devops` | VPS configuration and management |
| `environment-setup` | Development environment setup |

### Analytics & Optimization
| Skill | Description |
|-------|-------------|
| `broadcast-analytics-specialist` | Radio listener analytics |
| `cost-optimization-advisor` | API cost tracking and optimization |
| `queue-intelligence-optimizer` | Queue priority optimization |
| `playlist-optimization-engine` | Music playlist optimization |

### Content & Media
| Skill | Description |
|-------|-------------|
| `video-prompt-engineering` | Text-to-video prompt optimization |
| `philosophical-content` | Philosophical content generation |
| `content-extractor` | Content extraction and summarization |

### Utilities
| Skill | Description |
|-------|-------------|
| `code-reviewer` | Code review and best practices |
| `commit-helper` | Git commit message generation |
| `git-workflow-enhanced` | Advanced Git workflows |
| `log-analyzer` | Log analysis and troubleshooting |
| `api-tester` | API endpoint testing |
| `webhook-tester` | Webhook testing and validation |
| `metrics-calculator` | Performance and engagement metrics |

*See `.claude/skills/` for complete list of 71 skills.*

## Available Sub-Agents (70 Total)

Specialized agents for delegated tasks:

### Core Development Agents
| Agent | Role |
|-------|------|
| `code-reviewer` | Review code for security, performance, quality |
| `test-engineer` | Write comprehensive tests |
| `documentation-writer` | Create technical documentation |
| `security-auditor` | Perform security audits |
| `performance-optimizer` | Profile and optimize code |
| `refactoring-specialist` | Improve code structure |
| `database-specialist` | Database design and optimization |
| `devops-engineer` | CI/CD and infrastructure |

### Music & Audio Agents
| Agent | Role |
|-------|------|
| `suno-prompt-engineer` | Craft Suno music prompts |
| `music-playlist-curator` | Curate and optimize playlists |
| `audio-quality-checker` | Validate audio file quality |
| `audio-editor-specialist` | Audio editing with FFmpeg |
| `ffmpeg-audio-processor` | FFmpeg audio commands |

### Video & Media Agents
| Agent | Role |
|-------|------|
| `video-prompt-engineer` | Text-to-video prompts |
| `hailuo-video-prompter` | Hailuo-specific video prompts |
| `google-veo-prompter` | Google Veo video prompts |
| `minimax-prompter` | Minimax video prompts |
| `video-editing-specialist` | Video editing with FFmpeg |
| `camera-movement-specialist` | Cinematic camera work design |
| `visual-style-designer` | Visual aesthetics and mood |
| `scene-descriptor` | Detailed scene descriptions |
| `thumbnail-designer` | Video thumbnail design |
| `image-to-video-specialist` | Image to video conversion |

### Content Agents
| Agent | Role |
|-------|------|
| `content-repurposer` | Transform content for multiple formats |
| `micro-content-creator` | Create bite-sized content |
| `viral-content-analyzer` | Analyze viral potential |
| `brand-voice-specialist` | Maintain brand consistency |
| `voiceover-script-writer` | Write voiceover scripts |
| `story-arc-designer` | Plan narrative structures |
| `podcast-producer` | Podcast production workflows |

### Analytics & Optimization Agents
| Agent | Role |
|-------|------|
| `engagement-analyzer` | Analyze content performance |
| `user-behavior-analyst` | User interaction patterns |
| `broadcast-scheduler` | Optimize broadcast schedules |
| `queue-optimizer` | Queue processing optimization |
| `queue-priority-calculator` | Priority formula validation |
| `workflow-optimizer` | n8n workflow optimization |
| `performance-profiler` | Performance bottleneck analysis |
| `llm-cost-optimizer` | LLM API cost optimization |
| `ab-test-designer` | A/B test design and analysis |
| `ai-response-evaluator` | Evaluate AI output quality |

### Infrastructure Agents
| Agent | Role |
|-------|------|
| `n8n-workflow-designer` | Design n8n workflows |
| `api-integrator` | API integration design |
| `api-integration-architect` | Complex API system design |
| `webhook-security-specialist` | Webhook security |
| `redis-caching-specialist` | Redis optimization |
| `backup-validator` | Backup validation |
| `deployment-validator` | Pre-deployment validation |
| `monitoring-alerting-specialist` | Monitoring setup |
| `migration-reviewer` | Database migration review |

### Documentation Agents
| Agent | Role |
|-------|------|
| `technical-writer` | Technical documentation |
| `changelog-generator` | Generate changelogs from commits |
| `release-notes-generator` | Generate release notes |
| `runbook-creator` | Create operational runbooks |
| `error-message-writer` | Write helpful error messages |

### Quality & Validation Agents
| Agent | Role |
|-------|------|
| `test-generator` | Generate test suites |
| `security-scanner` | Scan for vulnerabilities |
| `json-schema-validator` | Validate JSON schemas |
| `storyboard-quality-checker` | Check storyboard quality |
| `philosophical-consistency-validator` | Validate philosophical content |
| `philosophical-writing-analyst` | Analyze writing quality |
| `content-matcher` | Match content combinations |
| `metaphor-appropriateness-checker` | Validate metaphor usage |
| `error-pattern-analyzer` | Analyze error patterns |

### Social & Marketing Agents
| Agent | Role |
|-------|------|
| `social-media-optimizer` | Social media content optimization |
| `seo-content-optimizer` | SEO optimization |
| `telegram-bot-flow-designer` | Telegram bot UX design |

### Specialized Agents
| Agent | Role |
|-------|------|
| `prompt-library-manager` | Manage prompt templates |
| `multi-model-router` | Route tasks to optimal models |
| `database-query-optimizer` | Optimize database queries |
| `nano-banana-pro-specialist` | Nano Banana Pro video AI |

*See `.claude/agents/` for complete list of 70 agents.*

## Slash Commands

### Tools
| Command | Description |
|---------|-------------|
| `/tools:create-api` | Generate API endpoints with models and tests |
| `/tools:add-test` | Generate tests for a file or function |
| `/tools:security-scan` | Scan codebase for vulnerabilities |
| `/tools:generate-docs` | Generate documentation for modules |

### Workflows
| Command | Description |
|---------|-------------|
| `/workflows:feature` | Start structured feature development |
| `/workflows:bugfix` | Start structured bug fixing |
| `/workflows:refactor` | Start structured refactoring |
| `/workflows:review` | Perform comprehensive code review |

## Directory Structure

```
PYrte-Radio-Shack/
├── .claude/                    # Claude Code configuration
│   ├── settings.json           # Permissions and hooks
│   ├── skills/                 # 71 domain expertise skills
│   ├── agents/                 # 70 specialized sub-agents
│   └── commands/               # 8 slash commands
├── src/                        # Source code
│   ├── api/                    # API endpoints
│   ├── services/               # Business logic
│   ├── models/                 # Data models
│   └── utils/                  # Utilities
├── tests/                      # Test files
├── docs/                       # Documentation
├── n8n_workflows/              # n8n workflow exports
├── sql/                        # Database migrations
├── README.md                   # Project readme
└── CLAUDE.md                   # This file
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

## Radio Station Specific

### n8n Workflows
The radio station uses 4 integrated n8n workflows:
1. **AI Radio Bot** - Telegram song request handler
2. **Queue Processor** - Suno music generation
3. **Radio Director** - DJ intros and broadcasting
4. **Reputation Calculator** - User reputation management

### Database
MySQL database `radio_station` with tables:
- `radio_users` - User accounts and reputation
- `song_requests` - Song request history
- `radio_queue` - Active generation queue
- `radio_history` - Broadcast history
- `moderation_logs` - Content moderation
- `user_reputation_log` - Reputation changes

### Key Skills for Radio Development
- `n8n-radio-station` - Workflow management
- `music-theory-agent` - Music prompt engineering
- `suno-music-helper` - Suno API integration
- `audio-architect` - Liquidsoap and FFmpeg
- `moderation-sentinel` - Content safety

## Important Notes

- Environment files (.env) should never be committed
- Keep dependencies up to date for security
- Document breaking changes in releases
- Follow semantic versioning
- Use skills and agents for specialized tasks

## Getting Help

- Ask Claude for help with any development task
- Use `/skill <name>` for domain expertise
- Use slash commands for structured workflows
- Sub-agents are available via Task tool
