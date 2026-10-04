import json
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./stayease.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174"]
    
    # JWT Settings
    JWT_SECRET_KEY: str = "change-this-in-development"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Developer Seeding
    DEV_ADMIN_PASSWORD: str = "password123"
    DEV_GUEST_PASSWORD: str = "stayease"

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
