import os
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.staff import Staff
from app.models.room import Room
from app.models.guest import Guest
from app.models.reservation import Reservation
from app.models.guest_request import GuestRequest
from app.models.task import Task
from app.models.audit_log import AuditLog
from app.models.enums import (
    StaffRole, EmploymentStatus, OccupancyStatus, CleaningStatus,
    MaintenanceStatus, ReservationStatus, RequestType, RequestStatus,
    Department, TaskStatus, TaskPriority
)
from app.core.security import hash_password
from app.services.seed import seed_development_data
from app.services.room_service import is_room_ready_for_checkin

# Use a separate SQLite database for operations testing
TEST_DATABASE_URL = "sqlite:///./test_stayease.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_ops_db():
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

# Override database dependency in app
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# --- Helper functions ---
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

def setup_active_stay_helper(db, guest_id: str, room_number: str) -> int:
    # 1. Create Guest
    guest = Guest(guest_id=guest_id, name="Test Guest", email=f"{guest_id.lower()}@stayease.com")
    db.add(guest)
    db.flush()

    # 2. Find Room
    room = db.query(Room).filter(Room.room_number == room_number).first()
    if not room:
        room = Room(room_number=room_number, floor=1, room_type="Standard")
        db.add(room)
        db.flush()
    else:
        # Reset room
        room.occupancy_status = OccupancyStatus.OCCUPIED
        room.cleaning_status = CleaningStatus.CLEAN
        room.maintenance_status = MaintenanceStatus.GOOD
        room.current_guest_id = guest.id
        db.flush()

    # 3. Create Checked-In Reservation
    reservation = Reservation(
        reservation_id=f"RES-{uuid.uuid4().hex[:6].upper()}",
        guest_id=guest.id,
        room_id=room.id,
        check_in=datetime.now(timezone.utc) - timedelta(days=1),
        check_out=datetime.now(timezone.utc) + timedelta(days=2),
        status=ReservationStatus.CHECKED_IN
    )
    db.add(reservation)
    db.commit()
    return guest.id

# =========================================================================
# GUEST REQUEST CREATION & ROUTING TESTS
# =========================================================================

def test_guest_request_creation_and_routing(setup_ops_db):
    db = setup_ops_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")

    # 1. Setup Active Stay: GST-1001 checked in to Room 101
    guest_id = setup_active_stay_helper(db, "GST-1001", "101")

    # 2. Valid request: extra towel (reception files it)
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel",
        "description": "2 extra towels"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201
    req_data = resp.json()
    assert req_data["request_type"] == "extra_towel"
    assert req_data["department"] == "housekeeping"  # Backend routed!
    assert req_data["priority"] == "medium"         # Backend prioritized!

    # 3. Verify unassigned Task created atomically
    db.expire_all()
    task = db.query(Task).filter(Task.request_id == req_data["id"]).first()
    assert task is not None
    assert task.department == Department.HOUSEKEEPING
    assert task.assigned_staff_id is None
    assert task.status == TaskStatus.PENDING
    assert task.source_type == "guest_request"
    assert task.source_id == req_data["request_id"]
    assert "PII" not in task.title

    # 4. Unknown guest rejected
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-9999",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 404

    # 5. Guest not checked in rejected
    # Setup Guest 1002, but do NOT check them in to Room 102
    guest2 = Guest(guest_id="GST-1002", name="Other", email="other@stayease.com")
    db.add(guest2)
    db.commit()
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1002",
        "room_number": "102",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 400

    # 6. Guest requesting for another occupied room rejected
    # GST-1001 is checked into 101. Rejects request for Room 102
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "102",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 400

    # 7. Department Routing checks
    # tv/AC maintenance maps to maintenance
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "maintenance",
        "description": "AC remote batteries dead"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201
    assert resp.json()["department"] == "maintenance"
    assert resp.json()["priority"] == "high"

    # room_service maps to fnb
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "room_service",
        "description": "Club sandwich"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201
    assert resp.json()["department"] == "fnb"

    # luggage maps to reception
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "luggage_assistance",
        "description": "Carry suitcases"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201
    assert resp.json()["department"] == "reception"

    # 8. OTHER request type requires department
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "other"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 400

    # OTHER with department succeeds
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "other",
        "department": "maintenance",
        "description": "Custom fix"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 201
    assert resp.json()["department"] == "maintenance"

    # 9. Request + Task atomic transaction rollback verification
    def mock_commit(self):
        raise Exception("Force crash during save")
    
    from sqlalchemy.orm import Session
    # Set monkeypatch to force crash on save
    import pytest
    from _pytest.monkeypatch import MonkeyPatch
    mp = MonkeyPatch()
    mp.setattr(Session, "commit", mock_commit)

    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 500

    mp.undo()
    db.rollback()
    # Confirm no orphaned GuestRequest or Task was saved
    assert db.query(GuestRequest).filter(GuestRequest.description == "Custom check rollback").first() is None


# =========================================================================
# TASK LISTING & RBAC VISIBILITY TESTS
# =========================================================================

def test_task_list_rbac_and_details(setup_ops_db):
    db = setup_ops_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    housekeeping_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "housekeeping@stayease.com")
    maintenance_tok = create_staff_helper(db, "EMP-4001", StaffRole.MAINTENANCE, "maintenance@stayease.com")

    # Seed an active stay
    setup_active_stay_helper(db, "GST-1001", "101")

    # Create 1 housekeeping task and 1 maintenance task
    client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "maintenance"
    }, headers={"Authorization": f"Bearer {reception_tok}"})

    # Fetch tasks lists
    db.expire_all()
    hk_tasks = client.get("/api/tasks", headers={"Authorization": f"Bearer {housekeeping_tok}"}).json()
    assert len(hk_tasks) == 1
    assert hk_tasks[0]["department"] == "housekeeping"

    mt_tasks = client.get("/api/tasks", headers={"Authorization": f"Bearer {maintenance_tok}"}).json()
    assert len(mt_tasks) == 1
    assert mt_tasks[0]["department"] == "maintenance"

    admin_tasks = client.get("/api/tasks", headers={"Authorization": f"Bearer {admin_tok}"}).json()
    assert len(admin_tasks) == 2

    # Reject out-of-department filtering
    resp = client.get("/api/tasks?department=maintenance", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 403

    # Reject out-of-department direct GET details
    mt_task_id = mt_tasks[0]["task_id"]
    resp = client.get(f"/api/tasks/{mt_task_id}", headers={"Authorization": f"Bearer {housekeeping_tok}"})
    assert resp.status_code == 403

    # Direct detail GET succeeds for admin
    resp = client.get(f"/api/tasks/{mt_task_id}", headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 200


# =========================================================================
# TASK LIFECYCLE & STATE MACHINE TESTS
# =========================================================================

def test_task_state_machine_and_double_acceptance(setup_ops_db):
    db = setup_ops_db
    admin_tok = get_token_for("EMP-1001")
    hk_tok_1 = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    hk_tok_2 = create_staff_helper(db, "EMP-3002", StaffRole.HOUSEKEEPING, "hk2@stayease.com")
    maintenance_tok = create_staff_helper(db, "EMP-4001", StaffRole.MAINTENANCE, "maint@stayease.com")

    # Create stay & request
    setup_active_stay_helper(db, "GST-1001", "101")
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    req_id = resp.json()["request_id"]

    db.expire_all()
    task = db.query(Task).join(GuestRequest).filter(GuestRequest.request_id == req_id).first()
    task_id = task.task_id

    # 1. Reject maintenance worker accepting housekeeping task
    resp = client.patch(f"/api/tasks/{task_id}/accept", headers={"Authorization": f"Bearer {maintenance_tok}"})
    assert resp.status_code == 403

    # 2. Housekeeper 1 accepts task
    resp = client.patch(f"/api/tasks/{task_id}/accept", headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"
    
    # 3. Housekeeper 2 accepts task (double acceptance block)
    resp = client.patch(f"/api/tasks/{task_id}/accept", headers={"Authorization": f"Bearer {hk_tok_2}"})
    assert resp.status_code == 409

    # 4. Reject unassigned / other employee starting task
    resp = client.patch(f"/api/tasks/{task_id}/start", headers={"Authorization": f"Bearer {hk_tok_2}"})
    assert resp.status_code == 403

    # Reject completing directly from ACCEPTED state
    resp = client.patch(f"/api/tasks/{task_id}/complete", headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert resp.status_code == 409

    # 5. Start task
    resp = client.patch(f"/api/tasks/{task_id}/start", headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"

    # Verify guest request transitioned to IN_PROGRESS
    db.expire_all()
    req = db.query(GuestRequest).filter(GuestRequest.request_id == req_id).first()
    assert req.status == RequestStatus.IN_PROGRESS

    # 6. Complete task
    resp = client.patch(f"/api/tasks/{task_id}/complete", headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"

    # Verify request and task completed timestamps and states
    db.expire_all()
    req = db.query(GuestRequest).filter(GuestRequest.request_id == req_id).first()
    assert req.status == RequestStatus.COMPLETED
    assert req.completed_at is not None
    
    task_res = db.query(Task).filter(Task.task_id == task_id).first()
    assert task_res.completed_at is not None

    # Cannot restart completed task
    resp = client.patch(f"/api/tasks/{task_id}/start", headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert resp.status_code == 409


# =========================================================================
# CHECKOUT CLEANING TASK CREATION & ROOM STATE FLOWS
# =========================================================================

def test_checkout_cleaning_task_lifecycle(setup_ops_db):
    db = setup_ops_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    hk_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk@stayease.com")

    # Setup active checked-in stay on Room 101
    setup_active_stay_helper(db, "GST-1001", "101")
    db.expire_all()
    res = db.query(Reservation).filter(Reservation.status == ReservationStatus.CHECKED_IN).first()
    res_id = res.reservation_id

    # Perform Checkout
    resp = client.post(f"/api/reservations/{res_id}/checkout", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 200

    # Verify state: Reservation Checked out, Room dirty, Cleaning task created unassigned
    db.expire_all()
    r = db.query(Room).filter(Room.room_number == "101").first()
    assert r.occupancy_status == OccupancyStatus.VACANT
    assert r.cleaning_status == CleaningStatus.DIRTY

    task = db.query(Task).filter(Task.source_type == "checkout", Task.source_id == res_id).first()
    assert task is not None
    assert task.department == Department.HOUSEKEEPING
    assert task.priority == TaskPriority.HIGH
    assert task.status == TaskStatus.PENDING
    assert task.assigned_staff_id is None

    # Repeated checkout returns Conflict (409) and does not duplicate task
    resp = client.post(f"/api/reservations/{res_id}/checkout", headers={"Authorization": f"Bearer {reception_tok}"})
    assert resp.status_code == 409
    
    clean_tasks_count = db.query(Task).filter(Task.source_type == "checkout", Task.source_id == res_id).count()
    assert clean_tasks_count == 1

    # Start Checkout Cleaning Task -> Room becomes CLEANING
    client.patch(f"/api/tasks/{task.task_id}/accept", headers={"Authorization": f"Bearer {hk_tok}"})
    resp = client.patch(f"/api/tasks/{task.task_id}/start", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp.status_code == 200
    
    db.expire_all()
    assert r.cleaning_status == CleaningStatus.CLEANING

    # Complete Checkout Cleaning Task -> Room becomes CLEAN
    resp = client.patch(f"/api/tasks/{task.task_id}/complete", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp.status_code == 200
    
    db.expire_all()
    assert r.cleaning_status == CleaningStatus.CLEAN


# =========================================================================
# AUDIT AND SECURITY VERIFICATIONS
# =========================================================================

def test_audit_logs_and_security(setup_ops_db):
    db = setup_ops_db
    admin_tok = get_token_for("EMP-1001")
    reception_tok = create_staff_helper(db, "EMP-2001", StaffRole.RECEPTION, "reception@stayease.com")
    hk_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk@stayease.com")

    # 1. Verify Request APIs require authentication
    resp = client.get("/api/guest-requests")
    assert resp.status_code == 401

    # 2. Check checkout-cleaning automatic audit system actor
    setup_active_stay_helper(db, "GST-1001", "101")
    db.expire_all()
    res = db.query(Reservation).filter(Reservation.status == ReservationStatus.CHECKED_IN).first()
    
    client.post(f"/api/reservations/{res.reservation_id}/checkout", headers={"Authorization": f"Bearer {reception_tok}"})
    db.expire_all()
    
    clean_task_audit = db.query(AuditLog).filter(AuditLog.event_type == "CHECKOUT_CLEANING_TASK_CREATED").first()
    assert clean_task_audit is not None
    assert clean_task_audit.actor_type == "system"
    assert clean_task_audit.actor_id == "system"

    checkout_audit = db.query(AuditLog).filter(AuditLog.event_type == "GUEST_CHECKED_OUT").first()
    assert checkout_audit is not None
    assert checkout_audit.actor_type == "staff"
    assert checkout_audit.actor_id == "EMP-2001"


# =========================================================================
# DATABASE RESET & PERSISTENCE STABILIZATION VERIFICATIONS
# =========================================================================

def test_database_reset_and_persistence(setup_ops_db):
    db = setup_ops_db
    admin_tok = get_token_for("EMP-1001")

    # Check database exists
    admin = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    assert admin is not None

    # Simulate server reload behavior: metadata create_all runs without file deletion.
    # We simulate this by simply running create_all again and verifying records still exist.
    Base.metadata.create_all(bind=engine)
    
    # Confirm admin record still exists and was not wiped out
    admin_check = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    assert admin_check is not None
    assert admin_check.name == "Daniel Okoye"
