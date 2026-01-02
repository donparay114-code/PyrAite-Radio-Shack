# PYrte Radio Shack Architecture

This document outlines the high-level architecture and data flow of the PYrte Radio Shack system.

## System Flow Diagram

```mermaid
graph TD
    %% Users
    UserWeb([Web Listener])
    UserTG([Telegram User])

    %% Interfaces
    subgraph Frontend [Next.js Frontend]
        UI[Web Interface]
        Player[Audio Player]
    end

    subgraph Bot [Telegram Bot]
        TGHandler[Bot Handler]
    end

    %% Core System
    subgraph Backend [FastAPI Backend]
        API[API Gateway]
        Queue[Queue Manager]
        DB[(PostgreSQL)]
        FileStore[File Storage /data/songs]
    end

    %% Automation
    subgraph n8n [n8n Automation]
        QueueProc[Queue Processor]
        BroadcastDir[Broadcast Director]
        Mod[Moderation AI]
    end

    %% External Services
    subgraph External [External Services]
        Suno[Suno AI Music]
        OpenAI[OpenAI Moderation]
    end

    %% Audio Pipeline
    subgraph Audio [Audio Pipeline]
        Liquidsoap[Liquidsoap Streamer]
        Icecast[Icecast Server]
    end

    %% Flows
    UserTG -->|Request Song| TGHandler
    TGHandler -->|Check Content| Mod
    Mod -->|Validation| OpenAI
    Mod -->|Approved| API

    UserWeb -->|Request/Vote| UI
    UI -->|API Calls| API
    
    API <-->|Read/Write| DB
    API -->|Manage| Queue
    
    QueueProc -->|Poll Pending| API
    QueueProc -->|Generate Music| Suno
    Suno -->|Webhook| API
    API -->|Download & Save| FileStore
    
    BroadcastDir -->|Get Next Track| API
    BroadcastDir -->|Queue Track| Liquidsoap
    Liquidsoap -->|Read Audio| FileStore
    Liquidsoap -->|Stream| Icecast
    
    Icecast -->|HLS/MP3| Player
    Player -->|Listen| UserWeb
```

## Component Interactions

1. **Request Flow**:
    * Users submit prompts via Telegram or Web.
    * Requests are moderated (n8n + OpenAI) before entering the queue.
    * Approved requests are stored in PostgreSQL via the FastAPI Backend.

2. **Generation Flow**:
    * The **Queue Processor** (n8n) polls the API for pending requests.
    * It triggers **Suno AI** to generate audio.
    * Upon completion, Suno calls a webhook in the API.
    * The API downloads the generated audio to local storage (`/data/songs`).

3. **Broadcast Flow**:
    * The **Broadcast Director** (n8n) determines the next track from the queue.
    * It instructs **Liquidsoap** to queue the audio file.
    * Liquidsoap streams the audio to **Icecast**.
    * The Frontend connects to Icecast to play the stream for listeners.
