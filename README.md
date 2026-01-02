# PYrte Radio Shack

An AI-powered community radio station platform with comprehensive Claude Code integration for development assistance.

## Overview

PYrte Radio Shack is a Python-based AI radio station system that integrates:

- **n8n Workflow Automation** - 4 integrated workflows for music generation and broadcasting
- **Suno AI Music Generation** - Automated music creation from user prompts
- **Telegram Bot** - User interface for song requests
- **Reputation System** - Community-driven content prioritization
- **Liquidsoap Broadcasting** - Professional audio streaming

## Features

- User song requests via Telegram bot
- AI-powered music generation with Suno
- Content moderation with OpenAI
- Priority queue based on user reputation
- Automated DJ intros and audio stitching
- Multi-format streaming (MP3, AAC, HLS)

## Architecture

```
User Request (Telegram)
        |
        v
  [AI Radio Bot] --> [Moderation] --> [Queue]
        |                                |
        v                                v
  [Reputation System]           [Queue Processor]
                                        |
                                        v
                                [Suno API] --> [MP3 Download]
                                                    |
                                                    v
                                        [Radio Director]
                                                    |
                                                    v
                                        [DJ Intro + Stitch]
                                                    |
                                                    v
                                            [Broadcast]
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Workflow Automation | n8n |
| Music Generation | Suno API |
| Database | PostgreSQL |
| Frontend | Next.js + Tailwind CSS |
| Bot Interface | Telegram Bot API |
| Audio Processing | FFmpeg, Liquidsoap |
| LLM Integration | OpenAI GPT-4, Claude |
| Streaming | Icecast, HLS |

## Project Structure

```
PYrte-Radio-Shack/
├── .claude/                    # Claude Code configuration
│   ├── settings.json           # Permissions and hooks
│   ├── skills/                 # 71 domain expertise skills
│   ├── agents/                 # 70 specialized sub-agents
│   └── commands/               # Slash commands
├── src/                        # Source code
│   ├── api/                    # API endpoints
│   ├── services/               # Business logic
│   ├── models/                 # Data models
│   └── utils/                  # Utilities
├── tests/                      # Test files
├── docs/                       # Documentation
├── n8n_workflows/              # n8n workflow JSON exports
├── sql/                        # Database migrations
├── README.md                   # This file
└── CLAUDE.md                   # Claude Code guide
```

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- n8n (self-hosted or cloud)
- Suno AI access
- Telegram Bot Token
- OpenAI API key (for moderation)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/PYrte-Radio-Shack.git
cd PYrte-Radio-Shack
```

### Installation (Docker Recommended)

1. Clone the repository:

```bash
git clone https://github.com/your-org/PYrte-Radio-Shack.git
cd PYrte-Radio-Shack
```

1. Configure environment:

```bash
cp .env.example .env
# Edit .env with your credentials if needed
# Also configure frontend env
cp frontend/.env.example frontend/.env
```

1. Start with Docker Compose:

```bash
docker-compose up -d --build
```

### Access

| Service | URL | Credentials (Default) |
| :--- | :--- | :--- |
| **Frontend** | [http://localhost:3000](http://localhost:3000) | N/A |
| **API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | N/A |
| **n8n** | [http://localhost:5678](http://localhost:5678) | `admin` / `admin` |
| **Stream** | `http://localhost:8000/stream` | N/A |

### Manual Installation (Legacy)

1. Create virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Initialize database:

```bash
# Ensure you have a running Postgres instance first
python -c "from src.db.session import init_db; init_db()"
```

1. Import n8n workflows from `n8n_workflows/` directory

### Configuration

Required environment variables:

```bash
# Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=radio_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=radio_station

# APIs
SUNO_API_URL=https://your-suno-api.example.com
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1001234567890

# Icecast (optional)
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=hackme
```

## n8n Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| AI Radio Bot | Handle Telegram requests | Webhook |
| Queue Processor | Generate music via Suno | Schedule (30s) |
| Radio Director | Stitch DJ intros + broadcast | Schedule (check queue) |
| Reputation Calculator | Update user reputation | Schedule (5min) |

## Database Schema

Key tables in `radio_station` database (PostgreSQL):

- `radio_users` - User accounts and reputation
- `song_requests` - All song requests
- `radio_queue` - Active queue with priorities
- `radio_history` - Broadcast history
- `moderation_logs` - Content moderation decisions
- `user_reputation_log` - Reputation change history

## Claude Code Integration

This project includes extensive Claude Code configuration with:

- **71 Skills** - Domain expertise for music, n8n, databases, security, and more
- **70 Agents** - Specialized sub-agents for code review, testing, DevOps, etc.
- **8 Slash Commands** - Structured workflows for development

See [CLAUDE.md](CLAUDE.md) for detailed Claude Code usage guide.

## Development

### Running Tests

```bash
pytest
pytest --cov=src --cov-report=html
```

### Code Quality

```bash
# Format
black src/ tests/

# Lint
ruff check src/ tests/

# Type check
mypy src/
```

### Using Claude Code

```bash
# Start Claude Code
claude

# Use skills
/skill music-theory-agent

# Use workflows
/workflows:feature Add new API endpoint
```

## API Reference

API documentation available at `/docs` when running the server.

Key endpoints:

- `POST /api/request` - Submit song request
- `GET /api/queue` - View current queue
- `GET /api/history` - View broadcast history
- `GET /api/users/{id}/reputation` - Get user reputation

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## Acknowledgments

- [Suno AI](https://suno.ai) for music generation
- [n8n](https://n8n.io) for workflow automation
- [Liquidsoap](https://www.liquidsoap.info) for audio streaming
- [Claude Code](https://claude.ai) for development assistance
