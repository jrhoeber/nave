from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI

from app.config import settings
from app.routers import auth, feed, friends, notifications, parishes, posts, prayer_groups, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(settings.database_url)
    yield
    await app.state.pool.close()


app = FastAPI(title="NaveAPI", version="0.1.0", lifespan=lifespan)

app.include_router(auth.router,           prefix="/auth",           tags=["auth"])
app.include_router(users.router,          prefix="/users",          tags=["users"])
app.include_router(feed.router,           prefix="/feed",           tags=["feed"])
app.include_router(posts.router,          prefix="/posts",          tags=["posts"])
app.include_router(prayer_groups.router,  prefix="/prayer-groups",  tags=["prayer-groups"])
app.include_router(friends.router,        prefix="/friends",        tags=["friends"])
app.include_router(parishes.router,       prefix="/parishes",       tags=["parishes"])
app.include_router(notifications.router,  prefix="/notifications",  tags=["notifications"])


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
