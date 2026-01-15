"""Application configuration management"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Configuration
    api_title: str = "Agile Planning Poker"
    api_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False

    # Database
    database_url: str = "postgresql://poker:poker@localhost:5432/agile_poker"
    database_echo: bool = False

    # Security
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Jira Integration
    jira_enabled: bool = True
    jira_url: str = "https://jira.example.com"
    jira_username: str = ""
    jira_api_token: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Logging
    log_level: str = "INFO"
    log_file: str = "logs/app.log"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
