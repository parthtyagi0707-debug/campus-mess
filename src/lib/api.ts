import { supabase } from "@/integrations/supabase/client";
import type {
  AiPlan,
  AppNotification,
  Booking,
  CheckIn,
  MealSlot,
  Poll,
  PollOption,
  PollResult,
  Review,
  SlotAvailability,
  SlotRatingStat,
} from "./types";

export async function fetchAvailability(from: string, to: string): Promise<SlotAvailability[]> {
  const { data, error } = await supabase.rpc("get_slot_availability", { _from: from, _to: to });
  if (error) throw error;
  return (data ?? []) as unknown as SlotAvailability[];
}

export async function fetchRatingStats(): Promise<SlotRatingStat[]> {
  const { data, error } = await supabase.rpc("get_slot_rating_stats");
  if (error) throw error;
  return (data ?? []) as unknown as SlotRatingStat[];
}

export async function fetchPollResults(): Promise<PollResult[]> {
  const { data, error } = await supabase.rpc("get_poll_results");
  if (error) throw error;
  return (data ?? []) as unknown as PollResult[];
}

export async function fetchMyBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Booking[];
}

export async function fetchAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Booking[];
}

export async function fetchSlots(from: string, to: string): Promise<MealSlot[]> {
  const { data, error } = await supabase
    .from("meal_slots")
    .select("*")
    .gte("slot_date", from)
    .lte("slot_date", to)
    .order("slot_date")
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as unknown as MealSlot[];
}

export async function fetchMyCheckIns(userId: string): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("student_id", userId)
    .order("checked_in_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CheckIn[];
}

export async function fetchCheckIns(): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .order("checked_in_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as CheckIn[];
}

export async function fetchReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function fetchPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Poll[];
}

export async function fetchPollOptions(): Promise<PollOption[]> {
  const { data, error } = await supabase.from("poll_options").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as PollOption[];
}

export async function fetchMyVotes(userId: string) {
  const { data, error } = await supabase
    .from("votes")
    .select("poll_id, option_id")
    .eq("student_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

export async function fetchAiPlans(): Promise<AiPlan[]> {
  const { data, error } = await supabase
    .from("ai_plans")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AiPlan[];
}

export async function notify(userId: string, title: string, body: string) {
  await supabase.from("notifications").insert({ user_id: userId, title, body });
}

export async function signedImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("review-images").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
