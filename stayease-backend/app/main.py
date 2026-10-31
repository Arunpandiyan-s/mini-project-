import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine, SessionLocal
from app import models
from app.core.schema_migrations import run_safe_schema_migrations
from app.services.seed import seed_development_data
from app.routes import (
    auth, staff, guest, room, reservation, guest_request, task,
    assignment, websocket, notification, operations, guest_auth, guest_portal,
    admin, message
)

is_pytest = "PYTEST_CURRENT_TEST" in os.environ or any("pytest" in arg for arg in sys.argv)

def init_db():
    Base.metadata.create_all(bind=engine)
    run_safe_schema_migrations()
    db = SessionLocal()
    try:
        seed_development_data(db)
    finally:
        db.close()

if not is_pytest:
    init_db()

app = FastAPI(
    title="StayEase Hotel Management Platform Backend",
    description="Core backend operations and REST API for stayease-staff-hub and stayease-guest-hub.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

cors_all_origins = "*" in settings.CORS_ORIGINS

# Temporary broad CORS access for development and deployment testing.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if cors_all_origins else settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*" if cors_all_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def normalize_api_paths(request: Request, call_next):
    """
    Ensures seamless routing whether requests hit root ('/'), Swagger docs,
    or Vercel's serverless '/api' prefix, with or without '/api' route paths.
    """
    path = request.scope.get("path", "")
    if path in ("/api", "/api/", "/api/index", "/api/index.py"):
        request.scope["path"] = "/"
    elif path == "/api/docs":
        request.scope["path"] = "/docs"
    elif path == "/api/openapi.json":
        request.scope["path"] = "/openapi.json"
    elif path == "/api/redoc":
        request.scope["path"] = "/redoc"
    elif path == "/api/health":
        request.scope["path"] = "/health"
    elif not path.startswith("/api/") and path not in ("/", "/docs", "/redoc", "/openapi.json", "/health", "/docs/oauth2-redirect"):
        request.scope["path"] = "/api" + path
    return await call_next(request)

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
app.include_router(admin.router)
app.include_router(message.router)



@app.get("/", tags=["General"])
@app.get("/api", tags=["General"], include_in_schema=False)
@app.get("/api/", tags=["General"], include_in_schema=False)
def read_root():
    """
    Root endpoint verifying server availability.
    """
    return {
        "status": "success",
        "message": "StayEase Backend is running"
    }

@app.get("/health", tags=["General"])
@app.get("/api/health", tags=["General"], include_in_schema=False)
def health_check():
    """
    Service health check endpoint.
    """
    return {
        "status": "healthy"
    }
