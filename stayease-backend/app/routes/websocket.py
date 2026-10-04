import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.staff import Staff
from app.models.guest import Guest
from app.models.reservation import Reservation
from app.models.enums import EmploymentStatus, ReservationStatus
from app.services.connection_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None, db: Session = Depends(get_db)):
    """
    WebSocket endpoint allowing authenticated staff members or guests to receive real-time events.
    Authenticates JWT token from query string parameter: ws://127.0.0.1:8000/ws?token=<JWT>
    """
    if not token:
        logger.warning("Rejected WebSocket connection: missing token.")
        await websocket.close(code=1008)
        return

    payload = decode_access_token(token)
    if not payload:
        logger.warning("Rejected WebSocket connection: invalid or expired token.")
        await websocket.close(code=1008)
        return

    principal_type = payload.get("principal_type")
    sub = payload.get("sub")

    if not sub:
        logger.warning("Rejected WebSocket connection: missing subject claim.")
        await websocket.close(code=1008)
        return

    if principal_type == "guest":
        # Check database for guest record existence
        guest = db.query(Guest).filter(Guest.guest_id == sub).first()
        if not guest:
            logger.warning(f"Rejected WebSocket connection: guest {sub} not found.")
            await websocket.close(code=1008)
            return

        # Connect guest
        await websocket.accept()
        await manager.connect_guest(guest.guest_id, websocket)

        try:
            await websocket.send_json({
                "event": "connection.ready",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "guest_id": guest.guest_id
                }
            })

            while True:
                data = await websocket.receive_json()
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"WebSocket execution error for guest {guest.guest_id}: {e}")
        finally:
            manager.disconnect_guest(guest.guest_id, websocket)

    elif principal_type == "staff":
        try:
            internal_id = int(sub)
        except ValueError:
            logger.warning("Rejected WebSocket connection: invalid subject identifier.")
            await websocket.close(code=1008)
            return

        # Check database state to enforce suspension/inactive status immediately
        staff = db.query(Staff).filter(Staff.id == internal_id).first()
        if not staff:
            logger.warning(f"Rejected WebSocket connection: staff internal id {internal_id} not found.")
            await websocket.close(code=1008)
            return

        if staff.employment_status != EmploymentStatus.ACTIVE:
            logger.warning(f"Rejected WebSocket connection: staff {staff.staff_id} is not ACTIVE.")
            await websocket.close(code=1008)
            return

        # WebSocket handshake and registration
        await websocket.accept()
        await manager.connect(staff.staff_id, staff.role, websocket)

        try:
            # Emit connection.ready event
            await websocket.send_json({
                "event": "connection.ready",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "staff_id": staff.staff_id
                }
            })

            # Operational heartbeats and event listening loop
            while True:
                # Heartbeat ping/pong check
                data = await websocket.receive_json()
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"WebSocket execution error for staff {staff.staff_id}: {e}")
        finally:
            manager.disconnect(staff.staff_id, websocket)
    else:
        logger.warning(f"Rejected WebSocket connection: invalid principal type '{principal_type}'.")
        await websocket.close(code=1008)
        return

