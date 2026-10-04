import enum

class StaffRole(str, enum.Enum):
    ADMIN = "admin"
    RECEPTION = "reception"
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"
    FNB = "fnb"

class Department(str, enum.Enum):
    RECEPTION = "reception"
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"
    FNB = "fnb"
    ADMINISTRATION = "administration"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ESCALATED = "escalated"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ReservationStatus(str, enum.Enum):
    BOOKED = "booked"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"

class OccupancyStatus(str, enum.Enum):
    VACANT = "vacant"
    OCCUPIED = "occupied"

class CleaningStatus(str, enum.Enum):
    CLEAN = "clean"
    DIRTY = "dirty"
    CLEANING = "cleaning"
    INSPECTING = "inspecting"

class MaintenanceStatus(str, enum.Enum):
    GOOD = "good"
    MAINTENANCE_REQUIRED = "maintenance_required"
    UNDER_MAINTENANCE = "under_maintenance"
    OUT_OF_SERVICE = "out_of_service"

class DutyStatus(str, enum.Enum):
    ON_DUTY = "on_duty"
    OFF_DUTY = "off_duty"

class EmploymentStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"

class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"

class RequestType(str, enum.Enum):
    EXTRA_TOWEL = "extra_towel"
    ROOM_CLEANING = "room_cleaning"
    TOILETRIES = "toiletries"
    LUGGAGE_ASSISTANCE = "luggage_assistance"
    MAINTENANCE = "maintenance"
    ROOM_SERVICE = "room_service"
    FOOD_ORDER = "food_order"
    OTHER = "other"

class RequestStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ATTENTION_NEEDED = "attention_needed"
    CANCELLED = "cancelled"


