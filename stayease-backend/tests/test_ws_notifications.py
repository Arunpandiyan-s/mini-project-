import os
import jwt
import pytest
import unittest.mock as mock
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
from app.models.notification import Notification
from app.models.enums import (
    StaffRole, EmploymentStatus, OccupancyStatus, CleaningStatus,
    MaintenanceStatus, ReservationStatus, RequestType, RequestStatus,
    Department, TaskStatus, TaskPriority, DutyStatus, AvailabilityStatus
)
from app.core.security import hash_password, create_access_token
from app.services.seed import seed_development_data
from app.services.connection_manager import manager

TEST_DATABASE_URL = "sqlite:///./test_ws_notifications.db"

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
    if os.path.exists("./test_ws_notifications.db"):
        try:
            os.remove("./test_ws_notifications.db")
        except PermissionError:
            pass

# Override database dependency in app
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

# Helper functions
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

def setup_active_stay_helper(db, guest_id: str, room_number: str):
    guest = Guest(guest_id=guest_id, name="Test Guest", email=f"{guest_id}@guest.com")
    db.add(guest)
    db.flush()
    room = db.query(Room).filter(Room.room_number == room_number).first()
    res = Reservation(
        reservation_id=f"RES-{guest_id}",
        guest_id=guest.id,
        room_id=room.id,
        check_in=datetime.now(timezone.utc) - timedelta(days=1),
        check_out=datetime.now(timezone.utc) + timedelta(days=2),
        status=ReservationStatus.CHECKED_IN
    )
    db.add(res)
    room.occupancy_status = OccupancyStatus.OCCUPIED
    room.current_guest_id = guest.id
    db.commit()

# --- 1. WEBSOCKET AUTHENTICATION TESTS ---
def test_ws_authentication(db):
    token = get_token_for("EMP-1001") # Valid JWT for admin

    # A. Valid JWT connection succeeds
    with client.websocket_connect(f"/ws?token={token}") as ws:
        data = ws.receive_json()
        assert data["event"] == "connection.ready"
        assert data["data"]["staff_id"] == "EMP-1001"

    # B. Missing token rejected
    with pytest.raises(Exception):
        with client.websocket_connect("/ws") as ws:
            pass

    # C. Invalid JWT rejected
    with pytest.raises(Exception):
        with client.websocket_connect("/ws?token=invalid.jwt.token") as ws:
            pass

    # D. Expired JWT rejected
    admin = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    expired_token = create_access_token(
        data={"sub": str(admin.id), "staff_id": admin.staff_id},
        expires_delta=timedelta(seconds=-10)
    )
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws?token={expired_token}") as ws:
            pass

    # E. Suspended employee rejected
    hk_tok = create_staff_helper(db, "EMP-3005", StaffRole.HOUSEKEEPING, "hk5@stayease.com")
    hk_staff = db.query(Staff).filter(Staff.staff_id == "EMP-3005").first()
    hk_staff.employment_status = EmploymentStatus.SUSPENDED
    db.commit()

    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws?token={hk_tok}") as ws:
            pass

    # F. Role specific connections succeed
    admin_tok = get_token_for("EMP-1001")
    hk_tok_active = create_staff_helper(db, "EMP-3006", StaffRole.HOUSEKEEPING, "hk6@stayease.com")
    
    with client.websocket_connect(f"/ws?token={admin_tok}") as ws_adm:
        data = ws_adm.receive_json()
        assert data["event"] == "connection.ready"

    with client.websocket_connect(f"/ws?token={hk_tok_active}") as ws_hk:
        data = ws_hk.receive_json()
        assert data["event"] == "connection.ready"


# --- 2. CONNECTION MANAGER TESTS ---
def test_connection_manager_multi_and_dead_sockets(db):
    token = get_token_for("EMP-1001")

    # A. Multiple connections for same employee supported
    with client.websocket_connect(f"/ws?token={token}") as ws1:
        data1 = ws1.receive_json()
        assert data1["event"] == "connection.ready"

        with client.websocket_connect(f"/ws?token={token}") as ws2:
            data2 = ws2.receive_json()
            assert data2["event"] == "connection.ready"

            # Check both registered
            assert len(manager.active_connections["EMP-1001"]) == 2

            # Dispatch broadcast, check both receive
            from app.services.event_service import emit_event
            emit_event("test.broadcast", {"msg": "hello"}, send_to_all_admins=False, recipient_staff_id="EMP-1001")
            
            ev1 = ws1.receive_json()
            ev2 = ws2.receive_json()
            assert ev1["event"] == "test.broadcast"
            assert ev2["event"] == "test.broadcast"

        # B. Disconnect removes socket
        assert len(manager.active_connections["EMP-1001"]) == 1

    assert "EMP-1001" not in manager.active_connections


# --- 3. NOTIFICATION PERSISTENCE & OFFLINE-ONLINE TESTS ---
def test_offline_notification_and_retrieval(db):
    admin_tok = get_token_for("EMP-1001")
    # Housekeeper is offline (no active WebSocket connection)
    hk_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    setup_active_stay_helper(db, "GST-1001", "101")

    # 1. Assign task via guest request
    resp = client.post("/api/guest-requests", json={
        "guest_id": "GST-1001",
        "room_number": "101",
        "request_type": "extra_towel"
    }, headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 201

    # 2. Check task was assigned to EMP-3001
    db.expire_all()
    task = db.query(Task).filter(Task.source_id == resp.json()["request_id"]).first()
    assert task.assigned_staff.staff_id == "EMP-3001"

    # 3. Verify notification is persisted in database
    notif = db.query(Notification).filter(Notification.recipient_staff_id == "EMP-3001").first()
    assert notif is not None
    assert notif.type == "task.assigned"
    assert notif.is_read is False
    assert notif.entity_id == task.task_id

    # 4. Check list notifications for EMP-3001
    resp_notif = client.get("/api/notifications", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_notif.status_code == 200
    assert len(resp_notif.json()) == 1
    assert resp_notif.json()[0]["notification_id"] == notif.notification_id
    assert "password_hash" not in resp_notif.json()[0] # No security fields exposed

    # 5. Check unread count
    resp_count = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_count.json()["unread_count"] == 1

    # 6. Read notification of other staff should fail (ownership validation)
    other_tok = create_staff_helper(db, "EMP-4001", StaffRole.MAINTENANCE, "m1@stayease.com")
    resp_read_fail = client.patch(f"/api/notifications/{notif.notification_id}/read", headers={"Authorization": f"Bearer {other_tok}"})
    assert resp_read_fail.status_code == 404

    # 7. Read own notification succeeds
    resp_read = client.patch(f"/api/notifications/{notif.notification_id}/read", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_read.status_code == 200
    assert resp_read.json()["is_read"] is True

    # 8. Unread count becomes 0
    resp_count_2 = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_count_2.json()["unread_count"] == 0

    # 9. Mark all read
    # Create another notification for test
    from app.services.notification_service import create_notification
    create_notification(db, "EMP-3001", "task.alert", "Alert", "Alert msg")
    db.commit()

    resp_count_3 = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_count_3.json()["unread_count"] == 1

    resp_read_all = client.patch("/api/notifications/read-all", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_read_all.status_code == 200
    
    resp_count_4 = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_count_4.json()["unread_count"] == 0


# --- 4. REAL-TIME EVENT WORKFLOWS ---
def test_realtime_events_workflows(db):
    admin_tok = get_token_for("EMP-1001")
    hk_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    setup_active_stay_helper(db, "GST-1001", "101")

    # Connect staff member
    with client.websocket_connect(f"/ws?token={hk_tok}") as ws_hk:
        ws_hk.receive_json() # connection.ready

        # Connect admin
        with client.websocket_connect(f"/ws?token={admin_tok}") as ws_adm:
            ws_adm.receive_json() # connection.ready

            # A. Guest Request -> creates task -> assigns to EMP-3001
            resp = client.post("/api/guest-requests", json={
                "guest_id": "GST-1001",
                "room_number": "101",
                "request_type": "extra_towel"
            }, headers={"Authorization": f"Bearer {admin_tok}"})
            assert resp.status_code == 201
            task_id = db.query(Task).first().task_id

            # B. Assigned employee receives task.assigned event
            ev_hk = ws_hk.receive_json()
            assert ev_hk["event"] == "task.assigned"
            assert ev_hk["data"]["task_id"] == task_id
            assert "password_hash" not in ev_hk["data"] # Safety: No PII/security details
            assert "jwt" not in ev_hk["data"]

            # C. Admin receives task.created and task.assigned events
            ev_adm1 = ws_adm.receive_json() # guest_request.created
            ev_adm2 = ws_adm.receive_json() # task.created
            ev_adm3 = ws_adm.receive_json() # task.assigned
            assert ev_adm1["event"] == "guest_request.created"
            assert ev_adm2["event"] == "task.created"
            assert ev_adm3["event"] == "task.assigned"

            # D. Staff accepts task -> task.accepted emitted
            client.patch(f"/api/tasks/{task_id}/accept", headers={"Authorization": f"Bearer {hk_tok}"})
            ev_hk_acc = ws_hk.receive_json()
            assert ev_hk_acc["event"] == "task.accepted"
            ev_adm_acc = ws_adm.receive_json()
            assert ev_adm_acc["event"] == "task.accepted"

            # E. Staff starts task -> task.started and guest_request.in_progress emitted
            client.patch(f"/api/tasks/{task_id}/start", headers={"Authorization": f"Bearer {hk_tok}"})
            ev_hk_start = ws_hk.receive_json()
            ev_hk_ip = ws_hk.receive_json()
            assert ev_hk_start["event"] == "task.started"
            assert ev_hk_ip["event"] == "guest_request.in_progress"

            ev_adm_start = ws_adm.receive_json()
            ev_adm_ip = ws_adm.receive_json()
            assert ev_adm_start["event"] == "task.started"
            assert ev_adm_ip["event"] == "guest_request.in_progress"

            # F. Staff completes task -> task.completed and guest_request.completed emitted
            client.patch(f"/api/tasks/{task_id}/complete", headers={"Authorization": f"Bearer {hk_tok}"})
            ev_hk_comp = ws_hk.receive_json()
            ev_hk_done = ws_hk.receive_json()
            assert ev_hk_comp["event"] == "task.completed"
            assert ev_hk_done["event"] == "guest_request.completed"

            ev_adm_comp = ws_adm.receive_json()
            ev_adm_done = ws_adm.receive_json()
            assert ev_adm_comp["event"] == "task.completed"
            assert ev_adm_done["event"] == "guest_request.completed"


# --- 5. SYSTEM SAFETY & PRE-COMMIT ISOLATION TESTS ---
def test_pre_commit_isolation_and_failure_safety(db):
    admin_tok = get_token_for("EMP-1001")
    hk_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")
    setup_active_stay_helper(db, "GST-1001", "101")

    # Connect staff and admin
    with client.websocket_connect(f"/ws?token={hk_tok}") as ws_hk:
        ws_hk.receive_json()

        # A. WebSocket send failure does NOT rollback committed tasks or delete notifications
        with mock.patch("fastapi.WebSocket.send_json", side_effect=Exception("Simulated socket send failure")):
            resp = client.post("/api/guest-requests", json={
                "guest_id": "GST-1001",
                "room_number": "101",
                "request_type": "extra_towel"
            }, headers={"Authorization": f"Bearer {admin_tok}"})
            # The HTTP request succeeds despite WS failure
            assert resp.status_code == 201

        db.expire_all()
        # Committed data exists
        task = db.query(Task).filter(Task.source_type == "guest_request").first()
        assert task is not None
        # Notification exists
        notif = db.query(Notification).filter(Notification.recipient_staff_id == "EMP-3001").first()
        assert notif is not None

        # B. Database failure does NOT emit successful WebSocket events
        # We try to create a guest request for a room that does not exist to trigger DB failure
        with mock.patch.object(manager, "send_to_staff") as mock_send:
            resp_fail = client.post("/api/guest-requests", json={
                "guest_id": "GST-1001",
                "room_number": "999", # Invalid room
                "request_type": "extra_towel"
            }, headers={"Authorization": f"Bearer {admin_tok}"})
            assert resp_fail.status_code == 404
            
            # No WebSocket events sent since the transaction rolled back
            assert mock_send.call_count == 0


# --- 6. OPERATIONS FEED TESTS ---
def test_operations_feed(db):
    admin_tok = get_token_for("EMP-1001")
    hk_tok = create_staff_helper(db, "EMP-3001", StaffRole.HOUSEKEEPING, "hk1@stayease.com")

    # A. Admin can access operations feed
    resp = client.get("/api/operations/feed?limit=5", headers={"Authorization": f"Bearer {admin_tok}"})
    assert resp.status_code == 200
    assert len(resp.json()) <= 5

    # B. Non-admin cannot access operations feed (forbidden)
    resp_fail = client.get("/api/operations/feed", headers={"Authorization": f"Bearer {hk_tok}"})
    assert resp_fail.status_code == 403
