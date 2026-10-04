import os
import sys

# Add stayease-backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.database import Base, engine, SessionLocal
from app.services.seed import seed_development_data

def reset_database():
    db_path = os.path.join(backend_dir, "stayease.db")
    
    print(f"Checking for development database file at {db_path}...")
    if os.path.exists(db_path):
        print("Removing existing database file...")
        try:
            os.remove(db_path)
            print("Database file deleted successfully.")
        except Exception as e:
            print(f"Error deleting database file: {e}")
            sys.exit(1)
            
    print("Recreating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Seeding database...")
    db = SessionLocal()
    try:
        seed_development_data(db)
        print("Database reset and seed completed successfully.")
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
