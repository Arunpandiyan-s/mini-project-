import json
from typing import List, Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./stayease.db"
    DB_URL: Optional[str] = None
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # JWT Settings
    JWT_SECRET_KEY: str = "change-this-in-development"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Developer Seeding
    DEV_ADMIN_PASSWORD: str = "password123"
    DEV_GUEST_PASSWORD: str = "stayease"

    @model_validator(mode="after")
    def normalize_database_url(self):
        url = self.DB_URL or self.DATABASE_URL
        if isinstance(url, str):
            url = url.strip()
            if "DATABASE_URL=" in url:
                url = url.split("DATABASE_URL=", 1)[1].strip()
            if "DB_URL=" in url:
                url = url.split("DB_URL=", 1)[1].strip()
            if (url.startswith('"') and url.endswith('"')) or (url.startswith("'") and url.endswith("'")):
                url = url[1:-1].strip()

            if url.startswith("postgres://"):
                url = "postgresql+psycopg2://" + url[len("postgres://"):]
            elif url.startswith("postgresql+asyncpg://"):
                url = "postgresql+psycopg2://" + url[len("postgresql+asyncpg://"):]
            elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
                url = "postgresql+psycopg2://" + url[len("postgresql://"):]

            if "ssl=require" in url:
                url = url.replace("?ssl=require", "?sslmode=require").replace("&ssl=require", "&sslmode=require")

            self.DATABASE_URL = url
        return self

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v_trimmed = v.strip()
            if not v_trimmed:
                return []
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except json.JSONDecodeError:
                    pass
            # Fallback to comma separation
            return [x.strip() for x in v_trimmed.split(",") if x.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
