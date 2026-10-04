# StayEase Hotel Management System Backend

This repository contains the backend codebase for the StayEase Hotel Management System. It serves as the unified database source of truth for both `stayease-staff-hub` and `stayease-guest-hub` applications.

## Technology Stack

- **Python 3.10+**
- **FastAPI** (REST APIs and Swagger documentation)
- **SQLAlchemy 2.0** (Type-safe Object-Relational Mapper)
- **SQLite** (Local development database, easily migratable to PostgreSQL)
- **Uvicorn** (Asynchronous Server Gateway Interface)

---

## Folder Structure

```text
stayease-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entrypoint & table auto-creation
│   ├── database.py          # SQLAlchemy Session and engine configuration
│   ├── config.py            # Pydantic Settings management
│   ├── models/              # SQLAlchemy 2.0 ORM Database Models
│   │   ├── __init__.py
│   │   ├── enums.py         # Standardized status and role enums
│   │   ├── staff.py
│   │   ├── guest.py
│   │   ├── room.py
│   │   ├── reservation.py
│   │   ├── guest_request.py
│   │   ├── task.py
│   │   └── audit_log.py
│   ├── schemas/             # Pydantic Schemas (for request/response validation)
│   │   └── __init__.py
│   ├── routes/              # FastAPI Router endpoints
│   │   └── __init__.py
│   ├── services/            # Core business logic Layer
│   │   └── __init__.py
│   └── core/                # Shared utilities, security, and hashing helpers
│       └── __init__.py
├── .env                     # Local environment configuration (Git-ignored)
├── .env.example             # Configuration settings template
├── .gitignore               # System & compilation file exclusions
├── requirements.txt         # Core dependency definitions
└── stayease.db              # SQLite Local Development Database (Git-ignored)
```

---

## Getting Started

### 1. Setup Python Virtual Environment

Navigate to the `stayease-backend` directory and initialize a virtual environment:

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Required Dependencies

Upgrade pip and install the package requirements:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Environment Variables Configuration

Copy the example configuration to a new `.env` file (which is gitignored):

```bash
copy .env.example .env   # Windows Command Prompt / PowerShell
# or
cp .env.example .env     # Git Bash / macOS / Linux
```

Adjust variables inside `.env` if necessary.

### 4. Run the Uvicorn Development Server

Start the application locally on port 8000:

```bash
uvicorn app.main:app --reload
```

---

## API Verification & Documentation

Once the server is running, verify the following endpoints:

* **Base Health Status**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
* **Health Check Probe**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
* **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc alternative documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Database Table Auto-creation

On application startup, FastAPI will automatically connect to the configured `DATABASE_URL` and create the following SQLite database tables if they do not already exist:
* `staff`
* `guests`
* `rooms`
* `reservations`
* `guest_requests`
* `tasks`
* `audit_logs`
