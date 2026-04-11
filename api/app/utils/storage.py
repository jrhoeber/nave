import datetime
import logging

logger = logging.getLogger(__name__)

_SIGNED_URL_TTL = datetime.timedelta(hours=1)

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_AVATAR_BYTES = 5 * 1024 * 1024   # 5 MB
_MAX_MESSAGE_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


def upload_avatar(file_bytes: bytes, user_id: str, content_type: str) -> str:
    """Upload avatar to the private GCS bucket. Returns the GCS object name."""
    from app.config import settings
    from google.cloud import storage

    ext = content_type.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    object_name = f"avatars/{user_id}.{ext}"

    client = storage.Client()
    blob = client.bucket(settings.gcs_bucket_name).blob(object_name)
    blob.upload_from_string(file_bytes, content_type=content_type)
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
    """Generate a V4 signed URL for any private GCS object, valid for 1 hour."""
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

        return blob.generate_signed_url(**sign_kwargs)
    except Exception:
        logger.warning("Failed to generate signed URL for %s", object_name, exc_info=True)
        return None


def get_avatar_signed_url(object_name: str) -> str | None:
    """Generate a signed URL for an avatar GCS object."""
    return get_signed_url(object_name)
