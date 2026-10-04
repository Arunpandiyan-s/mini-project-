import logging
from datetime import datetime, timezone
from app.models.enums import StaffRole
from app.services.connection_manager import manager
from app.utils.async_helper import fire_and_forget

logger = logging.getLogger(__name__)

def emit_event(
    event_type: str,
    data: dict,
    recipient_staff_id: str = None,
    recipient_role: StaffRole = None,
    send_to_all_admins: bool = True,
    recipient_guest_id: str = None
):
    """
    Constructs event envelope and dispatches to ConnectionManager.
    Failures are safely caught and logged, not propagating to the business workflow.
    """
    event = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data
    }

    async def _send():
        try:
            # 1. Send to recipient guest if provided
            if recipient_guest_id:
                await manager.send_to_guest(recipient_guest_id, event)

            # 2. Send to recipient staff if provided
            if recipient_staff_id:
                await manager.send_to_staff(recipient_staff_id, event)
            
            # 3. Send to recipient role if provided
            if recipient_role:
                await manager.send_to_role(recipient_role, event)
            
            # 4. Send to admins
            if send_to_all_admins:
                await manager.send_to_admins(event)
        except Exception as e:
            logger.error(f"[WebSocket delivery error] Failed to deliver event '{event_type}': {e}")

    fire_and_forget(_send())

