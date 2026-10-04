import logging
from typing import Dict, Set
from fastapi import WebSocket
from app.models.enums import StaffRole

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps staff_id -> Set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Maps staff_id -> StaffRole enum
        self.staff_roles: Dict[str, StaffRole] = {}
        # Maps guest_id -> Set of active WebSocket connections (guest namespace isolation)
        self.guest_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, staff_id: str, role: StaffRole, websocket: WebSocket):
        if staff_id not in self.active_connections:
            self.active_connections[staff_id] = set()
        self.active_connections[staff_id].add(websocket)
        self.staff_roles[staff_id] = role

    def disconnect(self, staff_id: str, websocket: WebSocket):
        if staff_id in self.active_connections:
            self.active_connections[staff_id].discard(websocket)
            if not self.active_connections[staff_id]:
                self.active_connections.pop(staff_id, None)
                self.staff_roles.pop(staff_id, None)

    async def connect_guest(self, guest_id: str, websocket: WebSocket):
        if guest_id not in self.guest_connections:
            self.guest_connections[guest_id] = set()
        self.guest_connections[guest_id].add(websocket)

    def disconnect_guest(self, guest_id: str, websocket: WebSocket):
        if guest_id in self.guest_connections:
            self.guest_connections[guest_id].discard(websocket)
            if not self.guest_connections[guest_id]:
                self.guest_connections.pop(guest_id, None)

    async def send_to_staff(self, staff_id: str, event: dict):
        if staff_id in self.active_connections:
            dead_sockets = set()
            # Iterate over a copy of connections
            connections = list(self.active_connections[staff_id])
            for ws in connections:
                try:
                    await ws.send_json(event)
                except Exception as e:
                    logger.warning(f"Failed to send real-time event to socket of staff {staff_id}: {e}")
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.disconnect(staff_id, ws)

    async def send_to_guest(self, guest_id: str, event: dict):
        if guest_id in self.guest_connections:
            dead_sockets = set()
            connections = list(self.guest_connections[guest_id])
            for ws in connections:
                try:
                    await ws.send_json(event)
                except Exception as e:
                    logger.warning(f"Failed to send real-time event to socket of guest {guest_id}: {e}")
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.disconnect_guest(guest_id, ws)

    async def send_to_role(self, role: StaffRole, event: dict):
        for s_id, r in list(self.staff_roles.items()):
            if r == role:
                await self.send_to_staff(s_id, event)

    async def send_to_admins(self, event: dict):
        # The existing Admin role is StaffRole.ADMIN or StaffRole.MANAGER. Let's send to ADMIN.
        await self.send_to_role(StaffRole.ADMIN, event)

    async def broadcast(self, event: dict):
        for s_id in list(self.active_connections.keys()):
            await self.send_to_staff(s_id, event)

# Global singleton connection manager
manager = ConnectionManager()
