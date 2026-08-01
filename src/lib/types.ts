export type MealType = "breakfast" | "lunch" | "dinner";
export type BookingStatus = "booked" | "cancelled" | "attended";

export const MEALS: MealType[] = ["breakfast", "lunch", "dinner"];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export interface SlotAvailability {
  slot_id: string;
  slot_date: string;
  meal: MealType;
  menu: string;
  capacity: number;
  start_time: string;
  end_time: string;
  booking_cutoff_minutes: number;
  booked_seats: number;
  remaining_seats: number;
  checked_in_count: number;
}

export interface SlotRatingStat {
  slot_id: string;
  slot_date: string;
  meal: MealType;
  menu: string;
  review_count: number;
  avg_overall: number;
  avg_taste: number;
  avg_hygiene: number;
  avg_quantity: number;
  avg_temperature: number;
}

export interface PollResult {
  poll_id: string;
  option_id: string;
  label: string;
  votes: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  student_id: string;
  status: BookingStatus;
  token_code: string;
  created_at: string;
}

export interface MealSlot {
  id: string;
  slot_date: string;
  meal: MealType;
  menu: string;
  capacity: number;
  start_time: string;
  end_time: string;
  booking_cutoff_minutes: number;
}

export interface Review {
  id: string;
  booking_id: string;
  slot_id: string;
  student_id: string;
  overall: number;
  taste: number;
  hygiene: number;
  quantity: number;
  temperature: number;
  comment: string;
  emoji: string | null;
  image_url: string | null;
  is_anonymous: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  target_day: string | null;
  meal: MealType | null;
  closes_at: string;
  is_active: boolean;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
}

export interface CheckIn {
  id: string;
  booking_id: string;
  student_id: string;
  slot_id: string;
  method: string;
  checked_in_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface AiPlan {
  id: string;
  kind: string;
  title: string;
  prompt: string;
  content: string;
  created_at: string;
}

/** Local date string (YYYY-MM-DD) without UTC drift. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function formatTime(value: string): string {
  const [h, m] = value.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${suffix}`;
}

export function formatDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Booking closes `cutoff` minutes before the slot starts. */
export function bookingClosed(slot: SlotAvailability): boolean {
  const [y, m, d] = slot.slot_date.split("-").map(Number);
  const [hh, mm] = slot.start_time.split(":").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return start.getTime() - slot.booking_cutoff_minutes * 60_000 <= Date.now();
}
