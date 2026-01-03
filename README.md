# PYrte Radio Shack

An AI-powered community radio station platform with comprehensive Claude Code integration for development assistance.

## Overview

PYrte Radio Shack is a Python-based AI radio station system that integrates:

- **n8n Workflow Automation** - 4 integrated workflows for music generation and broadcasting
- **Database** - PostgreSQL
- **Frontend** - Next.js 14 + Tailwind CSS
- **Backend API** - FastAPI + SQLAlchemy

- User song requests via Telegram bot
- AI-powered music generation with Suno
- Content moderation with OpenAI
- Priority queue based on user reputation
- Automated DJ intros and audio stitching
- Multi-format streaming (MP3, AAC, HLS)
- **User Authentication** - Google OAuth and Telegram WebApp login with JWT tokens
- **Live Chat** - Real-time community chat powered by Supabase Realtime
- **User Profiles** - Reputation scores, tier badges, and request history
- **Leaderboard** - Community rankings and achievements

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
| Music Generation | Suno API, Udio (via udio-wrapper) |
| Database | PostgreSQL 16+ |
| Frontend | Next.js 14 + Tailwind CSS |
| Backend API | FastAPI + SQLAlchemy |
| Authentication | Google OAuth, Telegram WebApp, JWT |
| Realtime | Supabase Realtime |
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

1. Import n8n workflows from `n8n_workflows/` directory

### Configuration

Required environment variables:

```bash
# Database (PostgreSQL)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=radio_user
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=radio_station

# APIs
SUNO_API_URL=https://your-suno-api.example.com
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC...

# Udio (alternative to Suno - get token from browser cookies)
# See: https://github.com/flowese/UdioWrapper
UDIO_AUTH_TOKEN=your-sb-api-auth-token

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

### Authentication

- `POST /api/auth/telegram` - Authenticate via Telegram WebApp
- `POST /api/auth/google` - Authenticate via Google OAuth
- `GET /api/auth/me` - Get current user from JWT token

### Queue & Requests

- `POST /api/queue/` - Submit song request
- `GET /api/queue/` - View current queue
- `GET /api/queue/stats` - Get queue statistics
- `GET /api/queue/now-playing` - Get currently playing song

### Users

- `GET /api/users/` - List users
- `GET /api/users/{id}` - Get user profile
- `GET /api/users/{id}/history` - Get user's request history
- `GET /api/users/leaderboard` - Get reputation leaderboard

### Chat

- `GET /api/chat/` - Get chat message history
- `POST /api/chat/` - Send a chat message
- `POST /api/chat/system` - Send system announcement
- `GET /api/chat/stats` - Get chat statistics

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
