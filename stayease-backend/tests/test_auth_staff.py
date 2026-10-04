import os
import jwt
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.staff import Staff
from app.models.enums import StaffRole, EmploymentStatus
from app.core.security import hash_password
from app.services.seed import seed_development_data
from app.config import settings

# Use a separate SQLite database for testing
TEST_DATABASE_URL = "sqlite:///./test_stayease.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """
    Sets up a fresh test database for each individual test case,
    seeding the default admin, and cleans up tables afterwards.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_development_data(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    
    # Try to delete the file
    if os.path.exists("./test_stayease.db"):
        try:
            os.remove("./test_stayease.db")
        except PermissionError:
            pass

# Override database dependency in app
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_admin_seed_exists(setup_db):
    db = setup_db
    admin = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    assert admin is not None
    assert admin.name == "Daniel Okoye"
    assert admin.role == StaffRole.ADMIN

def test_admin_seed_is_idempotent(setup_db):
    db = setup_db
    # Repeated calls should skip seeding and not duplicate EMP-1001
    seed_development_data(db)
    seed_development_data(db)
    admins = db.query(Staff).filter(Staff.staff_id == "EMP-1001").all()
    assert len(admins) == 1

def test_admin_seed_password_is_hashed(setup_db):
    db = setup_db
    admin = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    assert admin.password_hash != "password123"
    assert admin.password_hash.startswith("$2b$")  # Bcrypt blowfish hash indicator

def test_valid_login(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert "access_token" in data
    assert data["user"]["staff_id"] == "EMP-1001"
    # Ensure credentials hash is not leaked
    assert "password_hash" not in data["user"]

def test_wrong_password(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Invalid identifier" in response.json()["detail"]

def test_unknown_account(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "EMP-9999",
        "password": "password123"
    })
    assert response.status_code == 401

def test_login_by_email(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "daniel.o@stayease.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert response.json()["authenticated"] is True

def test_login_by_staff_id(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    assert response.status_code == 200

def test_login_by_phone(setup_db):
    # Daniel Okoye phone is +91 98110 11001
    # Normalized: 919811011001
    response = client.post("/api/auth/login", json={
        "identifier": "919811011001",
        "password": "password123"
    })
    assert response.status_code == 200
    
    response2 = client.post("/api/auth/login", json={
        "identifier": "+91 98110-11001",
        "password": "password123"
    })
    assert response2.status_code == 200

def test_partial_phone_does_not_authenticate(setup_db):
    # Substring of phone number must not match, nor should it match without the full country code prefix
    response = client.post("/api/auth/login", json={
        "identifier": "9811011001",  # Missing 91 prefix
        "password": "password123"
    })
    assert response.status_code == 401

    response2 = client.post("/api/auth/login", json={
        "identifier": "98110",
        "password": "password123"
    })
    assert response2.status_code == 401


def test_optional_role_match(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123",
        "role": "admin"
    })
    assert response.status_code == 200
    
    # Check old frontend compatibility "manager" mapping
    response2 = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123",
        "role": "manager"
    })
    assert response2.status_code == 200

def test_incorrect_role_fails(setup_db):
    response = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123",
        "role": "housekeeping"
    })
    assert response.status_code == 403
    assert "Role mismatch" in response.json()["detail"]

def test_suspended_login_fails(setup_db):
    db = setup_db
    admin = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    admin.employment_status = EmploymentStatus.SUSPENDED
    db.commit()

    response = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    assert response.status_code == 403
    assert "suspended" in response.json()["detail"]

def test_api_me_without_jwt_fails():
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_valid_jwt_works_on_api_me():
    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["staff_id"] == "EMP-1001"

def test_invalid_jwt_fails():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401

def test_expired_jwt_fails():
    expired_payload = {
        "sub": "1",
        "staff_id": "EMP-1001",
        "role": "admin",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=10)
    }
    expired_token = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401

def test_admin_creates_staff(setup_db):
    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.post("/api/staff", json={
        "staff_id": "EMP-3001",
        "name": "Jane Doe",
        "email": "jane.doe@stayease.com",
        "phone": "+91 99999 88888",
        "password": "newpassword123",
        "role": "housekeeping",
        "floor": "Floor 2",
        "shift": "08:00 - 16:00"
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 201
    assert response.json()["staff_id"] == "EMP-3001"
    assert "password_hash" not in response.json()

def test_duplicate_staff_id_returns_conflict(setup_db):
    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.post("/api/staff", json={
        "staff_id": "EMP-1001",
        "name": "Duplicate Admin",
        "email": "admin2@stayease.com",
        "password": "newpassword123",
        "role": "admin"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 409

def test_duplicate_email_returns_conflict(setup_db):
    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.post("/api/staff", json={
        "staff_id": "EMP-3001",
        "name": "Jane Doe",
        "email": "daniel.o@stayease.com",
        "password": "newpassword123",
        "role": "housekeeping"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 409

def test_reception_lists_staff(setup_db):
    db = setup_db
    reception = Staff(
        staff_id="EMP-2001",
        name="Anita Sharma",
        email="anita.s@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.RECEPTION,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(reception)
    db.commit()

    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-2001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.get("/api/staff", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 2

def test_reception_cannot_create_staff(setup_db):
    db = setup_db
    reception = Staff(
        staff_id="EMP-2001",
        name="Anita Sharma",
        email="anita.s@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.RECEPTION,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(reception)
    db.commit()

    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-2001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.post("/api/staff", json={
        "staff_id": "EMP-3001",
        "name": "Jane Doe",
        "email": "jane@stayease.com",
        "password": "password123",
        "role": "housekeeping"
    }, headers={"Authorization": f"Bearer {token}"})
    
    assert response.status_code == 403

def test_reception_views_staff_detail(setup_db):
    db = setup_db
    reception = Staff(
        staff_id="EMP-2001",
        name="Anita Sharma",
        email="anita.s@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.RECEPTION,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(reception)
    db.commit()

    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-2001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.get("/api/staff/EMP-1001", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["staff_id"] == "EMP-1001"

def test_reception_cannot_modify_staff(setup_db):
    db = setup_db
    reception = Staff(
        staff_id="EMP-2001",
        name="Anita Sharma",
        email="anita.s@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.RECEPTION,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(reception)
    db.commit()

    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-2001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    response = client.patch("/api/staff/EMP-1001", json={"name": "Hacked Name"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_housekeeping_cannot_access_staff_directory(setup_db):
    db = setup_db
    housekeeper = Staff(
        staff_id="EMP-3001",
        name="Grace Okafor",
        email="grace.o@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.HOUSEKEEPING,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(housekeeper)
    db.commit()

    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-3001",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]

    # Housekeeping directory fetch should block
    response = client.get("/api/staff", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_admin_suspends_staff_and_jwt_stops_working(setup_db):
    db = setup_db
    housekeeper = Staff(
        staff_id="EMP-3001",
        name="Grace Okafor",
        email="grace.o@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.HOUSEKEEPING,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(housekeeper)
    db.commit()

    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-3001",
        "password": "password123"
    })
    emp_token = login_resp.json()["access_token"]

    # Verified working first
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {emp_token}"})
    assert me_resp.status_code == 200

    # Admin login
    admin_login = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    admin_token = admin_login.json()["access_token"]

    # Suspend
    susp_resp = client.patch("/api/staff/EMP-3001/suspend", headers={"Authorization": f"Bearer {admin_token}"})
    assert susp_resp.status_code == 200

    # Re-verify token is rejected
    me_resp_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {emp_token}"})
    assert me_resp_after.status_code == 403

def test_admin_activates_suspended_staff(setup_db):
    db = setup_db
    housekeeper = Staff(
        staff_id="EMP-3001",
        name="Grace Okafor",
        email="grace.o@stayease.com",
        password_hash=hash_password("password123"),
        role=StaffRole.HOUSEKEEPING,
        employment_status=EmploymentStatus.SUSPENDED
    )
    db.add(housekeeper)
    db.commit()

    admin_login = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    admin_token = admin_login.json()["access_token"]

    # Activate
    act_resp = client.patch("/api/staff/EMP-3001/activate", headers={"Authorization": f"Bearer {admin_token}"})
    assert act_resp.status_code == 200
    assert act_resp.json()["employment_status"] == "active"

    # Verify active login
    emp_login = client.post("/api/auth/login", json={
        "identifier": "EMP-3001",
        "password": "password123"
    })
    assert emp_login.status_code == 200

def test_staff_update_cannot_modify_protected_fields(setup_db):
    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    admin_token = login_resp.json()["access_token"]

    # Try modifying id and password_hash
    response = client.patch("/api/staff/EMP-1001", json={
        "id": 9999,
        "password_hash": "modifiedhash",
        "name": "Updated Name"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"
    # id remains unchanged
    assert response.json()["id"] == 1
