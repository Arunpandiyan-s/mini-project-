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
from app.models.assignment_rotation import AssignmentRotation
from app.models.enums import (
    StaffRole, EmploymentStatus, OccupancyStatus, CleaningStatus,
    MaintenanceStatus, ReservationStatus, RequestType, RequestStatus,
    Department, TaskStatus, TaskPriority, DutyStatus, AvailabilityStatus
)
from app.core.security import hash_password
from app.services.seed import seed_development_data
from app.services.assignment_service import sync_staff_availability, trigger_pending_assignments

# Use a separate SQLite database for assignment testing
TEST_DATABASE_URL = "sqlite:///./test_stayease.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_assign_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_development_data(db)
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
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

def create_staff_helper(db, staff_id: str, role: StaffRole, email: str, name: str = None) -> str:
    hashed = hash_password("password123")
    staff = Staff(
        staff_id=staff_id,
        name=name or f"Staff {staff_id}",
        email=email,
        phone="+91 99999 88888",
        password_hash=hashed,
        role=role,
        employment_status=EmploymentStatus.ACTIVE,
        duty_status=DutyStatus.ON_DUTY,
        availability_status=AvailabilityStatus.AVAILABLE
    )
    db.add(staff)
    db.commit()
    return get_token_for(staff_id)

def setup_active_stay_helper(db, guest_id: str, room_number: str) -> int:
    guest = Guest(guest_id=guest_id, name="Test Guest", email=f"{guest_id.lower()}@stayease.com")
    db.add(guest)
    db.flush()

    room = db.query(Room).filter(Room.room_number == room_number).first()
    if not room:
        room = Room(room_number=room_number, floor=1, room_type="Standard")
        db.add(room)
        db.flush()
    else:
        room.occupancy_status = OccupancyStatus.OCCUPIED
        room.cleaning_status = CleaningStatus.CLEAN
        room.maintenance_status = MaintenanceStatus.GOOD
        room.current_guest_id = guest.id
        db.flush()

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
# ROUND ROBIN ROTATION TESTS
# =========================================================================

def test_round_robin_rotation_and_departments(setup_assign_db):
    db = setup_assign_db
    admin_tok = get_token_for("EMP-1001")
    
    # Create 3 Housekeepers
    hk_tok_1 = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    hk_tok_2 = create_staff_helper(db, "EMP-3002", StaffRole.HOUSEKEEPING, "hk2@stayease.com")
    hk_tok_3 = create_staff_helper(db, "EMP-3003", StaffRole.HOUSEKEEPING, "hk3@stayease.com")
    
    # Create 2 Maintenance
    maint_tok_1 = create_staff_helper(db, "EMP-4001", StaffRole.MAINTENANCE, "m1@stayease.com")
    maint_tok_2 = create_staff_helper(db, "EMP-4002", StaffRole.MAINTENANCE, "m2@stayease.com")

    # Setup 3 active stays for room housekeeping requests
    setup_active_stay_helper(db, "GST-1001", "101")
    setup_active_stay_helper(db, "GST-1002", "102")
    setup_active_stay_helper(db, "GST-1003", "103")

    # 1. First task goes to first eligible employee (EMP-3001)
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 201
    
    db.expire_all()
    task1 = db.query(Task).filter(Task.source_id == resp.json()["request_id"]).first()
    emp1 = db.query(Staff).filter(Staff.staff_id == "EMP-3001").first()
    assert task1.assigned_staff_id == emp1.id
    assert emp1.availability_status == AvailabilityStatus.BUSY

    # 2. Second task goes to next employee (EMP-3002)
    resp2 = client.post("/api/guest-requests", json={
        "guest_id": "GST-1002",
        "room_number": "102",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp2.status_code == 201
    
    db.expire_all()
    task2 = db.query(Task).filter(Task.source_id == resp2.json()["request_id"]).first()
    emp2 = db.query(Staff).filter(Staff.staff_id == "EMP-3002").first()
    assert task2.assigned_staff_id == emp2.id
    assert emp2.availability_status == AvailabilityStatus.BUSY

    # 3. Third goes to next employee (EMP-3003)
    resp3 = client.post("/api/guest-requests", json={
        "guest_id": "GST-1003",
        "room_number": "103",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp3.status_code == 201

    db.expire_all()
    task3 = db.query(Task).filter(Task.source_id == resp3.json()["request_id"]).first()
    emp3 = db.query(Staff).filter(Staff.staff_id == "EMP-3003").first()
    assert task3.assigned_staff_id == emp3.id
    assert emp3.availability_status == AvailabilityStatus.BUSY

    # Verify Rotation survives application restart / database reload
    # Query database directly to verify Rotation table has 'EMP-3003'
    rotation = db.query(AssignmentRotation).filter(AssignmentRotation.department == Department.HOUSEKEEPING).first()
    assert rotation.last_assigned_staff_id == "EMP-3003"
    
    # Reload rotation: metadata tables creation simulated
    Base.metadata.create_all(bind=engine)
    rotation_recheck = db.query(AssignmentRotation).filter(AssignmentRotation.department == Department.HOUSEKEEPING).first()
    assert rotation_recheck.last_assigned_staff_id == "EMP-3003"

    # 4. Each department maintains independent rotation
    # Create a Maintenance request -> should assign to EMP-4001, without affecting Housekeeping position.
    resp_m = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "maintenance"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp_m.status_code == 201
    
    db.expire_all()
    m_task = db.query(Task).filter(Task.source_id == resp_m.json()["request_id"]).first()
    m_emp1 = db.query(Staff).filter(Staff.staff_id == "EMP-4001").first()
    assert m_task.assigned_staff_id == m_emp1.id
    
    m_rot = db.query(AssignmentRotation).filter(AssignmentRotation.department == Department.MAINTENANCE).first()
    assert m_rot.last_assigned_staff_id == "EMP-4001"
    
    hk_rot = db.query(AssignmentRotation).filter(AssignmentRotation.department == Department.HOUSEKEEPING).first()
    assert hk_rot.last_assigned_staff_id == "EMP-3003"  # Unaffected!


# =========================================================================
# ELIGIBILITY CHECKS
# =========================================================================

def test_eligibility_constraints(setup_assign_db):
    db = setup_assign_db
    admin_tok = get_token_for("EMP-1001")

    # Setup staff members with different status
    hk1 = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first() # ADMIN - excluded from automatic assignment
    
    # Create:
    # EMP-3001 -> ON_DUTY + ACTIVE + AVAILABLE (Eligible)
    create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    
    # EMP-3002 -> OFF_DUTY + ACTIVE + AVAILABLE (OFF_DUTY skipped)
    create_staff_helper(db, "EMP-3002", StaffRole.HOUSEKEEPING, "hk2@stayease.com")
    emp3002 = db.query(Staff).filter(Staff.staff_id == "EMP-3002").first()
    emp3002.duty_status = DutyStatus.OFF_DUTY
    
    # EMP-3003 -> ON_DUTY + SUSPENDED + AVAILABLE (Suspended skipped)
    create_staff_helper(db, "EMP-3003", StaffRole.HOUSEKEEPING, "hk3@stayease.com")
    emp3003 = db.query(Staff).filter(Staff.staff_id == "EMP-3003").first()
    emp3003.employment_status = EmploymentStatus.SUSPENDED
    
    # EMP-3004 -> ON_DUTY + ACTIVE + BUSY (Busy skipped)
    create_staff_helper(db, "EMP-3004", StaffRole.HOUSEKEEPING, "hk4@stayease.com")
    emp3004 = db.query(Staff).filter(Staff.staff_id == "EMP-3004").first()
    emp3004.availability_status = AvailabilityStatus.BUSY
    
    # EMP-4001 -> ON_DUTY + ACTIVE + AVAILABLE (Wrong department skipped)
    create_staff_helper(db, "EMP-4001", StaffRole.MAINTENANCE, "maint1@stayease.com")

    db.commit()

    # Create Housekeeping request
    setup_active_stay_helper(db, "GST-1001", "101")
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 201
    
    db.expire_all()
    task = db.query(Task).filter(Task.source_id == resp.json()["request_id"]).first()
    eligible_emp = db.query(Staff).filter(Staff.staff_id == "EMP-3001").first()
    
    # Verify task was assigned to EMP-3001, skipping all others
    assert task.assigned_staff_id == eligible_emp.id


# =========================================================================
# STAFF STATUS CHANGES & RETRIES
# =========================================================================

def test_busy_free_sync_and_retry_queues(setup_assign_db):
    db = setup_assign_db
    admin_tok = get_token_for("EMP-1001")
    
    hk1_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    emp3001 = db.query(Staff).filter(Staff.staff_id == "EMP-3001").first()

    setup_active_stay_helper(db, "GST-1001", "101")
    setup_active_stay_helper(db, "GST-1002", "102")

    # 1. Guest request Task A -> Assigned to EMP-3001 -> EMP-3001 becomes BUSY
    resp_a = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    db.expire_all()
    assert emp3001.availability_status == AvailabilityStatus.BUSY

    task_a = db.query(Task).filter(Task.source_id == resp_a.json()["request_id"]).first()

    # 2. Guest request Task B (HIGH priority maintenance, but let's test Housekeeping priority first)
    # File another extra_towel task (Medium) and toiletries task (Medium)
    resp_b = client.post("/api/guest-requests", json={
        "guest_id": "GST-1002",
        "room_number": "102",
        "request_type": "toiletries" # Medium priority
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    
    db.expire_all()
    task_b = db.query(Task).filter(Task.source_id == resp_b.json()["request_id"]).first()
    
    # Task B remains unassigned because EMP-3001 is BUSY
    assert task_b.assigned_staff_id is None
    assert task_b.status == TaskStatus.PENDING

    # 3. Check for TASK_ASSIGNMENT_PENDING audit log
    audit_pending = db.query(AuditLog).filter(
        AuditLog.event_type == "TASK_ASSIGNMENT_PENDING",
        AuditLog.entity_id == task_b.task_id
    ).first()
    assert audit_pending is not None

    # 4. Let's accept and complete Task A using EMP-3001
    client.patch(f"/api/tasks/{task_a.task_id}/accept", headers={"Authorization": f"Bearer {hk1_tok}"})
    client.patch(f"/api/tasks/{task_a.task_id}/start", headers={"Authorization": f"Bearer {hk1_tok}"})
    resp_complete = client.patch(f"/api/tasks/{task_a.task_id}/complete", headers={"Authorization": f"Bearer {hk1_tok}"})
    assert resp_complete.status_code == 200

    db.expire_all()
    # 5. After completion of Task A, retry runs automatically -> Task B is assigned to newly freed EMP-3001
    assert task_b.assigned_staff_id == emp3001.id
    assert emp3001.availability_status == AvailabilityStatus.BUSY  # Back to BUSY!

    # 6. Verify staff with active task cannot falsely mark themselves AVAILABLE
    # Staff Update schema or endpoints block direct availability overrides. Let's test staff update on duty endpoint
    resp_status = client.patch("/api/staff/me/duty-status", json={"duty_status": "off_duty"}, headers={"Authorization": f"Bearer {hk1_tok}"})
    assert resp_status.status_code == 409 # Blocked since Task B is assigned PENDING to EMP-3001!


# =========================================================================
# MANUAL ASSIGNMENT & REASSIGNMENT
# =========================================================================

def test_admin_manual_assignment_and_reassignment(setup_assign_db):
    db = setup_assign_db
    admin_tok = get_token_for("EMP-1001")
    hk_tok_1 = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    hk_tok_2 = create_staff_helper(db, "EMP-3002", StaffRole.HOUSEKEEPING, "hk2@stayease.com")

    emp1 = db.query(Staff).filter(Staff.staff_id == "EMP-3001").first()
    emp2 = db.query(Staff).filter(Staff.staff_id == "EMP-3002").first()

    # Create unassigned task (make both housekeepers busy, create task, then free them)
    emp1.availability_status = AvailabilityStatus.BUSY
    emp2.availability_status = AvailabilityStatus.BUSY
    db.commit()

    setup_active_stay_helper(db, "GST-1001", "101")
    resp_a = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    
    db.expire_all()
    task = db.query(Task).filter(Task.source_id == resp_a.json()["request_id"]).first()
    assert task.assigned_staff_id is None

    # Free employees
    emp1.availability_status = AvailabilityStatus.AVAILABLE
    emp2.availability_status = AvailabilityStatus.AVAILABLE
    db.commit()

    # 1. Admin manual assigns task to EMP-3002
    resp_assign = client.patch(f"/api/tasks/{task.task_id}/assign", json={"staff_id": "EMP-3002"}, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp_assign.status_code == 200
    
    db.expire_all()
    assert task.assigned_staff_id == emp2.id
    assert emp2.availability_status == AvailabilityStatus.BUSY
    
    # Verify rotation position was NOT changed (remains empty or unaffected)
    rot = db.query(AssignmentRotation).filter(AssignmentRotation.department == Department.HOUSEKEEPING).first()
    assert rot is None or rot.last_assigned_staff_id is None

    # 2. Admin reassigns task to EMP-3001
    resp_reassign = client.patch(f"/api/tasks/{task.task_id}/reassign", json={"staff_id": "EMP-3001"}, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp_reassign.status_code == 200

    db.expire_all()
    assert task.assigned_staff_id == emp1.id
    assert emp1.availability_status == AvailabilityStatus.BUSY
    assert emp2.availability_status == AvailabilityStatus.AVAILABLE  # Free again!

    # 3. Reject reassignment of IN_PROGRESS tasks
    client.patch(f"/api/tasks/{task.task_id}/accept", headers={"Authorization": f"Bearer {hk_tok_1}"})
    client.patch(f"/api/tasks/{task.task_id}/start", headers={"Authorization": f"Bearer {hk_tok_1}"})

    resp_reassign_fail = client.patch(f"/api/tasks/{task.task_id}/reassign", json={"staff_id": "EMP-3002"}, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp_reassign_fail.status_code == 409


# =========================================================================
# DUTY STATUS & SECURITY RBAC
# =========================================================================

def test_duty_status_transitions_and_my_tasks(setup_assign_db):
    db = setup_assign_db
    admin_tok = get_token_for("EMP-1001")
    hk_tok_1 = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    
    # 1. Staff queries own tasks
    my_tasks = client.get("/api/tasks/my", headers={"Authorization": f"Bearer {hk_tok_1}"}).json()
    assert len(my_tasks) == 0

    # 2. Free employee goes OFF_DUTY
    resp_off = client.patch("/api/staff/me/duty-status", json={"duty_status": "off_duty"}, headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert resp_off.status_code == 200
    assert resp_off.json()["duty_status"] == "off_duty"

    # 3. Admin queries rotations status endpoint
    rot_resp = client.get("/api/assignment-rotation", headers={"Authorization": f"Bearer {admin_tok}"})
    assert rot_resp.status_code == 200

    # Housekeeper trying to query rotations gets 403
    rot_resp_hk = client.get("/api/assignment-rotation", headers={"Authorization": f"Bearer {hk_tok_1}"})
    assert rot_resp_hk.status_code == 403
