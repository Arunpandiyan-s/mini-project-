export type RoleId =
  | "reception"
  | "housekeeping"
  | "maintenance"
  | "fnb"
  | "manager";

export const ROLES: { id: RoleId; name: string; blurb: string }[] = [
  { id: "reception", name: "Receptionist", blurb: "Front desk, check-ins & reservations" },
  { id: "housekeeping", name: "Housekeeping", blurb: "Room cleaning & readiness" },
  { id: "maintenance", name: "Maintenance", blurb: "Repairs & technical tickets" },
  { id: "fnb", name: "Food & Beverage", blurb: "Room service & order queue" },
  { id: "manager", name: "Admin", blurb: "Full hotel operations & admin control" },
];

export const roleName = (id: RoleId | null | undefined) =>
  ROLES.find((r) => r.id === id)?.name ?? "Staff";

export interface GoogleSheetStaffUser {
  staffId: string;
  name: string;
  role: RoleId;
  email: string;
  phone: string;
  floor: string;
  shift: string;
  duty: string;
  password?: string;
}

export const GOOGLE_SHEET_STAFF_USERS: GoogleSheetStaffUser[] = [
  // Manager
  { staffId: "EMP-1001", name: "Daniel Okoye", role: "manager", email: "daniel.o@stayease.com", phone: "+91 98110 11001", floor: "All Floors", shift: "08:00 - 18:00", duty: "On Duty", password: "password123" },
  
  // Reception
  { staffId: "EMP-2001", name: "Anita Sharma", role: "reception", email: "anita.s@stayease.com", phone: "+91 98110 22101", floor: "Lobby / Reception", shift: "07:00 - 15:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-2002", name: "Peter Nwachukwu", role: "reception", email: "peter.n@stayease.com", phone: "+91 98110 22102", floor: "Lobby / Reception", shift: "15:00 - 23:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-2003", name: "Omar Hassan", role: "reception", email: "omar.h@stayease.com", phone: "+91 98110 22103", floor: "Guest Relations", shift: "08:00 - 16:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-2004", name: "Emily Zhang", role: "reception", email: "emily.z@stayease.com", phone: "+91 98110 22104", floor: "Front Desk", shift: "07:00 - 15:00", duty: "Off Duty", password: "password123" },
  { staffId: "EMP-2005", name: "Marcus Brody", role: "reception", email: "marcus.b@stayease.com", phone: "+91 98110 22105", floor: "Concierge Desk", shift: "11:00 - 19:00", duty: "On Duty", password: "password123" },

  // Housekeeping
  { staffId: "EMP-3001", name: "Grace Okafor", role: "housekeeping", email: "grace.o@stayease.com", phone: "+91 98110 33101", floor: "Floor 1", shift: "08:00 - 16:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-3002", name: "Carlos Rodriguez", role: "housekeeping", email: "carlos.r@stayease.com", phone: "+91 98110 33102", floor: "Floor 2", shift: "08:00 - 16:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-3003", name: "Laura Fernandez", role: "housekeeping", email: "laura.f@stayease.com", phone: "+91 98110 33103", floor: "Floor 3", shift: "16:00 - 00:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-3004", name: "Austin Patel", role: "housekeeping", email: "austin.p@stayease.com", phone: "+91 98110 33104", floor: "Floor 4", shift: "08:00 - 16:00", duty: "Off Duty", password: "password123" },
  { staffId: "EMP-3005", name: "Keerthi Reddy", role: "housekeeping", email: "keerthi.r@stayease.com", phone: "+91 98110 33105", floor: "Laundry / Linen", shift: "09:00 - 17:00", duty: "On Duty", password: "password123" },

  // Maintenance
  { staffId: "EMP-4001", name: "Ravi Kumar", role: "maintenance", email: "ravi.k@stayease.com", phone: "+91 98110 44101", floor: "HVAC / Engineering", shift: "08:00 - 17:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-4002", name: "David Miller", role: "maintenance", email: "david.m@stayease.com", phone: "+91 98110 44102", floor: "Electrical Tech", shift: "08:00 - 17:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-4003", name: "Vijay Singh", role: "maintenance", email: "vijay.s@stayease.com", phone: "+91 98110 44103", floor: "Plumbing Spec", shift: "12:00 - 20:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-4004", name: "Harish Verma", role: "maintenance", email: "harish.v@stayease.com", phone: "+91 98110 44104", floor: "General Electrician", shift: "08:00 - 17:00", duty: "Off Duty", password: "password123" },
  { staffId: "EMP-4005", name: "Dinesh Kumar", role: "maintenance", email: "dinesh.k@stayease.com", phone: "+91 98110 44105", floor: "Night Maintenance", shift: "23:00 - 07:00", duty: "Off Duty", password: "password123" },

  // F&B
  { staffId: "EMP-5001", name: "Mei Ling", role: "fnb", email: "mei.t@stayease.com", phone: "+91 98110 55101", floor: "Main Restaurant", shift: "07:00 - 16:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-5002", name: "Sofia Rossi", role: "fnb", email: "sofia.r@stayease.com", phone: "+91 98110 55102", floor: "Room Service", shift: "06:00 - 14:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-5003", name: "Samuel Green", role: "fnb", email: "samuel.g@stayease.com", phone: "+91 98110 55103", floor: "Kitchen / Main Prep", shift: "11:00 - 21:00", duty: "On Duty", password: "password123" },
  { staffId: "EMP-5004", name: "Priya Sharma", role: "fnb", email: "priya.s@stayease.com", phone: "+91 98110 55104", floor: "Bar & Lounge", shift: "16:00 - 01:00", duty: "Off Duty", password: "password123" },
  { staffId: "EMP-5005", name: "Alex Wong", role: "fnb", email: "alex.w@stayease.com", phone: "+91 98110 55105", floor: "Banquets & Events", shift: "10:00 - 19:00", duty: "On Duty", password: "password123" },
];

export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Attention Needed";

export type Task = {
  id: string;
  room: string;
  type: string;
  priority: Priority;
  assignedAt: string;
  description: string;
  eta: string;
  status: TaskStatus;
  role: RoleId;
  TaskID?: string;
  RoomNumber?: string;
  CleaningType?: string;
  Priority?: string;
  AssignedStaff?: string;
  Status?: string;
  AssignedTime?: string;
  assignedTo?: string;
  completedAt?: string;
};

export const TASKS: Task[] = [
  { id: "T-1041", room: "204", type: "Deep Cleaning", priority: "Urgent", assignedAt: "09:10", description: "Guest checked out early. Full turnover before 11:00 arrival.", eta: "45 min", status: "Pending", role: "housekeeping", assignedTo: "Grace Okafor" },
  { id: "T-1042", room: "311", type: "Standard Cleaning", priority: "Medium", assignedAt: "09:25", description: "Daily service, replace linen and amenities.", eta: "25 min", status: "In Progress", role: "housekeeping", assignedTo: "Grace Okafor" },
  { id: "T-1043", room: "512", type: "Turndown Service", priority: "Low", assignedAt: "09:40", description: "Evening turndown requested by guest.", eta: "15 min", status: "Pending", role: "housekeeping", assignedTo: "Carlos Ruiz" },
  { id: "T-1044", room: "108", type: "Linen Change", priority: "High", assignedAt: "08:55", description: "VIP guest requested fresh linen immediately.", eta: "20 min", status: "Completed", role: "housekeeping", assignedTo: "Grace Okafor", completedAt: "09:15" },
  { id: "T-1045", room: "406", type: "Post-Maintenance Clean", priority: "High", assignedAt: "10:05", description: "Clean after plumbing repair, check bathroom finish.", eta: "35 min", status: "Attention Needed", role: "housekeeping", assignedTo: "Grace Okafor" },
  { id: "T-2010", room: "305", type: "AC Not Cooling", priority: "Urgent", assignedAt: "08:20", description: "Guest reports AC blowing warm air. Check compressor and filter.", eta: "60 min", status: "In Progress", role: "maintenance", assignedTo: "Ravi Kumar" },
  { id: "T-2011", room: "217", type: "Leaking Faucet", priority: "Medium", assignedAt: "09:15", description: "Bathroom sink faucet dripping continuously.", eta: "30 min", status: "Pending", role: "maintenance", assignedTo: "Ravi Kumar" },
  { id: "T-2012", room: "119", type: "TV Signal Issue", priority: "Low", assignedAt: "09:50", description: "No signal on channels 20-40.", eta: "20 min", status: "Pending", role: "maintenance", assignedTo: "David Miller" },
  { id: "T-2013", room: "402", type: "Door Lock Fault", priority: "High", assignedAt: "07:45", description: "Keycard reader intermittently failing.", eta: "40 min", status: "Attention Needed", role: "maintenance", assignedTo: "Ravi Kumar" },
  { id: "T-3001", room: "210", type: "Guest Request", priority: "High", assignedAt: "10:12", description: "Extra towels and a late checkout confirmation.", eta: "10 min", status: "Pending", role: "reception", assignedTo: "Anita Sharma" },
  { id: "T-3002", room: "Lobby", type: "Pre-Registration Approval", priority: "Medium", assignedAt: "09:30", description: "3 online pre-registrations awaiting verification.", eta: "15 min", status: "In Progress", role: "reception", assignedTo: "Anita Sharma" },
  { id: "T-4001", room: "508", type: "Room Service Delivery", priority: "Urgent", assignedAt: "10:20", description: "Breakfast set for 2, allergy note: no nuts.", eta: "18 min", status: "In Progress", role: "fnb", assignedTo: "Mei Tanaka" },
  { id: "T-4002", room: "126", type: "Mini Bar Restock", priority: "Low", assignedAt: "09:05", description: "Restock beverages and snacks.", eta: "12 min", status: "Pending", role: "fnb", assignedTo: "Mei Tanaka" },
  { id: "T-5001", room: "Floor 3", type: "Delayed Task Review", priority: "High", assignedAt: "10:00", description: "Two housekeeping tasks past SLA on floor 3.", eta: "20 min", status: "Pending", role: "reception", assignedTo: "Anita Sharma" },
];

export type RoomStatus =
  | "Available"
  | "Occupied"
  | "Reserved"
  | "Cleaning"
  | "Maintenance"
  | "Cleaning Required"
  | "Cleaning In Progress"
  | "Waiting Cleaning Verification"
  | "Maintenance Required"
  | "Under Maintenance"
  | "Waiting Maintenance Verification"
  | "Out of Service"
  | "Blocked";

export type Room = {
  number: string;
  floor: number;
  status: RoomStatus;
  guest?: string | undefined;
  type: string;
  cleaningType?: string | undefined;
  priority?: Priority | undefined;
  assignedAt?: string | undefined;
  capacity?: number;
  currentGuests?: number;
  pricePerNight?: number;
  bedType?: string;
  lastCleaned?: string;
};

const roomStatuses: RoomStatus[] = [
  "Available",
  "Occupied",
  "Reserved",
  "Cleaning Required",
  "Cleaning In Progress",
  "Waiting Cleaning Verification",
  "Maintenance Required",
  "Under Maintenance",
  "Waiting Maintenance Verification",
];
const guests = ["A. Sharma", "L. Fernandes", "M. Okafor", "J. Tanaka", "R. Costa", "P. Nair", "S. Ahmed", "K. Muller"];
const roomTypes = ["Deluxe King", "Twin Classic", "Executive Suite", "Standard Queen"];

export const ROOMS: Room[] = Array.from({ length: 60 }, (_, i) => {
  const floor = Math.floor(i / 12) + 1;
  const number = `${floor}${String((i % 12) + 1).padStart(2, "0")}`;
  const status = roomStatuses[(i * 7 + floor) % roomStatuses.length]!;
  const priorities: Priority[] = ["Low", "Medium", "High", "Urgent"];
  return {
    number,
    floor,
    status,
    type: roomTypes[i % 4]!,
    guest: status === "Occupied" ? guests[i % guests.length]! : undefined,
    cleaningType: status === "Cleaning" ? (i % 3 === 0 ? "Deep Clean" : "Standard") : undefined,
    priority: priorities[i % 4]!,
    assignedAt: `${8 + (i % 6)}:${i % 2 === 0 ? "15" : "45"}`,
    capacity: (i % 3 === 0 ? 4 : i % 2 === 0 ? 3 : 2),
    currentGuests: status === "Occupied" ? (i % 2 === 0 ? 2 : 1) : 0,
    pricePerNight: (i % 4 === 0 ? 250 : i % 4 === 1 ? 180 : i % 4 === 2 ? 350 : 140),
    bedType: (i % 4 === 0 ? "King Bed" : i % 4 === 1 ? "Twin Beds" : i % 4 === 2 ? "King + Sofa" : "Queen Bed"),
    lastCleaned: `Today ${7 + (i % 5)}:00`,
  };
});

export type Reservation = {
  id: string;
  guest: string;
  arrival: string;
  room: string;
  status: "Confirmed" | "Checked In" | "Pending" | "VIP";
};

export const RESERVATIONS: Reservation[] = [
  { id: "R-9001", guest: "Anita Sharma", arrival: "11:30", room: "204", status: "Confirmed" },
  { id: "R-9002", guest: "Luis Fernandes", arrival: "12:15", room: "310", status: "Pending" },
  { id: "R-9003", guest: "Mei Tanaka", arrival: "13:00", room: "512", status: "VIP" },
  { id: "R-9004", guest: "Omar Haddad", arrival: "14:20", room: "118", status: "Checked In" },
  { id: "R-9005", guest: "Grace Okafor", arrival: "15:45", room: "406", status: "Confirmed" },
  { id: "R-9006", guest: "Peter Nair", arrival: "16:30", room: "221", status: "Pending" },
];

export type FoodOrder = {
  id: string;
  room: string;
  guest: string;
  items: string[];
  orderedAt: string;
  eta: string;
  status: "New" | "Accepted" | "Preparing" | "Ready" | "Out for Delivery" | "Delivered";
};

export const ORDERS: FoodOrder[] = [
  { id: "O-701", room: "508", guest: "R. Costa", items: ["Continental breakfast x2", "Fresh orange juice"], orderedAt: "10:20", eta: "10:38", status: "Preparing" },
  { id: "O-702", room: "126", guest: "S. Ahmed", items: ["Club sandwich", "Iced tea"], orderedAt: "10:26", eta: "10:50", status: "New" },
  { id: "O-703", room: "302", guest: "J. Tanaka", items: ["Green salad", "Grilled salmon"], orderedAt: "10:31", eta: "11:05", status: "Accepted" },
  { id: "O-704", room: "410", guest: "K. Muller", items: ["Espresso x2", "Cheesecake"], orderedAt: "10:40", eta: "11:02", status: "Ready" },
  { id: "O-705", room: "215", guest: "P. Nair", items: ["Masala chai", "Veg wrap"], orderedAt: "10:44", eta: "11:10", status: "Out for Delivery" },
];

export type Ticket = {
  id: string;
  room: string;
  issue: string;
  technician: string;
  reportedAt: string;
  eta: string;
  parts: string;
  notes: string;
  priority: Priority;
  openedMinutes: number;
  status: "Open" | "In Progress" | "Paused" | "Completed" | "Escalated";
};

export const TICKETS: Ticket[] = [
  { id: "M-501", room: "305", issue: "AC not cooling", technician: "Ravi K.", reportedAt: "08:20", eta: "60 min", parts: "Compressor filter", notes: "Filter clogged, cleaning in progress.", priority: "Urgent", openedMinutes: 142, status: "In Progress" },
  { id: "M-502", room: "402", issue: "Door lock fault", technician: "Ana M.", reportedAt: "07:45", eta: "40 min", parts: "Keycard reader module", notes: "Awaiting spare module from store.", priority: "High", openedMinutes: 177, status: "Paused" },
  { id: "M-503", room: "217", issue: "Leaking faucet", technician: "Sam T.", reportedAt: "09:15", eta: "30 min", parts: "Washer set", notes: "-", priority: "Medium", openedMinutes: 87, status: "Open" },
  { id: "M-504", room: "119", issue: "TV signal issue", technician: "Unassigned", reportedAt: "09:50", eta: "20 min", parts: "None", notes: "-", priority: "Low", openedMinutes: 52, status: "Open" },
  { id: "M-505", room: "610", issue: "Elevator noise", technician: "Ravi K.", reportedAt: "06:30", eta: "120 min", parts: "Bearing kit", notes: "Vendor visit scheduled.", priority: "Urgent", openedMinutes: 252, status: "Escalated" },
];

export type Staff = {
  id: string;
  name: string;
  role: RoleId;
  floor: string;
  phone: string;
  email: string;
  joined: string;
  employment: "Active" | "Suspended" | "Terminated";
  duty: "On Duty" | "Off Duty";
  shift: string;
  performance: number;
  completion: number;
  responseMin: number;
  lastLogin: string;
  notes: string;
};

export const STAFF: Staff[] = [
  // Reception (5 Users)
  { id: "EMP-1001", name: "Anita Sharma", role: "reception", floor: "Lobby", phone: "+91 98110 22110", email: "anita.s@stayease.com", joined: "2023-04-12", employment: "Active", duty: "On Duty", shift: "07:00 - 15:00", performance: 92, completion: 96, responseMin: 4, lastLogin: "Today 06:52", notes: "Front Desk Lead" },
  { id: "EMP-1016", name: "Peter Nair", role: "reception", floor: "Lobby", phone: "+91 98440 11223", email: "peter.n@stayease.com", joined: "2023-11-10", employment: "Active", duty: "On Duty", shift: "07:00 - 15:00", performance: 88, completion: 90, responseMin: 5, lastLogin: "Today 07:10", notes: "Reception Associate" },
  { id: "EMP-1018", name: "Omar Haddad", role: "reception", floor: "Lobby", phone: "+91 94410 66233", email: "omar.h@stayease.com", joined: "2023-09-28", employment: "Active", duty: "On Duty", shift: "15:00 - 23:00", performance: 85, completion: 89, responseMin: 5, lastLogin: "Yesterday 22:55", notes: "Guest Relations Agent" },
  { id: "EMP-1029", name: "Emily Zhang", role: "reception", floor: "Lobby", phone: "+91 91234 56781", email: "emily.z@stayease.com", joined: "2024-02-15", employment: "Active", duty: "Off Duty", shift: "15:00 - 23:00", performance: 91, completion: 93, responseMin: 4, lastLogin: "Yesterday 14:00", notes: "Check-in Specialist" },
  { id: "EMP-1030", name: "Marcus Brody", role: "reception", floor: "Lobby", phone: "+91 91234 56782", email: "marcus.b@stayease.com", joined: "2022-08-01", employment: "Active", duty: "Off Duty", shift: "23:00 - 07:00", performance: 94, completion: 95, responseMin: 3, lastLogin: "Today 06:45", notes: "Concierge Supervisor" },

  // Housekeeping (5 Users)
  { id: "EMP-1003", name: "Grace Okafor", role: "housekeeping", floor: "Floor 2", phone: "+91 97330 55110", email: "grace.o@stayease.com", joined: "2024-01-20", employment: "Active", duty: "On Duty", shift: "08:00 - 16:00", performance: 95, completion: 98, responseMin: 3, lastLogin: "Today 07:44", notes: "Lead Housekeeper" },
  { id: "EMP-1014", name: "Carlos Ruiz", role: "housekeeping", floor: "Floor 3", phone: "+91 96550 99881", email: "carlos.r@stayease.com", joined: "2023-06-18", employment: "Active", duty: "On Duty", shift: "08:00 - 16:00", performance: 89, completion: 92, responseMin: 6, lastLogin: "Today 07:55", notes: "Senior Attendant" },
  { id: "EMP-1007", name: "Laura Fernandes", role: "housekeeping", floor: "Floor 4", phone: "+91 93220 45011", email: "laura.f@stayease.com", joined: "2024-05-03", employment: "Active", duty: "On Duty", shift: "08:00 - 16:00", performance: 86, completion: 88, responseMin: 7, lastLogin: "Today 08:00", notes: "Housekeeping Attendant" },
  { id: "EMP-1021", name: "Austin Patel", role: "housekeeping", floor: "Floor 5", phone: "+91 91234 56783", email: "austin.p@stayease.com", joined: "2024-03-10", employment: "Active", duty: "Off Duty", shift: "16:00 - 00:00", performance: 90, completion: 94, responseMin: 5, lastLogin: "Yesterday 23:30", notes: "Room Supervisor" },
  { id: "EMP-1022", name: "Keerthi Rao", role: "housekeeping", floor: "Floor 1", phone: "+91 91234 56784", email: "keerthi.r@stayease.com", joined: "2024-04-01", employment: "Active", duty: "Off Duty", shift: "16:00 - 00:00", performance: 92, completion: 95, responseMin: 4, lastLogin: "Yesterday 23:45", notes: "Linen Specialist" },

  // Maintenance (5 Users)
  { id: "EMP-1002", name: "Ravi Kumar", role: "maintenance", floor: "Floor 3", phone: "+91 98220 31220", email: "ravi.k@stayease.com", joined: "2022-11-02", employment: "Active", duty: "On Duty", shift: "06:00 - 14:00", performance: 88, completion: 91, responseMin: 9, lastLogin: "Today 05:58", notes: "Senior HVAC & Mechanical Engineer" },
  { id: "EMP-1015", name: "David Miller", role: "maintenance", floor: "Floor 5", phone: "+91 90120 77441", email: "david.m@stayease.com", joined: "2023-08-09", employment: "Active", duty: "On Duty", shift: "06:00 - 14:00", performance: 85, completion: 88, responseMin: 8, lastLogin: "Today 06:15", notes: "Electrical & Appliance Tech" },
  { id: "EMP-1023", name: "Vijay Singh", role: "maintenance", floor: "Floor 2", phone: "+91 91234 56785", email: "vijay.s@stayease.com", joined: "2023-01-15", employment: "Active", duty: "On Duty", shift: "14:00 - 22:00", performance: 93, completion: 96, responseMin: 5, lastLogin: "Today 09:00", notes: "Plumbing Specialist" },
  { id: "EMP-1024", name: "Harish Verma", role: "maintenance", floor: "Floor 4", phone: "+91 91234 56786", email: "harish.v@stayease.com", joined: "2023-05-20", employment: "Active", duty: "Off Duty", shift: "14:00 - 22:00", performance: 89, completion: 92, responseMin: 7, lastLogin: "Yesterday 21:50", notes: "Electrical Specialist" },
  { id: "EMP-1025", name: "Dinesh Karthik", role: "maintenance", floor: "Floor 1", phone: "+91 91234 56787", email: "dinesh.k@stayease.com", joined: "2024-01-05", employment: "Active", duty: "Off Duty", shift: "22:00 - 06:00", performance: 91, completion: 94, responseMin: 6, lastLogin: "Today 05:45", notes: "Night Maintenance Tech" },

  // Food & Beverage (5 Users)
  { id: "EMP-1005", name: "Mei Tanaka", role: "fnb", floor: "Floor 1", phone: "+91 99880 12034", email: "mei.t@stayease.com", joined: "2022-06-15", employment: "Active", duty: "On Duty", shift: "10:00 - 18:00", performance: 90, completion: 93, responseMin: 6, lastLogin: "Today 09:31", notes: "F&B Executive Supervisor" },
  { id: "EMP-1009", name: "Sofia Rossi", role: "fnb", floor: "Floor 1", phone: "+91 98123 00987", email: "sofia.r@stayease.com", joined: "2025-01-11", employment: "Active", duty: "On Duty", shift: "06:00 - 14:00", performance: 79, completion: 82, responseMin: 8, lastLogin: "Today 05:50", notes: "Room Service Captain" },
  { id: "EMP-1026", name: "Samuel Green", role: "fnb", floor: "Kitchen", phone: "+91 91234 56788", email: "samuel.g@stayease.com", joined: "2021-09-01", employment: "Active", duty: "On Duty", shift: "06:00 - 14:00", performance: 96, completion: 97, responseMin: 4, lastLogin: "Today 05:30", notes: "Head Chef" },
  { id: "EMP-1027", name: "Priya Sundaram", role: "fnb", floor: "Floor 2", phone: "+91 91234 56789", email: "priya.s@stayease.com", joined: "2023-10-15", employment: "Active", duty: "Off Duty", shift: "14:00 - 22:00", performance: 88, completion: 91, responseMin: 7, lastLogin: "Yesterday 21:30", notes: "Beverage & Dining Captain" },
  { id: "EMP-1028", name: "Alex Wong", role: "fnb", floor: "Lobby Bar", phone: "+91 91234 56790", email: "alex.w@stayease.com", joined: "2024-02-01", employment: "Active", duty: "Off Duty", shift: "16:00 - 00:00", performance: 92, completion: 95, responseMin: 5, lastLogin: "Yesterday 23:55", notes: "Banquets Assistant" },

  // Admin (Single User)
  { id: "EMP-1010", name: "Daniel Okoye", role: "manager", floor: "All Floors", phone: "+91 99999 10101", email: "daniel.o@stayease.com", joined: "2020-03-16", employment: "Active", duty: "On Duty", shift: "09:00 - 19:00", performance: 94, completion: 95, responseMin: 4, lastLogin: "Today 08:12", notes: "General Manager & Hotel Admin" },
];

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  kind: "task" | "overdue" | "guest" | "announcement" | "shift" | "emergency";
  read: boolean;
};

export const NOTIFICATIONS: NotificationItem[] = [
  { id: "N-1", title: "New task assigned", body: "Room 204 deep cleaning assigned to you.", time: "2 min ago", kind: "task", read: false },
  { id: "N-2", title: "Task overdue", body: "Room 406 post-maintenance clean is past its ETA.", time: "12 min ago", kind: "overdue", read: false },
  { id: "N-3", title: "Guest urgent request", body: "Room 210 requested extra towels immediately.", time: "18 min ago", kind: "guest", read: false },
  { id: "N-4", title: "Manager announcement", body: "Team briefing at 4:00 PM in the operations room.", time: "1 hr ago", kind: "announcement", read: true },
  { id: "N-5", title: "Shift reminder", body: "Your shift ends at 16:00. Submit handover notes.", time: "2 hr ago", kind: "shift", read: true },
  { id: "N-6", title: "Emergency alert", body: "Fire drill scheduled tomorrow 10:00 on floors 1-3.", time: "3 hr ago", kind: "emergency", read: true },
];

export type GuestRequest = {
  id: string;
  room: string;
  guest: string;
  type: "Service" | "Complaint" | "Feedback" | "Urgent";
  detail: string;
  time: string;
  status: "Open" | "Approved" | "Rejected" | "Assigned";
};

export const GUEST_REQUESTS: GuestRequest[] = [
  { id: "G-01", room: "210", guest: "A. Sharma", type: "Urgent", detail: "AC remote not working, room too warm.", time: "10:18", status: "Open" },
  { id: "G-02", room: "512", guest: "M. Tanaka", type: "Service", detail: "Late checkout until 2 PM requested.", time: "10:02", status: "Open" },
  { id: "G-03", room: "118", guest: "O. Haddad", type: "Complaint", detail: "Noise from corridor during the night.", time: "09:40", status: "Open" },
  { id: "G-04", room: "406", guest: "G. Okafor", type: "Feedback", detail: "Praised the housekeeping team response.", time: "09:12", status: "Approved" },
];

export type StaffRequest = {
  id: string;
  staff: string;
  type: "Leave" | "Permission" | "Supply" | "Escalation";
  detail: string;
  time: string;
  status: "Open" | "Approved" | "Rejected" | "Assigned";
};

export const STAFF_REQUESTS: StaffRequest[] = [
  { id: "S-01", staff: "Grace Okafor", type: "Leave", detail: "Casual leave on 12 Aug (family event).", time: "08:55", status: "Open" },
  { id: "S-02", staff: "Ravi Kumar", type: "Supply", detail: "Needs 2 spare keycard reader modules.", time: "09:20", status: "Open" },
  { id: "S-03", staff: "Sofia Rossi", type: "Permission", detail: "Early leave at 13:00 for a medical checkup.", time: "09:48", status: "Open" },
  { id: "S-04", staff: "Peter Nair", type: "Escalation", detail: "Floor 3 delayed tasks need extra staff.", time: "10:05", status: "Assigned" },
];

export const ACTIVITY = [
  { id: "A-1", text: "Room 204 marked cleaned by Grace Okafor", time: "10:42" },
  { id: "A-2", text: "AC repair completed in Room 305", time: "10:31" },
  { id: "A-3", text: "Guest complaint received from Room 118", time: "10:19" },
  { id: "A-4", text: "Sofia Rossi checked in for shift", time: "09:58" },
  { id: "A-5", text: "Food order delivered to Room 410", time: "09:47" },
  { id: "A-6", text: "Room 512 reserved for VIP arrival", time: "09:22" },
  { id: "A-7", text: "Maintenance ticket M-505 escalated to vendor", time: "09:05" },
];

export const AUDIT_LOG = [
  { id: "L-1", action: "Role changed", detail: "Sofia Rossi: Housekeeping → Food & Beverage", by: "Daniel Okoye", time: "Today 09:12" },
  { id: "L-2", action: "Employee suspended", detail: "Laura Fernandes suspended pending review", by: "Daniel Okoye", time: "Yesterday 17:40" },
  { id: "L-3", action: "Shift updated", detail: "Omar Haddad moved to 15:00 - 23:00", by: "Daniel Okoye", time: "Yesterday 12:05" },
  { id: "L-4", action: "New employee added", detail: "Sofia Rossi joined Food & Beverage", by: "Daniel Okoye", time: "11 Jan 2025" },
];

export const OCCUPANCY_TREND = [
  { day: "Mon", occupancy: 68, target: 72 },
  { day: "Tue", occupancy: 74, target: 72 },
  { day: "Wed", occupancy: 71, target: 72 },
  { day: "Thu", occupancy: 79, target: 75 },
  { day: "Fri", occupancy: 88, target: 80 },
  { day: "Sat", occupancy: 94, target: 85 },
  { day: "Sun", occupancy: 82, target: 80 },
];

export const TASK_COMPLETION = [
  { day: "Mon", completed: 118, assigned: 130 },
  { day: "Tue", completed: 126, assigned: 138 },
  { day: "Wed", completed: 132, assigned: 140 },
  { day: "Thu", completed: 121, assigned: 136 },
  { day: "Fri", completed: 145, assigned: 152 },
  { day: "Sat", completed: 158, assigned: 170 },
  { day: "Sun", completed: 140, assigned: 148 },
];

export const RESPONSE_TIME = [
  { day: "Mon", minutes: 9 },
  { day: "Tue", minutes: 8 },
  { day: "Wed", minutes: 7.5 },
  { day: "Thu", minutes: 8.4 },
  { day: "Fri", minutes: 6.9 },
  { day: "Sat", minutes: 6.2 },
  { day: "Sun", minutes: 7.1 },
];

export const SATISFACTION = [
  { day: "Mon", score: 4.3 },
  { day: "Tue", score: 4.4 },
  { day: "Wed", score: 4.5 },
  { day: "Thu", score: 4.4 },
  { day: "Fri", score: 4.6 },
  { day: "Sat", score: 4.7 },
  { day: "Sun", score: 4.6 },
];

export const DEPARTMENT_WORKLOAD = [
  { dept: "Reception", tasks: 42 },
  { dept: "Housekeeping", tasks: 96 },
  { dept: "Maintenance", tasks: 31 },
  { dept: "F&B", tasks: 58 },
  { dept: "Floor Mgmt", tasks: 22 },
];

export const STAFF_PRODUCTIVITY = [
  { name: "Grace O.", score: 98 },
  { name: "Anita S.", score: 96 },
  { name: "Daniel O.", score: 95 },
  { name: "Mei T.", score: 93 },
  { name: "Ravi K.", score: 91 },
  { name: "Peter N.", score: 90 },
];

export const STAFF_AVAILABILITY = [
  { department: "Reception", onDuty: 5, offDuty: 2, required: 5 },
  { department: "Housekeeping", onDuty: 12, offDuty: 3, required: 14 },
  { department: "Maintenance", onDuty: 4, offDuty: 1, required: 4 },
  { department: "Food & Beverage", onDuty: 8, offDuty: 2, required: 8 },
  { department: "Floor Managers", onDuty: 3, offDuty: 0, required: 4 },
];
