"""App settings, overridable via MORTGAGE_-prefixed env vars or a .env file.

Mirrors the pattern already used by portfolio-gateway's own Settings class,
so the two apps stay easy to reason about side by side.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MORTGAGE_", env_file=".env", extra="ignore"
    )

    app_name: str = "mortgage-portal"
    host: str = "0.0.0.0"
    port: int = 8500

    db_path: str = "data/mortgage.db"
    documents_dir: str = "data/documents"
    # Built Angular app, set only in the Docker image (see Dockerfile). Unset
    # in local dev, where `ng serve`'s own proxy serves the frontend instead.
    static_dir: str | None = None

    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60

    max_document_size_bytes: int = 10 * 1024 * 1024

    # Auto-ban a burst of simulate calls from one IP (anonymous tier only -
    # invited/admin are exempt). Not a total quota, a spam-burst detector: an
    # IP making more than this many calls within the window gets banned until
    # an admin manually unbans it via the admin endpoints.
    simulate_abuse_window_seconds: int = 10
    simulate_abuse_max_requests: int = 8

    cors_allow_origins: str = (
        "https://johnchristiancastillo.com,https://app.johnchristiancastillo.com"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_url(self) -> str:
        return f"sqlite:///{self.db_path}"


settings = Settings()
