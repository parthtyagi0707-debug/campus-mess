import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, QrCode, Star, TrendingUp, Utensils } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAvailability, fetchMyBookings, fetchMyCheckIns, fetchReviews } from "@/lib/api";
import { useAuthUser, useProfile } from "@/lib/session";
import { MEAL_LABEL, formatDate, formatTime, todayISO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Smart Mess" },
      { name: "description", content: "Your mess bookings, upcoming meals and dining activity at a glance." },
      { property: "og:title", content: "Dashboard — Smart Mess" },
      { property: "og:description", content: "Track your hostel mess bookings, check-ins and ratings." },
    ],
  }),
  component: Dashboard,
});

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function Dashboard() {
  const { user } = useAuthUser();
  const { data: profile } = useProfile(user?.id);
  const today = todayISO();

  const { data: slots } = useQuery({
    queryKey: ["availability", today, addDays(today, 3)],
    queryFn: () => fetchAvailability(today, addDays(today, 3)),
  });
  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyBookings(user!.id),
  });
  const { data: checkIns } = useQuery({
    queryKey: ["my-checkins", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyCheckIns(user!.id),
  });
  const { data: reviews } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });

  const myBookings = bookings ?? [];
  const active = myBookings.filter((b) => b.status !== "cancelled");
  const slotById = new Map((slots ?? []).map((s) => [s.slot_id, s]));
  const upcoming = active
    .map((b) => ({ booking: b, slot: slotById.get(b.slot_id) }))
    .filter((row) => row.slot)
    .sort((a, b) => `${a.slot!.slot_date}${a.slot!.start_time}`.localeCompare(`${b.slot!.slot_date}${b.slot!.start_time}`));

  const myReviews = (reviews ?? []).filter((r) => r.student_id === user?.id);
  const avgGiven = myReviews.length
    ? myReviews.reduce((sum, r) => sum + r.overall, 0) / myReviews.length
    : 0;

  return (
    <AppShell
      title={`Hello, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
      description="Your meals, tokens and mess activity for the next few days."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active bookings" value={active.length} icon={CalendarCheck} />
        <StatCard label="Meals attended" value={(checkIns ?? []).length} icon={Utensils} tone="accent" delay={0.05} />
        <StatCard label="Reviews written" value={myReviews.length} icon={Star} delay={0.1} />
        <StatCard
          label="Your avg rating"
          value={avgGiven ? avgGiven.toFixed(1) : "—"}
          hint="Across all your reviews"
          icon={TrendingUp}
          tone="accent"
          delay={0.15}
        />
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Upcoming meals</h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/book">Book more</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No upcoming bookings. Reserve your next meal to get a QR token.
              </p>
            ) : (
              upcoming.map(({ booking, slot }) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {MEAL_LABEL[slot!.meal]} · {formatDate(slot!.slot_date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(slot!.start_time)} – {formatTime(slot!.end_time)} · {slot!.menu}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={booking.status === "attended" ? "default" : "secondary"} className="capitalize">
                      {booking.status}
                    </Badge>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/my-tokens">
                        <QrCode className="mr-1.5 h-4 w-4" /> Token
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Today at the mess</h2>
          <div className="mt-4 space-y-3">
            {(slots ?? [])
              .filter((s) => s.slot_date === today)
              .map((slot) => (
                <div key={slot.slot_id} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{MEAL_LABEL[slot.meal]}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(slot.start_time)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{slot.menu}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full gradient-lime"
                      style={{
                        width: `${Math.min(100, (slot.booked_seats / Math.max(1, slot.capacity)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {slot.remaining_seats} of {slot.capacity} seats left
                  </p>
                </div>
              ))}
            {(slots ?? []).filter((s) => s.slot_date === today).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No slots published for today yet.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
