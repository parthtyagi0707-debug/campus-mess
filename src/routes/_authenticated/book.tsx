import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CalendarDays, Loader2, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchAvailability, fetchMyBookings, notify } from "@/lib/api";
import { useAuthUser } from "@/lib/session";
import { MEAL_LABEL, bookingClosed, formatDate, formatTime, todayISO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/book")({
  head: () => ({
    meta: [
      { title: "Book a meal — Smart Mess" },
      { name: "description", content: "Reserve breakfast, lunch or dinner slots with live seat availability." },
      { property: "og:title", content: "Book a meal — Smart Mess" },
      { property: "og:description", content: "Reserve your hostel mess seat before the cutoff time." },
    ],
  }),
  component: BookPage,
});

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function BookPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const today = todayISO();
  const to = addDays(today, 6);
  const [selectedDate, setSelectedDate] = useState(today);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const { data: slots, isLoading } = useQuery({
    queryKey: ["availability", today, to],
    queryFn: () => fetchAvailability(today, to),
  });
  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyBookings(user!.id),
  });

  const bookedSlotIds = new Set(
    (bookings ?? []).filter((b) => b.status !== "cancelled").map((b) => b.slot_id),
  );

  const book = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("bookings").insert({
        slot_id: slotId,
        student_id: user!.id,
      });
      if (error) throw error;
      await notify(user!.id, "Meal booked", "Your QR token is ready under My tokens.");
    },
    onSuccess: () => {
      toast.success("Booked. Your QR token is ready.");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancel = useMutation({
    mutationFn: async (slotId: string) => {
      const booking = (bookings ?? []).find((b) => b.slot_id === slotId && b.status === "booked");
      if (!booking) throw new Error("Booking not found or already used.");
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled.");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const daySlots = (slots ?? []).filter((s) => s.slot_date === selectedDate);

  return (
    <AppShell
      title="Book a meal"
      description="Seats are limited and booking closes before each slot starts. Cancel any time before the cutoff."
    >
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const active = day === selectedDate;
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(day)}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card/60 hover:bg-secondary"
              }`}
            >
              {day === today ? "Today" : formatDate(day)}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="glass col-span-full grid place-items-center rounded-2xl p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : daySlots.length === 0 ? (
          <div className="glass col-span-full rounded-2xl p-10 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No meal slots published for {formatDate(selectedDate)}.
            </p>
          </div>
        ) : (
          daySlots.map((slot, i) => {
            const isBooked = bookedSlotIds.has(slot.slot_id);
            const closed = bookingClosed(slot);
            const full = slot.remaining_seats <= 0;
            const fillPercent = Math.min(100, (slot.booked_seats / Math.max(1, slot.capacity)) * 100);
            return (
              <motion.article
                key={slot.slot_id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="glass flex flex-col rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{MEAL_LABEL[slot.meal]}</h2>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </p>
                  </div>
                  {isBooked ? (
                    <Badge>Booked</Badge>
                  ) : closed ? (
                    <Badge variant="outline">Closed</Badge>
                  ) : full ? (
                    <Badge variant="destructive">Full</Badge>
                  ) : (
                    <Badge variant="secondary">{slot.remaining_seats} left</Badge>
                  )}
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{slot.menu}</p>

                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full gradient-lime" style={{ width: `${fillPercent}%` }} />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" /> {slot.booked_seats}/{slot.capacity} booked ·{" "}
                    {slot.booking_cutoff_minutes} min cutoff
                  </p>
                </div>

                <div className="mt-4">
                  {isBooked ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={closed || cancel.isPending}
                      onClick={() => cancel.mutate(slot.slot_id)}
                    >
                      {closed ? "Cutoff passed" : "Cancel booking"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={closed || full || book.isPending}
                      onClick={() => book.mutate(slot.slot_id)}
                    >
                      {book.isPending && book.variables === slot.slot_id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {closed ? "Booking closed" : full ? "Slot full" : "Book this meal"}
                    </Button>
                  )}
                </div>
              </motion.article>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
