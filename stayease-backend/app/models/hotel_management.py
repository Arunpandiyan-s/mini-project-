from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class HotelManagement(Base):
    """
    Hotel Management master entity table.
    Stores property profile, operational configurations, and branch telemetry.
    """
    __tablename__ = "hotel_management"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hotel_name = Column(String(120), nullable=False, default="StayEase Smart Hotel & Suites")
    hotel_code = Column(String(50), unique=True, index=True, nullable=False, default="STAYEASE-MAIN")
    branch_location = Column(String(150), nullable=False, default="Central Metropolitan")
    total_rooms = Column(Integer, default=60, nullable=False)
    contact_email = Column(String(100), nullable=False, default="operations@stayease.com")
    contact_phone = Column(String(50), nullable=False, default="+91 98110 00000")
    status = Column(String(50), default="active", nullable=False)
    description = Column(Text, nullable=True, default="Automated hospitality operations & guest service platform.")
    settings_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
