from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

engine_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    # check_same_thread is only needed for SQLite
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    """
    SQLAlchemy 2.0 style Declarative Base.
    All models will inherit from this class.
    """
    pass

def get_db():
    """
    Database session dependency.
    Yields a database session and ensures it is closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
