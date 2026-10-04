from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine, SessionLocal
from app import models
from app.core.schema_migrations import run_safe_schema_migrations
from app.services.seed import seed_development_data
from app.routes import (
    auth, staff, guest, room, reservation, guest_request, task,
    assignment, websocket, notification, operations, guest_auth, guest_portal
)

# Run schema migrations first (idempotent alterations)
run_safe_schema_migrations()

# Automatically create all tables on startup (Phase 1 simplicity)
Base.metadata.create_all(bind=engine)

# Seed developer admin and rooms on startup
db = SessionLocal()
try:
    seed_development_data(db)
finally:
    db.close()

app = FastAPI(
    title="StayEase Hotel Management Platform Backend",
    description="Core backend operations and REST API for stayease-staff-hub and stayease-guest-hub.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(guest.router)
app.include_router(room.router)
app.include_router(reservation.router)
app.include_router(guest_request.router)
app.include_router(task.router)
app.include_router(assignment.router)
app.include_router(assignment.admin_tasks_router)
app.include_router(websocket.router)
app.include_router(notification.router)
app.include_router(operations.router)
app.include_router(guest_auth.router)
app.include_router(guest_portal.router)



@app.get("/", tags=["General"])
def read_root():
    """
    Root endpoint verifying server availability.
    """
    return {
        "status": "success",
        "message": "StayEase Backend is running"
    }

@app.get("/health", tags=["General"])
def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "healthy"
    }
