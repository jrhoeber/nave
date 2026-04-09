# naveapi

FastAPI backend for Nave — a Catholic prayer community app.

## Prerequisites

- Docker (recommended), or Python 3.12+
- A PostgreSQL database (the project uses [Neon](https://neon.tech))

## Environment Variables

Create a `.env` file in the `api/` directory:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
SECRET_KEY=[32-byte hex string for JWT signing]

# Google Cloud Storage (for avatar uploads)
GCS_BUCKET_NAME=nave-avatars
GOOGLE_APPLICATION_CREDENTIALS=/app/.secrets/gcs-sa.json  # Docker path; see below
```

### Google Cloud Storage — local setup

Avatar uploads require a GCS service account key. To set it up locally:

1. In GCP Console → **IAM & Admin → Service Accounts**, select the Cloud Run service account.
2. **Keys** tab → **Add Key** → **JSON** → download the file.
3. Place it at `api/.secrets/gcs-sa.json` (this directory is gitignored):
   ```bash
   mkdir -p api/.secrets
   mv ~/Downloads/your-key.json api/.secrets/gcs-sa.json
   ```
4. The `docker-compose.yml` mounts `.secrets/` into the container automatically.

To skip GCS locally (avatar upload endpoint returns 503), add to `api/.env.local`:
```env
GCS_ENABLED=false
```

## Database Setup (first time only)

Run the schema against your database to create all tables:

```bash
psql $DATABASE_URL -f schema.sql
```

## Running Locally

### Option 1: Docker (recommended)

```bash
make build   # Build the Docker image
make dev     # Run with hot reload on http://localhost:8000
```

Other useful Docker commands:

```bash
make run     # Run without hot reload (production-like)
make logs    # Tail container logs
make shell   # Open a shell in the running container
make stop    # Stop the container
make clean   # Remove the Docker image
```

### Option 2: Python virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Docs

Once running, the auto-generated docs are available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health
