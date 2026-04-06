# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nave** is a Catholic prayer community mobile app. It consists of:
- **`/api`** — FastAPI (Python 3.12) backend with async PostgreSQL (asyncpg)
- **`/app`** — React Native (TypeScript) mobile app for iOS/Android

## API Development

### Running locally

```bash
cd api
make run-local       # Docker Compose: PostgreSQL 16 + API with hot reload
make down-local      # Stop services
make clean-local     # Stop and remove volumes
```

The API auto-runs Alembic migrations and seeds parish data on startup (`entrypoint.sh`).

### Running without Docker

```bash
cd api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Database migrations

```bash
cd api
alembic upgrade head                          # Apply pending migrations
alembic revision --autogenerate -m "desc"     # Generate new migration
```

Migration files live in `api/alembic/versions/`, named with date prefix `YYYYMMDD_NNNN_desc.py`.

### Docker targets

```bash
make build     # Build production image
make dev       # Run with hot reload (non-compose)
make logs      # Tail container logs
make shell     # Open shell in running container
```

## Mobile App Development

```bash
cd app
npm install
cd ios && pod install && cd ..   # iOS native deps
npm run ios                      # Run on iOS simulator
npm run android                  # Run on Android emulator
npm run lint                     # ESLint
npm run type-check               # TypeScript check (no emit)
```

## Architecture

### API structure (`/api/app/`)

- `main.py` — FastAPI app, CORS, lifespan (connection pool init/teardown)
- `config.py` — Pydantic Settings (reads from `.env`)
- `database.py` — asyncpg connection pool helper
- `auth.py` — JWT creation/verification, bcrypt password hashing
- `dependencies.py` — `get_current_user` dependency for protected routes
- `routers/` — One file per domain: `auth`, `users`, `feed`, `posts`, `prayer_groups`, `friends`, `parishes`, `notifications`
- `models/` — Pydantic request/response schemas
- `utils/` — Shared query helpers and notification creation

### Mobile app structure (`/app/src/`)

- `screens/` — Organized by feature (auth, community, feed, parish, prayer, profile)
- `navigation/` — React Navigation stack/tab navigators
- `store/` — Zustand stores for auth, feed, prayer groups
- `lib/apiClient.ts` — Central HTTP client (base URL from `config.ts`)
- `types/` — Shared TypeScript types and navigation param types
- `theme/` — Design tokens (colors, spacing, typography)

### Database

PostgreSQL with ~10 tables: `users`, `parishes`, `friendships`, `prayer_groups`, `prayer_group_members`, `posts`, `post_reactions`, `comments`, `comment_likes`, `notifications`. All PKs are UUIDs. Parish search uses trigram (pg_trgm) indexes. Full schema in `api/schema.sql`.

### Auth flow

JWT Bearer tokens, 30-day expiry. App stores token in Zustand `authStore` → all API calls include `Authorization: Bearer <token>` header.

### Deployment

GitHub Actions (`.github/workflows/deploy-api.yml`) builds and deploys the API to Google Cloud Run. Migrations run automatically during deployment.

## Environment

API config via `.env` / `.env.local` in `api/`:
- `DATABASE_URL` — asyncpg-compatible PostgreSQL URL
- `SECRET_KEY` — JWT signing key

Mobile API base URL is set in `app/src/lib/config.ts` (localhost:8000 for dev; Android emulator uses `10.0.2.2:8000`).
