import datetime
import logging
import time
import uuid
from io import BytesIO

from PIL import Image as PilImage

logger = logging.getLogger(__name__)

_SIGNED_URL_TTL = datetime.timedelta(days=7)
_SIGNED_URL_CACHE_TTL = 6 * 24 * 3600 + 23 * 3600  # cache for 6d23h (1h before GCS expiry)

# object_name -> (signed_url, expiry_epoch)
_signed_url_cache: dict[str, tuple[str, float]] = {}

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_AVATAR_BYTES = 5 * 1024 * 1024   # 5 MB
_AVATAR_MAX_PX = 512


def upload_avatar(file_bytes: bytes, user_id: str, content_type: str) -> str:
    """Resize to 512px-max, upload to GCS as JPEG at a unique path. Returns the object name.

    The path includes a per-upload UUID so each upload produces a fresh URL.
    Callers should best-effort delete the previous object via `delete_object` after
    the DB row is updated (see upload endpoints).
    """
    from app.config import settings
    from google.cloud import storage

    img = PilImage.open(BytesIO(file_bytes)).convert("RGB")
    img.thumbnail((_AVATAR_MAX_PX, _AVATAR_MAX_PX), PilImage.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)

    object_name = f"avatars/{user_id}/{uuid.uuid4().hex}.jpg"
    client = storage.Client()
    client.bucket(settings.gcs_bucket_name).blob(object_name).upload_from_string(
        buf.getvalue(), content_type="image/jpeg"
    )
    logger.info("Uploaded avatar to gs://%s/%s", settings.gcs_bucket_name, object_name)
    return object_name


def upload_message_image(file_bytes: bytes, group_id: str, message_id: str, content_type: str) -> str:
    """Upload a group message image to GCS. Returns the GCS object name."""
    from app.config import settings
    from google.cloud import storage

    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    object_name = f"group_messages/{group_id}/{message_id}.{ext}"

    client = storage.Client()
    blob = client.bucket(settings.gcs_bucket_name).blob(object_name)
    blob.upload_from_string(file_bytes, content_type=content_type)
    logger.info("Uploaded message image to gs://%s/%s", settings.gcs_bucket_name, object_name)
    return object_name


def get_signed_url(object_name: str) -> str | None:
    """Generate a V4 signed URL for any private GCS object, valid for 1 hour.

    Results are cached in-process for 55 minutes to avoid redundant auth round-trips.
    """
    now = time.monotonic()
    cached = _signed_url_cache.get(object_name)
    if cached and now < cached[1]:
        return cached[0]

    from app.config import settings

    try:
        import google.auth
        from google.auth.transport.requests import Request as GoogleAuthRequest
        from google.cloud import storage
        from google.oauth2 import service_account as sa_module

        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(GoogleAuthRequest())

        client = storage.Client(credentials=credentials)
        blob = client.bucket(settings.gcs_bucket_name).blob(object_name)

        sign_kwargs: dict = dict(version="v4", expiration=_SIGNED_URL_TTL, method="GET")

        if isinstance(credentials, sa_module.Credentials):
            pass
        else:
            service_account_email = getattr(credentials, "service_account_email", None)
            if not service_account_email:
                logger.debug("No service_account_email on credentials; skipping signed URL")
                return None
            sign_kwargs["service_account_email"] = service_account_email
            sign_kwargs["access_token"] = credentials.token

        url = blob.generate_signed_url(**sign_kwargs)
        _signed_url_cache[object_name] = (url, now + _SIGNED_URL_CACHE_TTL)
        return url
    except Exception:
        logger.warning("Failed to generate signed URL for %s", object_name, exc_info=True)
        return None


def get_avatar_signed_url(object_name: str) -> str | None:
    """Generate a signed URL for an avatar GCS object."""
    return get_signed_url(object_name)


def upload_group_avatar(file_bytes: bytes, group_id: str, content_type: str) -> str:
    """Upload a prayer group avatar to GCS at a unique path. Returns the object name."""
    from app.config import settings
    from google.cloud import storage

    img = PilImage.open(BytesIO(file_bytes)).convert("RGB")
    img.thumbnail((_AVATAR_MAX_PX, _AVATAR_MAX_PX), PilImage.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)

    object_name = f"group-avatars/{group_id}/{uuid.uuid4().hex}.jpg"
    client = storage.Client()
    client.bucket(settings.gcs_bucket_name).blob(object_name).upload_from_string(
        buf.getvalue(), content_type="image/jpeg"
    )
    logger.info("Uploaded group avatar to gs://%s/%s", settings.gcs_bucket_name, object_name)
    return object_name


def upload_parish_cover(file_bytes: bytes, parish_id: str, content_type: str) -> str:
    """Upload a parish cover photo to GCS at a unique path. Returns the object name."""
    from app.config import settings
    from google.cloud import storage

    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    object_name = f"parish-covers/{parish_id}/{uuid.uuid4().hex}.{ext}"

    client = storage.Client()
    client.bucket(settings.gcs_bucket_name).blob(object_name).upload_from_string(
        file_bytes, content_type=content_type
    )
    logger.info("Uploaded parish cover to gs://%s/%s", settings.gcs_bucket_name, object_name)
    return object_name


_MANAGED_PREFIXES = ("avatars/", "group-avatars/", "parish-covers/")


def delete_object(object_name: str | None) -> None:
    """Best-effort delete of a managed GCS object. Swallows all errors.

    Used to reap the previous image after a successful re-upload. Only deletes
    objects under the managed prefixes — passing any other value is a no-op.
    """
    if not object_name or not object_name.startswith(_MANAGED_PREFIXES):
        return
    try:
        from app.config import settings
        from google.cloud import storage

        storage.Client().bucket(settings.gcs_bucket_name).blob(object_name).delete()
        _signed_url_cache.pop(object_name, None)
    except Exception as e:
        # Don't propagate — orphaned objects are an acceptable failure mode.
        logger.warning("Failed to delete previous GCS object %s: %s", object_name, e)
