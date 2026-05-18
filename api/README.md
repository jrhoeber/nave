# naveapi

FastAPI backend for Nave — a Catholic prayer community app.

## Prerequisites

- Docker and Docker Compose (recommended), or Python 3.12+
- A PostgreSQL database (the project uses [Neon](https://neon.tech))

---

## Environment Variables

Create a `.env` file in the `api/` directory:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
SECRET_KEY=[32-byte hex string for JWT signing]

# Google Cloud Storage (for avatar/image uploads)
GCS_BUCKET_NAME=nave-avatars
GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/gcs-sa.json  # Docker path; see below

# Firebase Cloud Messaging (for push notifications)
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

### Google Cloud Storage — local setup

Avatar and message image uploads require a GCS service account key:

1. In GCP Console → **IAM & Admin → Service Accounts**, select the Cloud Run service account.
2. **Keys** tab → **Add Key → JSON** → download the file.
3. Place it at `api/.secrets/gcs-sa.json` (gitignored):
   ```bash
   mkdir -p api/.secrets
   mv ~/Downloads/your-key.json api/.secrets/gcs-sa.json
   ```
4. The `docker-compose.yml` mounts `.secrets/` into the container automatically.

To skip GCS locally (upload endpoints return 501), add to `api/.env.local`:
```env
GCS_ENABLED=false
```

### Firebase — local push notification setup

Push notifications require a Firebase service account key:

1. Go to **Firebase console → Project settings → Service accounts**.
2. Click **Generate new private key** → download the JSON file.
3. Compact it to a single line and add it to `api/.env`:
   ```bash
   cat ~/Downloads/firebase-key.json \
     | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))"
   ```
   Paste the output as the value of `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env`.

To skip Firebase locally (push notifications silently no-op), omit the variable or leave it empty:
```env
FIREBASE_SERVICE_ACCOUNT_JSON=
```

---

## Running Locally

### Option 1: Docker Compose (recommended)

Starts PostgreSQL 16 and the API together with hot reload. Migrations run automatically on startup.

```bash
make run-local    # Start PostgreSQL + API on http://localhost:8000
make down-local   # Stop services
make clean-local  # Stop and remove volumes (resets the database)
```

Other useful commands:

```bash
make logs    # Tail API container logs
make shell   # Open a shell in the running API container
make build   # Build the production Docker image
```

### Option 2: Python virtual environment

Requires a PostgreSQL database already running and `DATABASE_URL` set.

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head            # Apply database migrations
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Database Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Generate a new migration from schema changes
alembic revision --autogenerate -m "short description"
```

Migration files live in `alembic/versions/`, named `YYYYMMDD_NNNN_description.py`.

When using Docker Compose (`make run-local`), migrations run automatically on startup via `entrypoint.sh`.

---

## API Docs

Once running, the auto-generated docs are available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health
