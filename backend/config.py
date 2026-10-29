import os
import secrets
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

class Settings(BaseSettings):
    # Database Configuration
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "civicfix_db"

    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Server Configuration
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # External APIs
    GOOGLE_MAPS_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=[
            str(BACKEND_DIR / ".env"),
            str(ROOT_DIR / ".env"),
            ".env"
        ],
        env_file_encoding="utf-8",
        extra="allow"
    )

settings = Settings()
