# Implementation Plan - PYrte Radio Shack Stabilization

The goal of this plan is to resolve configuration discrepancies, ensure the environment is reproducible, and verify the core system components (Backend, Frontend, Database, Audio).

## User Review Required

> [!WARNING]
> **Database Mismatch**: The `README.md` specifies MySQL, but `requirements.txt` includes `psycopg2` (PostgreSQL) and `aiosqlite`. The `docker-compose.yml` likely holds the truth. I will assume **PostgreSQL** or **MySQL** based on checking `docker-compose.yml` in the next steps, but this needs a decision. I recommend **PostgreSQL** for new projects, but will follow the existing `docker-compose` definition.

## Proposed Changes

### Configuration & Environment

- [ ] **Unify Database Choice**:
  - Check `docker-compose.yml` to see what service is defined (db image).
  - Update `requirements.txt` to properly reflect the chosen DB driver (remove unused ones).
  - Update `README.md` to match the actual stack.
- [ ] **Environment Variables**:
  - Audit `.env.example` in both `root` and `frontend/` to ensure all keys required by `src/settings.py` (or equivalent) are present.

### Backend (`src/`)

- [ ] **Dependency Cleanup**:
  - Verify if `aiosqlite` is used (possibly for tests).
  - Ensure `suno-ai` or equivalent wrapper is present if used.
- [ ] **Health Check Endpoint**:
  - Ensure `src/api` has a `/health` or `/status` endpoint to verify DB and Redis connections.

### Frontend (`frontend/`)

- [ ] **API Client Config**:
  - Verify `frontend` knows where the backend is (API Base URL).

## Verification Plan

### Automated Tests

- Run `pytest` to check current test state.
- Run `npm test` or `npm run lint` in `frontend` to check for build errors.

### Manual Verification

1. **Docker Start**: Run `docker-compose up --build` and verify all containers (web, api, db, redis, liquidsoap) start healthy.
2. **Web Interface**: Access `http://localhost:3000` (or configured port) and verify the UI loads.
3. **API Check**: Access `http://localhost:8000/docs` (FastAPI Swagger) and try the `/health` endpoint.
