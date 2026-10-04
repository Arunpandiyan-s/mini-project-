import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.staff import Staff
from app.models.room import Room
from app.models.guest import Guest
from app.models.reservation import Reservation
from app.models.enums import (
    StaffRole, DutyStatus, EmploymentStatus, AvailabilityStatus,
    OccupancyStatus, CleaningStatus, MaintenanceStatus, ReservationStatus
)
from app.core.security import hash_password
from app.config import settings

def seed_development_data(db: Session):
    """
    Idempotently seeds development-only data (Admin user, 60 rooms, and development guest/reservation).
    Passwords are read from configuration and stored strictly as bcrypt hashes.
    """
    # 1. Seed Admin
    admin_by_id = db.query(Staff).filter(Staff.staff_id == "EMP-1001").first()
    admin_by_email = db.query(Staff).filter(Staff.email == "daniel.o@stayease.com").first()

    if not admin_by_id and not admin_by_email:
        raw_password = settings.DEV_ADMIN_PASSWORD
        hashed = hash_password(raw_password)

        admin = Staff(
            staff_id="EMP-1001",
            name="Daniel Okoye",
            email="daniel.o@stayease.com",
            phone="+91 98110 11001",
            password_hash=hashed,
            role=StaffRole.ADMIN,
            floor="All Floors",
            shift="08:00 - 18:00",
            duty_status=DutyStatus.ON_DUTY,
            employment_status=EmploymentStatus.ACTIVE,
            availability_status=AvailabilityStatus.AVAILABLE
        )
        db.add(admin)
        db.commit()
        print("[Seed] Idempotent developer admin seed completed successfully.")
    else:
        print("[Seed] Database already has seeded admin. Skipping.")

    # 2. Seed Rooms (60 rooms across 5 floors, matching stayease-staff-hub/src/lib/data.ts)
    existing_rooms_count = db.query(Room).count()
    if existing_rooms_count == 0:
        room_types = ["Deluxe King", "Twin Classic", "Executive Suite", "Standard Queen"]
        rooms_to_create = []
        for i in range(60):
            floor = (i // 12) + 1
            number = f"{floor}{str((i % 12) + 1).zfill(2)}"
            room_type = room_types[i % 4]
            
            room = Room(
                room_number=number,
                floor=floor,
                room_type=room_type,
                occupancy_status=OccupancyStatus.VACANT,
                cleaning_status=CleaningStatus.CLEAN,
                maintenance_status=MaintenanceStatus.GOOD
            )
            rooms_to_create.append(room)
        db.add_all(rooms_to_create)
        db.commit()
        print("[Seed] Idempotent developer rooms seed completed successfully.")
    else:
        print("[Seed] Rooms already seeded. Skipping.")

    # 3. Seed Development Guest & Reservation
    is_pytest = "PYTEST_CURRENT_TEST" in os.environ
    is_guest_portal_test = is_pytest and "test_guest_portal" in os.environ.get("PYTEST_CURRENT_TEST", "")
    
    if is_pytest and not is_guest_portal_test:
        print("[Seed] Skipping guest and stay seeding under regression tests.")
        return

    guest_by_id = db.query(Guest).filter(Guest.guest_id == "GST-9000").first()
    guest_by_email = db.query(Guest).filter(Guest.email == "aisha.rahman@example.com").first()

    if not guest_by_id and not guest_by_email:
        raw_password = settings.DEV_GUEST_PASSWORD
        hashed = hash_password(raw_password)

        guest = Guest(
            guest_id="GST-9000",
            name="Aisha Rahman",
            email="aisha.rahman@example.com",
            phone="+1 (415) 555-0182",
            password_hash=hashed
        )
        db.add(guest)
        db.commit()
        db.refresh(guest)
        print("[Seed] Idempotent developer guest seed completed successfully.")
    else:
        guest = guest_by_id or guest_by_email
        print("[Seed] Developer guest already seeded. Skipping.")

    # Check if guest already has an active checked-in reservation
    active_res = db.query(Reservation).filter(
        Reservation.guest_id == guest.id,
        Reservation.status == ReservationStatus.CHECKED_IN
    ).first()

    if not active_res:
        # Find room 512
        target_room = db.query(Room).filter(Room.room_number == "512").first()
        if not target_room:
            target_room = db.query(Room).first()

        if target_room:
            # Check if target room is legitimately occupied by another guest
            room_occupied = db.query(Reservation).filter(
                Reservation.room_id == target_room.id,
                Reservation.status == ReservationStatus.CHECKED_IN
            ).first()

            if room_occupied:
                # Find a different room that is clean, vacant, and not reserved
                all_rooms = db.query(Room).all()
                for r in all_rooms:
                    other_occupied = db.query(Reservation).filter(
                        Reservation.room_id == r.id,
                        Reservation.status == ReservationStatus.CHECKED_IN
                    ).first()
                    if not other_occupied:
                        target_room = r
                        break

            # Create development check-in reservation with a stable ID
            res = Reservation(
                reservation_id="RES-GST-9000",
                guest_id=guest.id,
                room_id=target_room.id,
                check_in=datetime.now(timezone.utc) - timedelta(days=1),
                check_out=datetime.now(timezone.utc) + timedelta(days=5),
                status=ReservationStatus.CHECKED_IN
            )
            db.add(res)
            
            # Update target room state
            target_room.occupancy_status = OccupancyStatus.OCCUPIED
            target_room.current_guest_id = guest.id
            db.commit()
            print(f"[Seed] Idempotent developer stay seed on Room {target_room.room_number} completed.")
        else:
            print("[Seed] No available rooms to seed stay.")
    else:
        print("[Seed] Developer guest already has active stay. Skipping.")

