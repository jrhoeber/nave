IMAGE_NAME := naveapi
CONTAINER_NAME := naveapi
PORT := 8000

# Google Cloud settings — override via environment or CLI: make deploy PROJECT_ID=my-project
PROJECT_ID ?= $(shell gcloud config get-value project 2>/dev/null)
REGION     ?= us-central1
REGISTRY   := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/naveapi/$(IMAGE_NAME)

.PHONY: build run dev stop logs shell clean push deploy local local-down local-clean

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run --rm --name $(CONTAINER_NAME) -p $(PORT):8000 \
		--env-file .env \
		-v $(PWD)/app:/app/app \
		$(IMAGE_NAME) uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app/app

stop:
	docker stop $(CONTAINER_NAME)

logs:
	docker logs -f $(CONTAINER_NAME)

shell:
	docker exec -it $(CONTAINER_NAME) /bin/sh

clean:
	docker rmi $(IMAGE_NAME)

# ── Local dev (Docker Compose + local Postgres) ───────────────────────────────
local:
	docker compose up --build

local-down:
	docker compose down

local-clean:
	docker compose down -v
