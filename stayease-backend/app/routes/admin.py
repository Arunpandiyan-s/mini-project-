from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from app.database import get_db
from app.core.dependencies import require_roles
from app.models.staff import Staff
from app.models.room import Room
from app.models.reservation import Reservation
from app.models.task import Task
from app.models.guest_request import GuestRequest
from app.models.audit_log import AuditLog
from app.models.enums import (
    StaffRole, OccupancyStatus, CleaningStatus, MaintenanceStatus,
    ReservationStatus, Department, TaskStatus, RequestStatus,
    EmploymentStatus, DutyStatus
)
from app.services.room_service import is_room_ready_for_checkin

router = APIRouter(prefix="/api/admin", tags=["Administration & Operations"])

@router.get("/dashboard/stats")
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Authoritative operational metrics for the Admin Dashboard.
    All values are computed dynamically from the database.
    """
    total_rooms = db.query(Room).count()
    occupied_rooms = db.query(Room).filter(Room.occupancy_status == OccupancyStatus.OCCUPIED).count()
    rooms_requiring_cleaning = db.query(Room).filter(
        Room.cleaning_status.in_([CleaningStatus.DIRTY, CleaningStatus.CLEANING])
    ).count()
    rooms_awaiting_inspection = db.query(Room).filter(
        Room.cleaning_status == CleaningStatus.INSPECTING
    ).count()
    rooms_under_maintenance = db.query(Room).filter(
        Room.maintenance_status.in_([
            MaintenanceStatus.MAINTENANCE_REQUIRED,
            MaintenanceStatus.UNDER_MAINTENANCE,
            MaintenanceStatus.OUT_OF_SERVICE
        ])
    ).count()

    all_rooms = db.query(Room).all()
    available_rooms = sum(1 for r in all_rooms if is_room_ready_for_checkin(r, db))

    today = datetime.now(timezone.utc).date()
    
    # Arrivals and departures (checking date part)
    all_reservations = db.query(Reservation).all()
    today_arrivals = sum(
        1 for r in all_reservations
        if r.status == ReservationStatus.BOOKED and r.check_in.date() == today
    )
    today_departures = sum(
        1 for r in all_reservations
        if r.status == ReservationStatus.CHECKED_IN and r.check_out.date() == today
    )
    active_reservations = db.query(Reservation).filter(
        Reservation.status.in_([ReservationStatus.BOOKED, ReservationStatus.CHECKED_IN])
    ).count()

    pending_housekeeping_tasks = db.query(Task).filter(
        Task.department == Department.HOUSEKEEPING,
        Task.status.in_([TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS])
    ).count()

    open_maintenance_tasks = db.query(Task).filter(
        Task.department == Department.MAINTENANCE,
        Task.status.in_([TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS])
    ).count()

    pending_guest_requests = db.query(GuestRequest).filter(
        GuestRequest.status.in_([RequestStatus.PENDING, RequestStatus.IN_PROGRESS])
    ).count()

    total_staff = db.query(Staff).count()
    active_staff = db.query(Staff).filter(Staff.employment_status == EmploymentStatus.ACTIVE).count()
    on_duty_staff = db.query(Staff).filter(Staff.duty_status == DutyStatus.ON_DUTY).count()

    # Department breakdown
    reception_count = db.query(Staff).filter(Staff.role == StaffRole.RECEPTION).count()
    housekeeping_count = db.query(Staff).filter(Staff.role == StaffRole.HOUSEKEEPING).count()
    maintenance_count = db.query(Staff).filter(Staff.role == StaffRole.MAINTENANCE).count()
    fnb_count = db.query(Staff).filter(Staff.role == StaffRole.FNB).count()

    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_rooms": total_rooms,
        "available_rooms": available_rooms,
        "occupied_rooms": occupied_rooms,
        "rooms_requiring_cleaning": rooms_requiring_cleaning,
        "rooms_awaiting_inspection": rooms_awaiting_inspection,
        "rooms_under_maintenance": rooms_under_maintenance,
        "today_arrivals": today_arrivals,
        "today_departures": today_departures,
        "active_reservations": active_reservations,
        "pending_housekeeping_tasks": pending_housekeeping_tasks,
        "open_maintenance_tasks": open_maintenance_tasks,
        "pending_guest_requests": pending_guest_requests,
        "staff_statistics": {
            "total_staff": total_staff,
            "active_staff": active_staff,
            "on_duty_staff": on_duty_staff,
            "by_department": {
                "reception": reception_count,
                "housekeeping": housekeeping_count,
                "maintenance": maintenance_count,
                "fnb": fnb_count
            }
        }
    }

@router.get("/reports")
def get_admin_reports(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Overview report for hotel executive summaries.
    """
    return get_admin_dashboard_stats(db, current_staff)

@router.get("/audit-logs")
def get_admin_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    event_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Audit log search and review for administrators.
    """
    query = db.query(AuditLog)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "event_type": log.event_type,
            "actor_type": log.actor_type,
            "actor_id": log.actor_id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "metadata_json": log.metadata_json,
            "created_at": log.created_at
        } for log in logs
    ]
