# StayEase Guest Portal & API Reference

This document describes the Guest Authentication and Portal endpoints added in Phase 7 to support the `stayease-guest-hub` portal client.

---

## 1. Guest Authentication API

All guest authentication endpoints are grouped under `/api/guest-auth`.

### `POST /api/guest-auth/login`

Authenticates a guest using email and password. Returns a JWT access token with `principal_type="guest"` and the guest profile.

* **Request Body:**
  ```json
  {
    "email": "aisha.rahman@example.com",
    "password": "stayease"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "status": "success",
    "authenticated": true,
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "user": {
      "guest_id": "GST-9000",
      "name": "Aisha Rahman",
      "email": "aisha.rahman@example.com",
      "phone": "+1 (415) 555-0182"
    }
  }
  ```

### `GET /api/guest-auth/me`

Retrieves the currently logged-in guest's profile. Requires a valid Guest JWT bearer token.

* **Response (200 OK):**
  ```json
  {
    "guest_id": "GST-9000",
    "name": "Aisha Rahman",
    "email": "aisha.rahman@example.com",
    "phone": "+1 (415) 555-0182"
  }
  ```

---

## 2. Guest Portal Operations API

All operations endpoints require a valid Guest JWT token and are prefixed with `/api/guest`.

### `GET /api/guest/me`

Retrieves current profile (same as `/api/guest-auth/me`).

### `PATCH /api/guest/me`

Updates guest profile contact info. Validates email uniqueness across guests (returns `409 Conflict` on collision).

* **Request Body:**
  ```json
  {
    "phone": "+1 (415) 555-9999",
    "email": "aisha.new@example.com"
  }
  ```

### `GET /api/guest/me/stay`

Retrieves details of the guest's current active `checked_in` stay. Returns a subset of safe room fields.

* **Response (200 OK):**
  ```json
  {
    "guest_id": "GST-9000",
    "reservation_id": "RES-GST-9000",
    "room": {
      "room_number": "512",
      "floor": 5,
      "room_type": "Deluxe King"
    },
    "check_in": "2026-08-04T12:00:00Z",
    "check_out": "2026-08-10T11:00:00Z"
  }
  ```
* **Response (404 Not Found):** Returned if the guest does not have an active `checked_in` reservation.

### `POST /api/guest/me/requests`

Submits a new guest service request. Validates that the guest has an active stay and resolves room number/department automatically.

* **Request Body:**
  ```json
  {
    "request_type": "extra_towel",
    "description": "Need two extra towels for the bathroom."
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "request_id": "REQ-7AF2B1",
    "request_type": "extra_towel",
    "description": "Need two extra towels for the bathroom.",
    "status": "pending",
    "room_number": "512",
    "created_at": "2026-08-05T12:00:00Z",
    "completed_at": null
  }
  ```

### `GET /api/guest/me/requests`

Lists all service requests submitted by the current guest, ordered by creation date descending.

### `GET /api/guest/me/requests/{request_id}`

Retrieves details for a single guest request. Validates ownership (returns `404 Not Found` on scanned IDs).

### `PATCH /api/guest/me/requests/{request_id}/cancel`

Cancels a guest request if the corresponding task is still in `PENDING` or `ASSIGNED` status (not yet started). Atomically updates request and task status to `cancelled`, frees the assigned employee workload, and triggers the department retry rotation.

* **Response (200 OK):** Returns the updated request with `status: "cancelled"`.
* **Response (409 Conflict):** Returned if the task has already been started or completed.

---

## 3. Guest Notifications API

Private, persistent notification center for guest stay events (e.g., requests started, completed, or cancelled).

### `GET /api/guest/me/notifications`

Lists all notifications for the guest, ordered newest first.

### `GET /api/guest/me/notifications/unread-count`

Returns count of unread notifications.

### `PATCH /api/guest/me/notifications/{notification_id}/read`

Marks a single notification read.

### `PATCH /api/guest/me/notifications/read-all`

Marks all notifications for the guest read.

---

## 4. WebSocket Real-Time Events

Guests can connect to the server's WebSocket endpoint:
`ws://127.0.0.1:8000/ws?token=<GUEST_JWT>`

* **Guest WS Authorization:** Rejects connections if the token is invalid or the guest has no active check-in stay.
* **Namespace Isolation:** Emits ONLY events belonging to the connected guest:
  - `guest_request.created`
  - `guest_request.in_progress`
  - `guest_request.completed`
  - `guest_request.cancelled`
* **Privacy:** Guests do not receive staff workload updates, other guests' events, or Admin broadcasts.
