from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 180
    gcs_bucket_name: str = "nave-avatars"
    gcs_enabled: bool = True
    # JSON string of the Firebase service account key. If empty, push notifications are disabled.
    firebase_service_account_json: str = ""

    # Content moderation
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    moderation_enabled: bool = True
    moderation_log_level: str = "INFO"
    model_config = {"env_file": ".env"}


settings = Settings()
