import os
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.staff import Staff
from app.models.room import Room
from app.models.guest import Guest
from app.models.reservation import Reservation
from app.models.audit_log import AuditLog
from app.models.enums import StaffRole, EmploymentStatus, OccupancyStatus, CleaningStatus, MaintenanceStatus, ReservationStatus
from app.core.security import hash_password
from app.services.seed import seed_development_data
from app.services.room_service import is_room_ready_for_checkin

# Use a separate SQLite database for lifecycle testing
TEST_DATABASE_URL = "sqlite:///./test_stayease.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_lifecycle_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_development_data(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_stayease.db"):
        try:
            os.remove("./test_stayease.db")
        except PermissionError:
            pass

# Override dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# --- Helper function to get JWT tokens ---
def get_token_for(staff_id: str, password: str = "password123") -> str:
    login_resp = client.post("/api/auth/login", json={
        "identifier": staff_id,
        "password": password
    })
    return login_resp.json()["access_token"]

def create_staff_helper(db, staff_id: str, role: StaffRole, email: str) -> str:
    hashed = hash_password("password123")
    staff = Staff(
        staff_id=staff_id,
        name=f"Staff {staff_id}",
        email=email,
        phone="+91 99999 88888",
        password_hash=hashed,
        role=role,
        employment_status=EmploymentStatus.ACTIVE
    )
    db.add(staff)
    db.commit()
    return get_token_for(staff_id)


# =========================================================================
# GUEST DIRECTORY TESTS
# =========================================================================

def test_guest_crud_and_rbac(setup_lifecycle_db):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")

    # 1. Admin creates guest
    resp = client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Aisha Rahman",
        "email": "aisha@gmail.com",
        "phone": "+91 90000 11111"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 201
    assert resp.json()["guest_id"] == "GST-1001"

    # 2. Reception creates guest
    resp = client.post("/api/guests", json={
        "guest_id": "GST-1002",
        "name": "Peter Parker",
        "email": "peter@gmail.com",
        "phone": "+91 90000 22222"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201

    # 3. Housekeeping cannot view guest directory
    resp = client.get("/api/guests", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 403

    # 4. Duplicate guest_id rejected
    resp = client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Jane Doe",
        "email": "jane@gmail.com",
        "phone": "+91 90000 33333"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 409

    # 5. Profile update constraints
    resp = client.patch("/api/guests/GST-1001", json={
        "guest_id": "GST-9999",  # Protected/immutable
        "id": 9999,
        "name": "Aisha Updated"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Aisha Updated"
    assert resp.json()["guest_id"] == "GST-1001"  # guest_id is unchanged


# =========================================================================
# ROOM INVENTORY TESTS
# =========================================================================

def test_room_inventory_and_rbac(setup_lifecycle_db):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")

    # 1. Admin creates room
    resp = client.post("/api/rooms", json={
        "room_number": "1001",
        "floor": 10,
        "room_type": "Presidential Suite"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 201
    assert resp.json()["room_number"] == "1001"

    # 2. Duplicate room number rejected
    resp = client.post("/api/rooms", json={
        "room_number": "1001",
        "floor": 10,
        "room_type": "Presidential Suite"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 409

    # 3. Reception views rooms
    resp = client.get("/api/rooms", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 200
    
    # 4. Housekeeping views rooms
    resp = client.get("/api/rooms", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 200

    # 5. Non-admin cannot modify metadata or force operational updates
    resp = client.patch("/api/rooms/1001", json={
        "room_type": "Hacked Type",
        "occupancy_status": "occupied",  # Unsafe operational transition
        "cleaning_status": "clean"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 403

    # Admin patches metadata (operational transitions ignored in update schema)
    resp = client.patch("/api/rooms/1001", json={
        "room_type": "Luxury Presidential",
        "occupancy_status": "occupied",
        "cleaning_status": "dirty",
        "current_guest_id": 5
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 200
    assert resp.json()["room_type"] == "Luxury Presidential"
    assert resp.json()["occupancy_status"] == "vacant"  # Ignored operational changes
    assert resp.json()["cleaning_status"] == "clean"  # Ignored operational changes

    # 6. Verify PII Protection in room listings
    # Current guest ID or details should not leak
    resp = client.get("/api/rooms/101", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "current_guest" not in data
    assert "current_guest_id" not in data


# =========================================================================
# RESERVATION SCHEMAS & BUSINESS RULES
# =========================================================================

def test_reservations_and_overlaps(setup_lifecycle_db):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")

    # Create guest
    client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Aisha Rahman",
        "email": "aisha@gmail.com"
    }, headers={"Authorization": f"Bearer {admin_tok}"})

    # Try creating reservation check_out <= check_in
    resp = client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-10T12:00:00Z" # invalid
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 400

    # Housekeeping cannot create reservation
    resp = client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 403

    # Valid Reservation Created: Aug 10 -> Aug 12
    resp = client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201

    # Overlapping booked reservation on Room 101: Aug 11 -> Aug 13 (Conflict)
    resp = client.post("/api/reservations", json={
        "reservation_id": "RES-5002",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-11T14:00:00Z",
        "check_out": "2026-08-13T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 409

    # Back-to-back reservation: Aug 12 -> Aug 14 (Allowed, Aug 12 checkout/checkin boundary)
    resp = client.post("/api/reservations", json={
        "reservation_id": "RES-5003",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-12T14:00:00Z",
        "check_out": "2026-08-14T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201

    # Cancel RES-5001
    resp = client.patch("/api/reservations/RES-5001/cancel", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 200

    # Previously overlapping stay now allowed because RES-5001 is cancelled
    resp = client.post("/api/reservations", json={
        "reservation_id": "RES-5004",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201


# =========================================================================
# CHECK-IN & ROOM READINESS TESTS
# =========================================================================

def test_check_in_rules(setup_lifecycle_db):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")

    # Setup Guest and Reservation
    client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Aisha Rahman",
        "email": "aisha@gmail.com"
    }, headers={"Authorization": f"Bearer {admin_tok}"})

    client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    # Housekeeping cannot check in guest
    resp = client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 403

    # Dirty Room Check-In Failure: Set Room 101 to dirty
    room = db.query(Room).filter(Room.room_number == "101").first()
    room.cleaning_status = CleaningStatus.DIRTY
    db.commit()

    resp = client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 409
    assert "dirty" in resp.json()["detail"]

    # Make clean but out_of_service
    room.cleaning_status = CleaningStatus.CLEAN
    room.maintenance_status = MaintenanceStatus.OUT_OF_SERVICE
    db.commit()

    resp = client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 409
    assert "maintenance" in resp.json()["detail"]

    # Restore to operational
    room.maintenance_status = MaintenanceStatus.GOOD
    db.commit()

    # Success check-in
    resp = client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "checked_in"

    # Verify database state
    db.expire_all()
    res = db.query(Reservation).filter(Reservation.reservation_id == "RES-5001").first()
    assert res.status == ReservationStatus.CHECKED_IN
    r = db.query(Room).filter(Room.room_number == "101").first()
    assert r.occupancy_status == OccupancyStatus.OCCUPIED
    assert r.current_guest_id == res.guest_id

    # Try check-in again or double check-in
    client.post("/api/guests", json={
        "guest_id": "GST-1002",
        "name": "Jane",
        "email": "jane@gmail.com"
    }, headers={"Authorization": f"Bearer {admin_tok}"})

    client.post("/api/reservations", json={
        "reservation_id": "RES-5002",
        "guest_id": "GST-1002",
        "room_number": "101",
        "check_in": "2026-08-15T14:00:00Z",
        "check_out": "2026-08-17T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    # Cannot check in to occupied room
    resp = client.post("/api/reservations/RES-5002/check-in", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 409
    assert "occupied" in resp.json()["detail"]


# =========================================================================
# CHECKOUT TESTS
# =========================================================================

def test_checkout_rules(setup_lifecycle_db):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")

    # Setup stay
    client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Aisha Rahman",
        "email": "aisha@gmail.com"
    }, headers={"Authorization": f"Bearer {admin_tok}"})

    client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    # Perform Check-In
    client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {reception_tok}"})

    # Housekeeping cannot checkout guest
    resp = client.post("/api/reservations/RES-5001/checkout", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 403

    # Success Checkout
    resp = client.post("/api/reservations/RES-5001/checkout", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "checked_out"

    # Verify state: VACANT + DIRTY + Null current_guest_id
    db.expire_all()
    res = db.query(Reservation).filter(Reservation.reservation_id == "RES-5001").first()
    assert res.status == ReservationStatus.CHECKED_OUT
    r = db.query(Room).filter(Room.room_number == "101").first()
    assert r.occupancy_status == OccupancyStatus.VACANT
    assert r.cleaning_status == CleaningStatus.DIRTY
    assert r.current_guest_id is None

    # Check-in validation failure because room is now dirty
    # is_room_ready_for_checkin should return False
    assert is_room_ready_for_checkin(r, db) is False

    # Second checkout must return conflict 409
    resp = client.post("/api/reservations/RES-5001/checkout", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 409
    assert "already checked out" in resp.json()["detail"]


# =========================================================================
# TRANSACTION SAFETY TESTS (ROLLBACK VERIFICATIONS)
# =========================================================================

def test_checkin_checkout_transaction_rollbacks(setup_lifecycle_db, monkeypatch):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")

    # Create stay record
    client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Aisha Rahman",
        "email": "aisha@gmail.com"
    }, headers={"Authorization": f"Bearer {admin_tok}"})

    client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    from sqlalchemy.orm import Session
    # Mock DB commit to crash and force a rollback
    def mock_commit(self):
        raise Exception("Database transaction connection failed midway")

    # Force check-in rollback
    monkeypatch.setattr(Session, "commit", mock_commit)

    resp = client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 500
    
    # Verify reservation is still BOOKED and room is still VACANT + CLEAN
    db.rollback() # reset mock state session
    res = db.query(Reservation).filter(Reservation.reservation_id == "RES-5001").first()
    assert res.status == ReservationStatus.BOOKED
    r = db.query(Room).filter(Room.room_number == "101").first()
    assert r.occupancy_status == OccupancyStatus.VACANT
    assert r.cleaning_status == CleaningStatus.CLEAN


# =========================================================================
# AUDIT TIMELINES TESTS
# =========================================================================

def test_audit_logs_written(setup_lifecycle_db):
    db = setup_lifecycle_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")

    client.post("/api/guests", json={
        "guest_id": "GST-1001",
        "name": "Aisha",
        "email": "aisha@gmail.com"
    }, headers={"Authorization": f"Bearer {admin_tok}"})

    client.post("/api/reservations", json={
        "reservation_id": "RES-5001",
        "guest_id": "GST-1001",
        "room_number": "101",
        "check_in": "2026-08-10T14:00:00Z",
        "check_out": "2026-08-12T12:00:00Z"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    # Check reservation audit logged
    db.expire_all()
    logs = db.query(AuditLog).filter(AuditLog.event_type == "RESERVATION_CREATED").all()
    assert len(logs) == 1

    # Perform check-in
    client.post("/api/reservations/RES-5001/check-in", headers={"Authorization": f"Bearer {reception_tok}"})
    db.expire_all()
    checkin_logs = db.query(AuditLog).filter(AuditLog.event_type == "GUEST_CHECKED_IN").all()
    assert len(checkin_logs) == 1

    # Perform checkout
    client.post("/api/reservations/RES-5001/checkout", headers={"Authorization": f"Bearer {reception_tok}"})
    db.expire_all()
    checkout_logs = db.query(AuditLog).filter(AuditLog.event_type == "GUEST_CHECKED_OUT").all()
    assert len(checkout_logs) == 1
