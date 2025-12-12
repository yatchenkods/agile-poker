"""Application configuration management"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # API Configuration
    api_title: str = "Agile Planning Poker"
    api_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    environment: str = "development"

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
    jira_project_key: Optional[str] = None

    # Redis
    redis_enabled: bool = True
    redis_url: str = "redis://localhost:6379/0"

    # Email
    email_enabled: bool = False
    email_from: str = "noreply@example.com"
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""

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
