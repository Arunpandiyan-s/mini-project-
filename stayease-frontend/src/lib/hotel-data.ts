import pancakes from "@/assets/food-pancakes.jpg";
import sandwich from "@/assets/food-sandwich.jpg";
import salmon from "@/assets/food-salmon.jpg";
import coffee from "@/assets/food-coffee.jpg";
import fruit from "@/assets/food-fruit.jpg";
import springrolls from "@/assets/food-springrolls.jpg";

export type RequestStatus = "pending" | "progress" | "completed" | "attention";

export type GuestRequest = {
  id: string;
  type: string;
  submitted: string;
  status: RequestStatus;
  note?: string;
};

export const statusMeta: Record<RequestStatus, { label: string; dot: string; chip: string }> = {
  pending: {
    label: "Pending",
    dot: "bg-status-pending",
    chip: "bg-muted text-muted-foreground",
  },
  progress: {
    label: "In Progress",
    dot: "bg-status-progress",
    chip: "bg-primary/10 text-primary",
  },
  completed: {
    label: "Completed",
    dot: "bg-status-done",
    chip: "bg-status-done/12 text-status-done",
  },
  attention: {
    label: "Attention Needed",
    dot: "bg-status-alert",
    chip: "bg-destructive/10 text-destructive",
  },
};

export const guest = {
  name: "Aisha Rahman",
  room: "512",
  roomType: "Deluxe King · Sea View",
  checkIn: "12 Aug 2026",
  checkOut: "16 Aug 2026",
  phone: "+1 (415) 555-0182",
  email: "aisha.rahman@example.com",
  language: "English",
};

export const initialRequests: GuestRequest[] = [
  { id: "r1", type: "Extra Towels", submitted: "Today · 09:12", status: "completed" },
  { id: "r2", type: "Housekeeping", submitted: "Today · 08:40", status: "progress" },
  { id: "r3", type: "Maintenance: AC noise", submitted: "Yesterday · 21:05", status: "attention" },
  { id: "r4", type: "Laundry Pickup", submitted: "Yesterday · 18:20", status: "pending" },
  { id: "r5", type: "Wake-Up Call · 06:30", submitted: "Yesterday · 22:10", status: "completed" },
  { id: "r6", type: "Food Order · Club Sandwich", submitted: "13 Aug · 13:45", status: "completed" },
];

export type FoodCategory = "Breakfast" | "Lunch" | "Dinner" | "Snacks" | "Beverages";

export type FoodItem = {
  id: string;
  name: string;
  price: number;
  category: FoodCategory;
  image: string;
  description: string;
};

export const foodCategories: FoodCategory[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Beverages",
];

export const foodMenu: FoodItem[] = [
  {
    id: "f1",
    name: "Berry Pancake Stack",
    price: 12,
    category: "Breakfast",
    image: pancakes,
    description: "Buttermilk pancakes, maple syrup, seasonal berries.",
  },
  {
    id: "f2",
    name: "Seasonal Fruit Bowl",
    price: 8,
    category: "Breakfast",
    image: fruit,
    description: "Melon, strawberries and mint, chilled.",
  },
  {
    id: "f3",
    name: "Club Sandwich & Fries",
    price: 16,
    category: "Lunch",
    image: sandwich,
    description: "Triple-decker club with hand-cut fries.",
  },
  {
    id: "f4",
    name: "Grilled Salmon",
    price: 26,
    category: "Lunch",
    image: salmon,
    description: "Atlantic salmon, asparagus, lemon butter.",
  },
  {
    id: "f5",
    name: "Salmon Fillet Dinner",
    price: 29,
    category: "Dinner",
    image: salmon,
    description: "Chef's evening plate with grilled vegetables.",
  },
  {
    id: "f6",
    name: "Spring Rolls",
    price: 9,
    category: "Dinner",
    image: springrolls,
    description: "Crispy vegetable rolls, sweet chilli dip.",
  },
  {
    id: "f7",
    name: "Crispy Spring Rolls",
    price: 7,
    category: "Snacks",
    image: springrolls,
    description: "Six pieces, served warm.",
  },
  {
    id: "f8",
    name: "Fruit & Yogurt Cup",
    price: 6,
    category: "Snacks",
    image: fruit,
    description: "Light bite, perfect between meals.",
  },
  {
    id: "f9",
    name: "Iced Signature Coffee",
    price: 5,
    category: "Beverages",
    image: coffee,
    description: "House blend over ice with cream swirl.",
  },
  {
    id: "f10",
    name: "Cold Brew Latte",
    price: 6,
    category: "Beverages",
    image: coffee,
    description: "Slow-steeped 18 hours, lightly sweet.",
  },
];

export type Contact = {
  name: string;
  detail: string;
  phone: string;
  email: string;
};

export const contacts: Contact[] = [
  { name: "Reception", detail: "24/7 front desk", phone: "+15550100", email: "reception@stayease.com" },
  { name: "Housekeeping", detail: "06:00 – 23:00", phone: "+15550101", email: "housekeeping@stayease.com" },
  { name: "Restaurant", detail: "In-room dining", phone: "+15550102", email: "dining@stayease.com" },
  { name: "Maintenance", detail: "Technical support", phone: "+15550103", email: "maintenance@stayease.com" },
  { name: "Duty Manager", detail: "Escalations", phone: "+15550104", email: "manager@stayease.com" },
  { name: "Emergency", detail: "Immediate help", phone: "+15550911", email: "security@stayease.com" },
];

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

export const initialNotifications: Notification[] = [
  {
    id: "n1",
    title: "Service assigned",
    body: "Rahul from housekeeping is handling your towel request.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Maintenance on the way",
    body: "A technician will reach Room 512 in about 10 minutes.",
    time: "18 min ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Food order dispatched",
    body: "Your Club Sandwich has left the kitchen.",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: "n4",
    title: "Housekeeping completed",
    body: "Room 512 has been serviced and refreshed.",
    time: "3 hrs ago",
    unread: false,
  },
  {
    id: "n5",
    title: "Checkout reminder",
    body: "Checkout is on 16 Aug at 11:00. Late checkout available on request.",
    time: "Yesterday",
    unread: false,
  },
];

export const roomInfo = {
  wifiName: "StayEase_Guest_5F",
  wifiPassword: "Stay512Ease",
  tv: "Press Home on the remote, then choose Guest Streaming to cast from your phone.",
  ac: "Set 22–24°C on the bedside panel. The unit pauses when the balcony door opens.",
  water: "Filtered drinking water from the tap marked blue. Complimentary bottles refilled daily.",
  emergency: "Assembly point: Garden Lawn. Fire exit is 20m left of your door. Dial 9 for security.",
  policies: "No smoking indoors. Quiet hours 22:00–07:00. Visitors must register at reception.",
};