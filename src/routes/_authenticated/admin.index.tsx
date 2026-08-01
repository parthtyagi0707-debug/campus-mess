import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, ScanLine, Star, TrendingDown, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { fetchAvailability, fetchRatingStats, fetchReviews } from "@/lib/api";
import { MEAL_LABEL, formatDate, todayISO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Mess manager overview — Smart Mess" },
      { name: "description", content: "Attendance, wastage risk and satisfaction analytics for the hostel mess." },
      { property: "og:title", content: "Mess manager overview — Smart Mess" },
      { property: "og:description", content: "Live attendance, no-show and rating analytics for your mess." },
    ],
  }),
  component: AdminOverview,
});

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function AdminOverview() {
  const today = todayISO();
  const from = addDays(today, -13);
  const to = addDays(today, 3);

  const { data: slots } = useQuery({
    queryKey: ["availability", from, to],
    queryFn: () => fetchAvailability(from, to),
  });
  const { data: stats } = useQuery({ queryKey: ["rating-stats"], queryFn: fetchRatingStats });
  const { data: reviews } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });

  const all = slots ?? [];
  const pastOrToday = all.filter((s) => s.slot_date <= today);
  const totalBooked = pastOrToday.reduce((sum, s) => sum + Number(s.booked_seats), 0);
  const totalAttended = pastOrToday.reduce((sum, s) => sum + Number(s.checked_in_count), 0);
  const noShowRate = totalBooked ? ((totalBooked - totalAttended) / totalBooked) * 100 : 0;
  const avgRating = (stats ?? []).length
    ? (stats ?? []).reduce((sum, s) => sum + Number(s.avg_overall), 0) / (stats ?? []).length
    : 0;

  const byDate = new Map<string, { date: string; booked: number; attended: number }>();
  pastOrToday.forEach((slot) => {
    const row = byDate.get(slot.slot_date) ?? { date: slot.slot_date, booked: 0, attended: 0 };
    row.booked += Number(slot.booked_seats);
    row.attended += Number(slot.checked_in_count);
    byDate.set(slot.slot_date, row);
  });
  const trend = Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ ...row, label: formatDate(row.date) }));

  const mealBreakdown = (["breakfast", "lunch", "dinner"] as const).map((meal) => {
    const mealSlots = pastOrToday.filter((s) => s.meal === meal);
    const booked = mealSlots.reduce((sum, s) => sum + Number(s.booked_seats), 0);
    const attended = mealSlots.reduce((sum, s) => sum + Number(s.checked_in_count), 0);
    return { meal: MEAL_LABEL[meal], booked, attended };
  });

  const worst = (stats ?? [])
    .slice()
    .sort((a, b) => Number(a.avg_overall) - Number(b.avg_overall))
    .slice(0, 5);

  return (
    <AppShell
      title="Mess manager overview"
      description="Last two weeks of bookings, attendance and satisfaction — plus what needs fixing."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Seats booked" value={totalBooked} icon={CalendarCheck} />
        <StatCard label="Checked in" value={totalAttended} icon={ScanLine} tone="accent" delay={0.05} />
        <StatCard
          label="No-show rate"
          value={`${noShowRate.toFixed(1)}%`}
          hint="Booked but never scanned"
          icon={TrendingDown}
          tone={noShowRate > 20 ? "destructive" : "warning"}
          delay={0.1}
        />
        <StatCard
          label="Avg satisfaction"
          value={avgRating ? avgRating.toFixed(2) : "—"}
          hint={`${(reviews ?? []).length} reviews`}
          icon={Star}
          delay={0.15}
        />
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        <section className="glass rounded-2xl p-5 xl:col-span-2">
          <h2 className="font-display text-lg font-semibold">Booked vs attended</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="booked" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="attended" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">By meal</h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="meal" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="booked" radius={[6, 6, 0, 0]} fill="var(--primary)" />
                <Bar dataKey="attended" radius={[6, 6, 0, 0]}>
                  {mealBreakdown.map((row) => (
                    <Cell key={row.meal} fill="var(--accent)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-8 glass rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Users className="h-5 w-5 text-warning" /> Needs attention
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Lowest rated meals in the current window.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-2">Meal</th>
                <th className="pb-2">Menu</th>
                <th className="pb-2">Reviews</th>
                <th className="pb-2">Overall</th>
                <th className="pb-2">Weakest area</th>
              </tr>
            </thead>
            <tbody>
              {worst.map((stat) => {
                const areas = [
                  ["Taste", Number(stat.avg_taste)],
                  ["Hygiene", Number(stat.avg_hygiene)],
                  ["Quantity", Number(stat.avg_quantity)],
                  ["Temperature", Number(stat.avg_temperature)],
                ] as [string, number][];
                const weakest = areas.sort((a, b) => a[1] - b[1])[0];
                return (
                  <tr key={stat.slot_id} className="border-t border-border">
                    <td className="py-2.5">
                      {MEAL_LABEL[stat.meal]} · {formatDate(stat.slot_date)}
                    </td>
                    <td className="max-w-[220px] truncate py-2.5 text-muted-foreground">{stat.menu}</td>
                    <td className="py-2.5">{stat.review_count}</td>
                    <td className="py-2.5 font-semibold">{Number(stat.avg_overall).toFixed(2)}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {weakest ? `${weakest[0]} (${weakest[1].toFixed(1)})` : "—"}
                    </td>
                  </tr>
                );
              })}
              {worst.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No reviews collected yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
