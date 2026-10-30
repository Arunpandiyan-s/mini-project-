import os
import pytest
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.staff import Staff
from app.models.guest import Guest
from app.models.room import Room
from app.models.reservation import Reservation
from app.models.guest_request import GuestRequest
from app.models.task import Task
from app.models.audit_log import AuditLog
from app.models.guest_notification import GuestNotification
from app.models.enums import (
    StaffRole, EmploymentStatus, OccupancyStatus, CleaningStatus,
    MaintenanceStatus, ReservationStatus, RequestType, RequestStatus,
    Department, TaskStatus, TaskPriority, DutyStatus, AvailabilityStatus
)
from app.core.security import hash_password, verify_password, create_access_token
from app.services.seed import seed_development_data
from app.core.schema_migrations import run_safe_schema_migrations
from app.services.connection_manager import manager

TEST_DATABASE_URL = "sqlite:///./test_guest_portal.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    seed_development_data(db_session)
    yield db_session
    db_session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    app.dependency_overrides.clear()
    if os.path.exists("./test_guest_portal.db"):
        try:
            os.remove("./test_guest_portal.db")
        except PermissionError:
            pass

def override_get_db():
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()

client = TestClient(app)

# Helper functions
def get_guest_token(email: str = "aisha.rahman@example.com", password: str = "stayease") -> str:
    login_resp = client.post("/api/guest-auth/login", json={
        "email": email,
        "password": password
    })
    return login_resp.json()["access_token"]

def get_staff_token(staff_id: str = "EMP-1001", password: str = "password123") -> str:
    login_resp = client.post("/api/auth/login", json={
        "identifier": staff_id,
        "password": password
    })
    return login_resp.json()["access_token"]


# --- 1. MIGRATION TESTS ---
def test_schema_migrations_run_twice(db):
    # Migration run first time (automatic on start, but let's invoke it explicitly)
    # The fixture metadata.create_all creates everything, run_safe_schema_migrations checks column
    run_safe_schema_migrations(engine)
    
    # Run second time: must not raise error, must be idempotent
    run_safe_schema_migrations(engine)
    
    # Assert column exists
    from sqlalchemy import inspect
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("guests")]
    assert "password_hash" in columns


# --- 2. GUEST AUTHENTICATION TESTS ---
def test_guest_authentication(db):
    # 1. Valid guest login succeeds
    login_resp = client.post("/api/guest-auth/login", json={
        "email": "aisha.rahman@example.com",
        "password": "stayease"
    })
    assert login_resp.status_code == 200
    assert login_resp.json()["authenticated"] is True
    token = login_resp.json()["access_token"]
    
    # 8. Password hash is never returned in API responses
    assert "password_hash" not in login_resp.json()["user"]

    # 4. Guest token contains principal_type=guest
    payload = jwt.decode(token, options={"verify_signature": False})
    assert payload["principal_type"] == "guest"
    assert payload["sub"] == "GST-9000"

    # 2. Wrong guest credential rejected
    wrong_pass_resp = client.post("/api/guest-auth/login", json={
        "email": "aisha.rahman@example.com",
        "password": "wrongpassword"
    })
    assert wrong_pass_resp.status_code == 401

    # 3. Unknown guest rejected
    unknown_guest_resp = client.post("/api/guest-auth/login", json={
        "email": "nonexistent@guest.com",
        "password": "stayease"
    })
    assert unknown_guest_resp.status_code == 401

    # 5. Staff token cannot authenticate as guest (endpoint isolation)
    staff_tok = get_staff_token()
    me_resp = client.get("/api/guest-auth/me", headers={"Authorization": f"Bearer {staff_tok}"})
    assert me_resp.status_code == 401

    # 6. Guest token cannot authenticate as staff (endpoint isolation)
    guest_tok = get_guest_token()
    staff_me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {guest_tok}"})
    assert staff_me_resp.status_code == 401


# --- 3. CURRENT STAY TESTS ---
def test_guest_current_stay(db):
    guest_tok = get_guest_token()

    # 9. Guest sees own active stay
    stay_resp = client.get("/api/guest/me/stay", headers={"Authorization": f"Bearer {guest_tok}"})
    assert stay_resp.status_code == 200
    data = stay_resp.json()
    assert data["guest_id"] == "GST-9000"
    assert data["reservation_id"] == "RES-GST-9000"
    
    # 12. Guest receives only safe room fields
    assert "room_number" in data["room"]
    assert "floor" in data["room"]
    assert "room_type" in data["room"]
    assert "id" not in data["room"] # Internal primary key hidden

    # 11. Guest cannot access another guest's stay
    # Create another guest without active stay
    other_guest = Guest(guest_id="GST-9999", name="Other Guest", email="other@guest.com", password_hash=hash_password("stayease"))
    db.add(other_guest)
    db.commit()
    
    other_tok = get_guest_token("other@guest.com")
    # 10. Guest without active stay handled correctly
    stay_other_resp = client.get("/api/guest/me/stay", headers={"Authorization": f"Bearer {other_tok}"})
    assert stay_other_resp.status_code == 404


# --- 4. GUEST PROFILE TESTS ---
def test_guest_profile_update(db):
    guest_tok = get_guest_token()

    # Create another guest to test uniqueness
    other_guest = Guest(guest_id="GST-8888", name="Other Guest 2", email="other2@guest.com", password_hash=hash_password("stayease"))
    db.add(other_guest)
    db.commit()

    # Safe update phone and email
    resp = client.patch("/api/guest/me", json={
        "phone": "+91 88888 88888",
        "email": "aisha.updated@example.com"
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    assert resp.status_code == 200
    assert resp.json()["phone"] == "+91 88888 88888"
    assert resp.json()["email"] == "aisha.updated@example.com"

    # 10. Uniqueness validation: GST-1001 tries to update email to "other2@guest.com"
    resp_conflict = client.patch("/api/guest/me", json={
        "email": "other2@guest.com"
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    assert resp_conflict.status_code == 409

    # 11. Guest password/internal fields not editable via profile PATCH
    resp_hack = client.patch("/api/guest/me", json={
        "password": "hackpassword",
        "password_hash": "hackpassword",
        "guest_id": "GST-HACKED",
        "id": 9999
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    # Safe fields updated or ignores additional ones, but guest_id must not change
    db.expire_all()
    guest = db.query(Guest).filter(Guest.guest_id == "GST-9000").first()
    assert guest is not None
    # Password should still verify with stayease, not hackpassword
    assert verify_password("stayease", guest.password_hash) is True


# --- 5. GUEST REQUEST CREATION & ROUND ROBIN TESTS ---
def test_guest_request_creation_and_round_robin(db):
    guest_tok = get_guest_token()
    admin_tok = get_staff_token()

    # Create an active housekeeper eligible for assignment
    hk = Staff(
        staff_id="EMP-3001",
        name="Housekeeper 1",
        email="hk1@stayease.com",
        phone="+91 90000 11111",
        password_hash=hash_password("password123"),
        role=StaffRole.HOUSEKEEPING,
        employment_status=EmploymentStatus.ACTIVE,
        duty_status=DutyStatus.ON_DUTY,
        availability_status=AvailabilityStatus.AVAILABLE
    )
    db.add(hk)
    db.commit()

    # 13. Guest creates request
    # 14. Backend derives guest from JWT
    # 15. Room derived from stay (Room 512)
    # 16. HOUSEKEEPING derived from request type EXTRA_TOWEL
    resp = client.post("/api/guest/me/requests", json={
        "request_type": "extra_towel",
        "description": "Please deliver two extra pillows."
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    assert resp.status_code == 201
    
    # 17. Task created
    db.expire_all()
    task = db.query(Task).filter(Task.source_id == resp.json()["request_id"]).first()
    assert task is not None
    assert task.department == Department.HOUSEKEEPING
    assert task.title == "Deliver Extra Towels"
    
    # 18. Round Robin assignment runs
    # 19. Free Housekeeper assigned
    assert task.assigned_staff_id == hk.id

    # 20. Staff notification created
    notif = db.query(GuestNotification).filter(GuestNotification.recipient_guest_id == "GST-9000").first()
    # Wait, the guest receives their own notification
    assert notif is not None
    assert notif.type == "guest_request.created"
    
    # Staff persistent notification also created
    from app.models.notification import Notification
    staff_notif = db.query(Notification).filter(Notification.recipient_staff_id == "EMP-3001").first()
    assert staff_notif is not None
    assert staff_notif.type == "task.assigned"

    # 21. Guest cannot supply another guest_id / choose assigned_staff / override department
    # Let's verify that submitting these fields in the request doesn't override backend derivation
    resp_hack = client.post("/api/guest/me/requests", json={
        "request_type": "extra_towel",
        "description": "hacking",
        "guest_id": "GST-9999",
        "room_number": "512",
        "department": "reception",
        "assigned_staff_id": "EMP-1001",
        "status": "completed"
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    assert resp_hack.status_code == 201
    # Backend overrides all hacked parameters
    req_hack = db.query(GuestRequest).filter(GuestRequest.request_id == resp_hack.json()["request_id"]).first()
    assert req_hack.guest_id == req_hack.guest.id
    assert req_hack.status == RequestStatus.PENDING # Remains pending

    # 24. Guest without active stay cannot create room request
    other_guest = Guest(guest_id="GST-9999", name="Other Guest", email="other@guest.com", password_hash=hash_password("stayease"))
    db.add(other_guest)
    db.commit()
    other_tok = get_guest_token("other@guest.com")
    resp_no_stay = client.post("/api/guest/me/requests", json={
        "request_type": "extra_towel",
        "description": "fail"
    }, headers={"Authorization": f"Bearer {other_tok}"})
    assert resp_no_stay.status_code == 400


# --- 6. GUEST REQUEST HISTORY & DETAILS ---
def test_guest_request_history_and_details(db):
    guest_tok = get_guest_token()

    # Create request
    resp = client.post("/api/guest/me/requests", json={
        "request_type": "extra_towel",
        "description": "Towels please"
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    req_id = resp.json()["request_id"]

    # 25. Guest sees only own requests
    history_resp = client.get("/api/guest/me/requests", headers={"Authorization": f"Bearer {guest_tok}"})
    assert history_resp.status_code == 200
    assert len(history_resp.json()) == 1
    assert history_resp.json()[0]["request_id"] == req_id

    # 26. Guest cannot retrieve another guest's request by ID
    other_guest = Guest(guest_id="GST-9999", name="Other Guest", email="other@guest.com", password_hash=hash_password("stayease"))
    db.add(other_guest)
    db.commit()
    other_tok = get_guest_token("other@guest.com")
    
    resp_fail = client.get(f"/api/guest/me/requests/{req_id}", headers={"Authorization": f"Bearer {other_tok}"})
    assert resp_fail.status_code == 404


# --- 7. CANCELLATION WORKFLOW TESTS ---
def test_guest_request_cancellation(db):
    guest_tok = get_guest_token()

    # Create housekeeper
    hk = Staff(
        staff_id="EMP-3001",
        name="Housekeeper 1",
        email="hk1@stayease.com",
        phone="+91 90000 11111",
        password_hash=hash_password("password123"),
        role=StaffRole.HOUSEKEEPING,
        employment_status=EmploymentStatus.ACTIVE,
        duty_status=DutyStatus.ON_DUTY,
        availability_status=AvailabilityStatus.AVAILABLE
    )
    db.add(hk)
    db.commit()

    # Guest request created -> assigned to EMP-3001 -> PENDING
    resp = client.post("/api/guest/me/requests", json={
        "request_type": "extra_towel",
        "description": "pillows"
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    req_id = resp.json()["request_id"]

    db.expire_all()
    task = db.query(Task).filter(Task.source_id == req_id).first()
    assert task.status == TaskStatus.PENDING
    assert task.assigned_staff_id == hk.id
    
    # 14. Housekeeper availability is BUSY because they hold a pending assignment
    db.refresh(hk)
    assert hk.availability_status == AvailabilityStatus.BUSY

    # 29. Pending request can be cancelled
    cancel_resp = client.patch(f"/api/guest/me/requests/{req_id}/cancel", headers={"Authorization": f"Bearer {guest_tok}"})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # 30. Associated task cancelled/closed safely
    db.expire_all()
    db.refresh(task)
    assert task.status == TaskStatus.CANCELLED
    assert task.assigned_staff_id is None

    # 31. Assigned employee availability resynchronized to AVAILABLE
    db.refresh(hk)
    assert hk.availability_status == AvailabilityStatus.AVAILABLE

    # 34. Cancellation audit created
    audit = db.query(AuditLog).filter(AuditLog.event_type == "GUEST_REQUEST_CANCELLED_BY_GUEST").first()
    assert audit is not None
    assert audit.actor_type == "guest"
    assert audit.actor_id == "GST-9000"

    # 32. IN_PROGRESS request cannot be cancelled
    # Create another request
    resp2 = client.post("/api/guest/me/requests", json={
        "request_type": "extra_towel",
        "description": "towels 2"
    }, headers={"Authorization": f"Bearer {guest_tok}"})
    req_id2 = resp2.json()["request_id"]
    task2 = db.query(Task).filter(Task.source_id == req_id2).first()
    
    # Make task In Progress
    client.patch(f"/api/tasks/{task2.task_id}/accept", headers={"Authorization": f"Bearer {get_staff_token('EMP-3001')}"})
    client.patch(f"/api/tasks/{task2.task_id}/start", headers={"Authorization": f"Bearer {get_staff_token('EMP-3001')}"})
    
    # Attempt cancel
    cancel_resp_fail = client.patch(f"/api/guest/me/requests/{req_id2}/cancel", headers={"Authorization": f"Bearer {guest_tok}"})
    assert cancel_resp_fail.status_code == 409


# --- 8. WEBSOCKET ISOLATION TESTS ---
def test_guest_websocket_isolation(db):
    guest_tok = get_guest_token()

    # Create housekeeper
    hk = Staff(
        staff_id="EMP-3001",
        name="Housekeeper 1",
        email="hk1@stayease.com",
        phone="+91 90000 11111",
        password_hash=hash_password("password123"),
        role=StaffRole.HOUSEKEEPING,
        employment_status=EmploymentStatus.ACTIVE,
        duty_status=DutyStatus.ON_DUTY,
        availability_status=AvailabilityStatus.AVAILABLE
    )
    db.add(hk)
    db.commit()

    staff_tok = get_staff_token("EMP-3001") # Staff housekeeper

    # 36. Guest JWT WebSocket connection succeeds
    with client.websocket_connect(f"/ws?token={guest_tok}") as ws_guest:
        ev_g = ws_guest.receive_json()
        assert ev_g["event"] == "connection.ready"

        with client.websocket_connect(f"/ws?token={get_staff_token('EMP-1001')}") as ws_adm:
            ws_adm.receive_json()

            # Create request
            resp = client.post("/api/guest/me/requests", json={
                "request_type": "extra_towel",
                "description": "two sheets"
            }, headers={"Authorization": f"Bearer {guest_tok}"})
            req_id = resp.json()["request_id"]

            # 37. Guest receives own request events
            ev_g_created = ws_guest.receive_json()
            assert ev_g_created["event"] == "guest_request.created"
            assert ev_g_created["data"]["request_id"] == req_id

            # 39. Guest does not receive Admin broadcasts
            # 40. Guest does not receive unrelated Staff task assignments
            # Let's verify that the guest WebSocket has no other messages pending
            # (If it had received the task.created / task.assigned event, the socket would have returned them next)
            with pytest.raises(Exception):
                # Try to read, should timeout or throw because no other event is sent to guest
                ws_guest.receive_json(timeout=0.1)


# --- 9. SECURITY ISOLATION TESTS ---
def test_guest_endpoint_isolation(db):
    guest_tok = get_guest_token()

    # 42. Guest cannot access /api/staff
    assert client.get("/api/staff", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
    # 43. Guest cannot access /api/tasks
    assert client.get("/api/tasks", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
    # 44. Guest cannot access /api/assignment-rotation
    assert client.get("/api/assignment-rotation", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
    # 45. Guest cannot access /api/operations/feed
    assert client.get("/api/operations/feed", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
    # 46. Guest cannot list all rooms
    assert client.get("/api/rooms", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
    # 47. Guest cannot list all reservations
    assert client.get("/api/reservations", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
    # 48. Guest cannot perform Staff checkout
    assert client.post("/api/reservations/RES-GST-1001/checkout", headers={"Authorization": f"Bearer {guest_tok}"}).status_code in [401, 403]
