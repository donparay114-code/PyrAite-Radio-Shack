# 🎵 PYrte Radio Shack

> **AI-Powered Multi-Channel Community Radio Platform**

A full-stack platform that accepts music generation prompts via WhatsApp and Telegram, generates tracks using Suno API, and broadcasts them on genre-specific live radio channels. Premium users can create private channels for their communities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://www.postgresql.org/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [License](#-license)

---

## ✨ Features

### Core Features
- **Multi-Channel Broadcasting**: Genre-based public channels (Rap, Jazz, Lo-Fi, Electronic, Rock, Classical, Indie, Pop, Country, R&B)
- **Private Premium Channels**: Paying users can create isolated channels for their communities
- **AI Music Generation**: Integration with Suno API for track generation
- **Multi-Platform Input**: Accept prompts via WhatsApp and Telegram
- **Real-Time Updates**: Live now-playing info and queue status via Socket.io
- **HLS Streaming**: Adaptive bitrate streaming with CloudFront CDN

### Advanced Moderation
- **4-Layer AI Moderation**:
  1. Prompt injection detection
  2. OpenAI Moderation API
  3. Claude contextual analysis
  4. Local blocklist
- **Moderator Controls**: Toggle moderation, adjust strictness, allow explicit lyrics
- **Manual Review**: Moderators can approve/reject flagged content
- **Three-Strike System**: Automatic timeouts for policy violations

### Queue Management
- **Smart Priority**: Wait time + reputation + premium status
- **Weighted Selection**: Top 5 candidates with probabilistic selection
- **Fair Play**: Recent play penalty to avoid spam

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.4+
- **Database**: PostgreSQL 14 (AWS RDS Multi-AZ)
- **Cache**: Redis 7 (AWS ElastiCache)
- **Workflow**: n8n (queue mode with Redis)

### Frontend
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS + Custom Design System
- **Real-Time**: Socket.io Client
- **Streaming**: HLS.js for adaptive streaming

### Streaming
- **Encoder**: Liquidsoap 2.0+
- **Server**: Icecast 2
- **CDN**: AWS CloudFront
- **Storage**: AWS S3 with lifecycle policies

### AI Services
- **Music Generation**: Suno API
- **Moderation**: OpenAI Moderation API + Anthropic Claude
- **Genre Classification**: Anthropic Claude Sonnet 4

### Infrastructure
- **Cloud**: AWS (VPC, RDS, ElastiCache, S3, CloudFront)
- **IaC**: Terraform
- **Containers**: Docker + Docker Compose

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 14+ (or use Docker)
- Redis 7+ (or use Docker)
- AWS Account (for production)
- API Keys:
  - Anthropic API key
  - OpenAI API key
  - Suno API key
  - Telegram Bot Token
  - WhatsApp API credentials

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/donparay114-code/PYrte-Radio-Shack.git
   cd PYrte-Radio-Shack
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start services with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

7. **Access the application**:
   - Frontend: http://localhost:3000
   - n8n: http://localhost:5678 (admin/admin)
   - Icecast: http://localhost:8000

---

## 💻 Development

### Project Structure

```
PYrte-Radio-Shack/
├── .claude/                    # Claude Code configuration
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   ├── lib/                    # Utilities and helpers
│   ├── hooks/                  # React hooks
│   ├── types/                  # TypeScript types
│   └── styles/                 # Global styles
├── database/
│   ├── migrations/             # SQL migration files
│   └── seeds/                  # Seed data
├── n8n-workflows/              # n8n workflow JSONs
├── infrastructure/
│   ├── terraform/              # AWS infrastructure
│   ├── docker/                 # Docker configs
│   └── liquidsoap/             # Streaming configs
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

### Available Scripts

```bash
# Development
npm run dev                     # Start dev server
npm run build                   # Build for production
npm run start                   # Start production server

# Database
npm run db:migrate              # Run migrations
npm run db:seed                 # Seed database

# Code Quality
npm run lint                    # Lint code
npm run type-check              # TypeScript check
npm run format                  # Format with Prettier
```

---

## 🌐 Deployment

### Production Deployment (AWS)

1. **Set up AWS infrastructure**:
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Deploy Next.js app** to Railway/Vercel/AWS ECS

3. **Deploy n8n** to AWS ECS with queue mode

4. **Set up Liquidsoap + Icecast** on EC2

5. **Import n8n workflows** from `n8n-workflows/` directory

See `docs/DEPLOYMENT.md` for detailed deployment guide.

---

## 📡 API Documentation

### Channels API

#### GET `/api/channels`
List all radio channels

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Rap Radio",
      "slug": "rap",
      "genre": "Rap",
      "listenerCount": 1234
    }
  ]
}
```

#### POST `/api/channels`
Create new private channel (premium only)

### Moderation API

#### GET `/api/moderation/pending`
Get flagged content awaiting review

#### POST `/api/moderation/review`
Approve or reject flagged content

See full API documentation in each route file.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Suno AI** for music generation API
- **Anthropic** for Claude API
- **OpenAI** for moderation API
- **Liquidsoap** for streaming capabilities
- **n8n** for workflow automation

---

Built with ❤️ for the community
