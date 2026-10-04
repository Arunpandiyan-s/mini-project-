import logging
from sqlalchemy import inspect
from app.database import engine

logger = logging.getLogger("schema_migrations")

def run_safe_schema_migrations():
    """
    Idempotently runs safe SQLite schema migrations.
    Appends the `password_hash` column to the `guests` table if it is missing.
    Does not drop tables or delete stayease.db, preserving all existing data.
    """
    logger.info("Checking database schema migrations...")
    try:
        inspector = inspect(engine)
        columns = [col["name"] for col in inspector.get_columns("guests")]
        
        if "password_hash" not in columns:
            logger.info("Column 'password_hash' not found in 'guests' table. Performing ALTER TABLE...")
            with engine.begin() as conn:
                conn.exec_driver_sql("ALTER TABLE guests ADD COLUMN password_hash VARCHAR(255) NULL")
            logger.info("Column 'password_hash' added successfully to 'guests' table.")
        else:
            logger.info("Column 'password_hash' already exists in 'guests' table. No migration needed.")
    except Exception as e:
        logger.error(f"Error during schema migration: {e}")
        # In a real environment we might want to propagate, but for development migration safety:
        raise e
