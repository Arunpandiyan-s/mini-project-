import os
import pytest
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
from app.models.enums import (
    StaffRole, EmploymentStatus, OccupancyStatus, CleaningStatus,
    MaintenanceStatus, ReservationStatus, Department, TaskPriority, TaskStatus
)
from app.core.security import hash_password, create_access_token
from app.services.seed import seed_development_data

TEST_DATABASE_URL = "sqlite:///./test_admin_msg.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_admin_msg_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_development_data(db)
    
    # Ensure guest and reservation exist for admin/messaging tests
    guest = db.query(Guest).filter(Guest.guest_id == "GST-9000").first()
    if not guest:
        guest = Guest(
            guest_id="GST-9000",
            name="Aisha Rahman",
            email="aisha.rahman@example.com",
            phone="+1 555-0182",
            password_hash=hash_password("password123")
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
    
    res = db.query(Reservation).filter(Reservation.reservation_id == "RES-GST-9000").first()
    if not res:
        room = db.query(Room).filter(Room.room_number == "104").first()
        res = Reservation(
            reservation_id="RES-GST-9000",
            guest_id=guest.id,
            room_id=room.id,
            check_in=datetime.now(timezone.utc) - timedelta(days=1),
            check_out=datetime.now(timezone.utc) + timedelta(days=3),
            status=ReservationStatus.CHECKED_IN
        )
        db.add(res)
        room.occupancy_status = OccupancyStatus.OCCUPIED
        room.current_guest_id = guest.id
        db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    app.dependency_overrides.clear()
    if os.path.exists("./test_admin_msg.db"):
        try:
            os.remove("./test_admin_msg.db")
        except PermissionError:
            pass

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

def get_admin_token() -> str:
    login_resp = client.post("/api/auth/login", json={
        "identifier": "EMP-1001",
        "password": "password123"
    })
    return login_resp.json()["access_token"]

def get_guest_token(db) -> str:
    guest = db.query(Guest).filter(Guest.guest_id == "GST-9000").first()
    return create_access_token(data={"sub": guest.guest_id, "principal_type": "guest"})

def test_admin_dashboard_stats():
    token = get_admin_token()
    resp = client.get("/api/admin/dashboard/stats", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["total_rooms"] == 60
    assert "available_rooms" in data
    assert "occupied_rooms" in data
    assert "staff_statistics" in data

def test_room_inspection_pass_and_fail(setup_admin_msg_db):
    db = setup_admin_msg_db
    token = get_admin_token()

    # Room 101: Test inspection pass
    room = db.query(Room).filter(Room.room_number == "101").first()
    room.cleaning_status = CleaningStatus.INSPECTING
    db.commit()

    resp = client.post(
        "/api/rooms/101/inspection",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "pass", "notes": "Spotless and sanitized"}
    )
    assert resp.status_code == 200
    assert resp.json()["cleaning_status"] == "clean"

    # Room 102: Test inspection fail -> auto generates housekeeping task
    room2 = db.query(Room).filter(Room.room_number == "102").first()
    room2.cleaning_status = CleaningStatus.INSPECTING
    db.commit()

    resp2 = client.post(
        "/api/rooms/102/inspection",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "fail", "reason": "Dust on desk", "notes": "Re-vacuum needed"}
    )
    assert resp2.status_code == 200
    assert resp2.json()["cleaning_status"] == "dirty"

def test_room_maintenance_flow(setup_admin_msg_db):
    db = setup_admin_msg_db
    token = get_admin_token()

    # Report defect on Room 103 (e.g. broken AC)
    resp = client.post(
        "/api/rooms/103/maintenance",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "issue": "Air conditioner leaking water",
            "priority": "high",
            "blocks_occupancy": True
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    task_id = data["task_id"]

    # Verify room is now blocked for occupancy
    room = db.query(Room).filter(Room.room_number == "103").first()
    assert room.maintenance_status == MaintenanceStatus.MAINTENANCE_REQUIRED

    # Start and resolve the maintenance task
    client.patch(f"/api/tasks/{task_id}/accept", headers={"Authorization": f"Bearer {token}"})
    client.patch(f"/api/tasks/{task_id}/start", headers={"Authorization": f"Bearer {token}"})
    resolve_resp = client.patch(f"/api/tasks/{task_id}/resolve", headers={"Authorization": f"Bearer {token}"})
    assert resolve_resp.status_code == 200

    # Room maintenance status should be GOOD again
    db.refresh(room)
    assert room.maintenance_status == MaintenanceStatus.GOOD

def test_messaging_flow(setup_admin_msg_db):
    db = setup_admin_msg_db
    admin_token = get_admin_token()
    guest_token = get_guest_token(db)

    # Guest sends message to reception
    guest_msg_resp = client.post(
        "/api/messages",
        headers={"Authorization": f"Bearer {guest_token}"},
        json={"content": "Hello, could I get late checkout tomorrow at 1 PM?"}
    )
    assert guest_msg_resp.status_code == 201
    msg_data = guest_msg_resp.json()
    assert msg_data["sender_type"] == "guest"
    assert msg_data["content"] == "Hello, could I get late checkout tomorrow at 1 PM?"

    # Receptionist views messages
    list_resp = client.get("/api/messages", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # Staff replies to guest
    reply_resp = client.post(
        "/api/messages",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"guest_id": "GST-9000", "content": "Certainly! We have granted late checkout until 1:00 PM."}
    )
    assert reply_resp.status_code == 201
    reply_data = reply_resp.json()
    assert reply_data["sender_type"] == "staff"

    # Guest marks staff message read
    read_resp = client.patch(
        f"/api/messages/{reply_data['message_id']}/read",
        headers={"Authorization": f"Bearer {guest_token}"}
    )
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is True

def test_guest_pre_registration_flow(setup_admin_msg_db):
    db = setup_admin_msg_db
    guest_token = get_guest_token(db)

    resp = client.post(
        "/api/guest/pre-register",
        headers={"Authorization": f"Bearer {guest_token}"},
        json={
            "reservation_id": "RES-GST-9000",
            "estimated_arrival": "15:00",
            "id_document_number": "PASSPORT-A981244",
            "special_requests": "Quiet high-floor room preferred"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["reservation_id"] == "RES-GST-9000"
