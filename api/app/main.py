import logging
import time
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import admin, admin_parishes, admin_reports, auth, blocks, friends, group_messages, notifications, parishes, prayer_groups, reports, users

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)

logger = logging.getLogger("nave.api")


# ─── App lifecycle ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Connecting to database...")
    try:
        app.state.pool = await asyncpg.create_pool(settings.database_url)
        logger.info("Database connection pool established")
    except Exception:
        logger.exception("Failed to connect to database")
        raise
    yield
    logger.info("Closing database connection pool")
    await app.state.pool.close()


app = FastAPI(title="NaveAPI", version="0.1.0", lifespan=lifespan)


# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://naveapp.co",
        "https://www.naveapp.co",
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request logging middleware ───────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "Unhandled error during %s %s (%.1fms)",
            request.method,
            request.url.path,
            duration_ms,
        )
        raise
    duration_ms = (time.perf_counter() - start) * 1000
    level = logging.WARNING if response.status_code >= 400 else logging.INFO
    logger.log(
        level,
        "%s %s → %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ─── Exception handlers ───────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Validation error on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error(
            "HTTP %d on %s %s: %s",
            exc.status_code,
            request.method,
            request.url.path,
            exc.detail,
        )
    else:
        logger.warning(
            "HTTP %d on %s %s: %s",
            exc.status_code,
            request.method,
            request.url.path,
            exc.detail,
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router,            prefix="/auth",            tags=["auth"])
app.include_router(users.router,           prefix="/users",           tags=["users"])
app.include_router(blocks.router,          prefix="/blocks",          tags=["blocks"])
app.include_router(friends.router,         prefix="/friends",         tags=["friends"])
app.include_router(prayer_groups.router,   prefix="/prayer-groups",   tags=["prayer-groups"])
app.include_router(group_messages.router,  prefix="/prayer-groups",   tags=["group-messages"])
app.include_router(parishes.router,        prefix="/parishes",        tags=["parishes"])
app.include_router(notifications.router,   prefix="/notifications",   tags=["notifications"])
app.include_router(reports.router,          prefix="/reports",          tags=["reports"])
app.include_router(admin.router,           prefix="/admin/moderation", tags=["admin"])
app.include_router(admin_parishes.router,  prefix="/admin/parishes",   tags=["admin"])
app.include_router(admin_reports.router,   prefix="/admin/reports",    tags=["admin"])


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
