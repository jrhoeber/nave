import os
import sys
from logging.config import fileConfig
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

from sqlalchemy import engine_from_config, pool
from alembic import context

# Make app package importable from the api/ root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# No SQLAlchemy models — we use raw SQL migrations, so target_metadata is None
target_metadata = None


def get_url() -> str:
    """
    Convert the asyncpg DATABASE_URL to a psycopg2-compatible URL for Alembic.
    - Swaps the driver prefix
    - Removes channel_binding (not supported by psycopg2-binary's bundled libpq)
    """
    url = settings.database_url
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    parsed = urlparse(url)
    params = {k: v[0] for k, v in parse_qs(parsed.query, keep_blank_values=True).items()}
    params.pop("channel_binding", None)
    return urlunparse(parsed._replace(query=urlencode(params)))


def run_migrations_offline() -> None:
    """Generate SQL script without a live DB connection (useful for review)."""
    context.configure(
        url=get_url(),
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        {"sqlalchemy.url": get_url()},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
