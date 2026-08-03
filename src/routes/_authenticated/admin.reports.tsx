import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllBookings,
  fetchAvailability,
  fetchCheckIns,
  fetchRatingStats,
  fetchReviews,
} from "@/lib/api";
import { buildReport } from "@/lib/pdf";
import { MEAL_LABEL, formatDate, todayISO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "PDF reports — Smart Mess" },
      {
        name: "description",
        content: "Download branded attendance, wastage and satisfaction reports for the hostel mess.",
      },
      { property: "og:title", content: "PDF reports — Smart Mess" },
      {
        property: "og:description",
        content: "One-click PDF reports on attendance, no-shows, ratings and menu polls.",
      },
    ],
  }),
  component: AdminReportsPage,
});

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function AdminReportsPage() {
  const today = todayISO();
  const [from, setFrom] = useState(addDays(today, -13));
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: slots, isLoading } = useQuery({
    queryKey: ["availability", from, to],
    queryFn: () => fetchAvailability(from, to),
  });
  const { data: stats } = useQuery({ queryKey: ["rating-stats"], queryFn: fetchRatingStats });
  const { data: reviews } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });
  const { data: bookings } = useQuery({ queryKey: ["all-bookings"], queryFn: fetchAllBookings });
  const { data: checkIns } = useQuery({ queryKey: ["all-check-ins"], queryFn: fetchCheckIns });

  const range = useMemo(() => slots ?? [], [slots]);
  const booked = range.reduce((sum, s) => sum + Number(s.booked_seats), 0);
  const attended = range.reduce((sum, s) => sum + Number(s.checked_in_count), 0);
  const capacity = range.reduce((sum, s) => sum + Number(s.capacity), 0);
  const noShow = booked ? ((booked - attended) / booked) * 100 : 0;
  const inRangeStats = (stats ?? []).filter((s) => s.slot_date >= from && s.slot_date <= to);
  const avgRating = inRangeStats.length
    ? inRangeStats.reduce((sum, s) => sum + Number(s.avg_overall), 0) / inRangeStats.length
    : 0;

  const label = `${formatDate(from)} – ${formatDate(to)}`;

  function attendanceReport() {
    setBusy("attendance");
    try {
      buildReport({
        title: "Mess attendance report",
        subtitle: label,
        summary: [
          `${range.length} meal slots served with a combined capacity of ${capacity} seats.`,
          `${booked} seats booked and ${attended} students checked in.`,
          `No-show rate of ${noShow.toFixed(1)}% — every no-show is a wasted plate.`,
          `Seat utilisation against capacity: ${capacity ? ((booked / capacity) * 100).toFixed(1) : "0"}%.`,
        ],
        chart: {
          caption: "Check-ins per day",
          bars: Object.entries(
            range.reduce<Record<string, number>>((acc, slot) => {
              acc[slot.slot_date] = (acc[slot.slot_date] ?? 0) + Number(slot.checked_in_count);
              return acc;
            }, {}),
          ).map(([date, value]) => ({ label: formatDate(date), value })),
        },
        tables: [
          {
            caption: "Slot by slot",
            head: ["Date", "Meal", "Menu", "Capacity", "Booked", "Attended", "No-shows"],
            rows: range.map((slot) => [
              formatDate(slot.slot_date),
              MEAL_LABEL[slot.meal],
              slot.menu.slice(0, 42),
              slot.capacity,
              slot.booked_seats,
              slot.checked_in_count,
              Number(slot.booked_seats) - Number(slot.checked_in_count),
            ]),
          },
        ],
        fileName: `mess-attendance-${from}-to-${to}.pdf`,
      });
      toast.success("Attendance report downloaded.");
    } catch {
      toast.error("Couldn't build that report.");
    } finally {
      setBusy(null);
    }
  }

  function satisfactionReport() {
    setBusy("satisfaction");
    try {
      const low = inRangeStats.filter((s) => Number(s.avg_overall) < 3);
      buildReport({
        title: "Food satisfaction report",
        subtitle: label,
        summary: [
          `${inRangeStats.length} rated meals with an average score of ${avgRating.toFixed(2)}/5.`,
          `${low.length} meals scored below 3/5 and need a recipe or supplier review.`,
          `${(reviews ?? []).filter((r) => !r.admin_reply).length} reviews across all time are still awaiting a manager reply.`,
        ],
        chart: {
          caption: "Average rating by meal",
          bars: (["breakfast", "lunch", "dinner"] as const).map((meal) => {
            const rows = inRangeStats.filter((s) => s.meal === meal);
            return {
              label: MEAL_LABEL[meal],
              value: rows.length
                ? rows.reduce((sum, s) => sum + Number(s.avg_overall), 0) / rows.length
                : 0,
            };
          }),
        },
        tables: [
          {
            caption: "Rated meals",
            head: ["Date", "Meal", "Menu", "Reviews", "Overall", "Taste", "Hygiene", "Quantity"],
            rows: inRangeStats.map((s) => [
              formatDate(s.slot_date),
              MEAL_LABEL[s.meal],
              s.menu.slice(0, 32),
              s.review_count,
              Number(s.avg_overall).toFixed(2),
              Number(s.avg_taste).toFixed(2),
              Number(s.avg_hygiene).toFixed(2),
              Number(s.avg_quantity).toFixed(2),
            ]),
          },
        ],
        fileName: `mess-satisfaction-${from}-to-${to}.pdf`,
      });
      toast.success("Satisfaction report downloaded.");
    } catch {
      toast.error("Couldn't build that report.");
    } finally {
      setBusy(null);
    }
  }

  function wastageReport() {
    setBusy("wastage");
    try {
      const worst = range
        .slice()
        .sort(
          (a, b) =>
            Number(b.booked_seats) -
            Number(b.checked_in_count) -
            (Number(a.booked_seats) - Number(a.checked_in_count)),
        )
        .slice(0, 15);
      buildReport({
        title: "Wastage & no-show report",
        subtitle: label,
        summary: [
          `${booked - attended} booked plates went unclaimed in this window.`,
          `That is a ${noShow.toFixed(1)}% no-show rate across ${range.length} slots.`,
          "Slots listed below are the biggest contributors — consider tightening cutoffs or capacity there.",
        ],
        chart: {
          caption: "No-shows by meal type",
          bars: (["breakfast", "lunch", "dinner"] as const).map((meal) => ({
            label: MEAL_LABEL[meal],
            value: range
              .filter((s) => s.meal === meal)
              .reduce((sum, s) => sum + (Number(s.booked_seats) - Number(s.checked_in_count)), 0),
          })),
        },
        tables: [
          {
            caption: "Highest no-show slots",
            head: ["Date", "Meal", "Booked", "Attended", "No-shows", "Cutoff (min)"],
            rows: worst.map((slot) => [
              formatDate(slot.slot_date),
              MEAL_LABEL[slot.meal],
              slot.booked_seats,
              slot.checked_in_count,
              Number(slot.booked_seats) - Number(slot.checked_in_count),
              slot.booking_cutoff_minutes,
            ]),
          },
        ],
        fileName: `mess-wastage-${from}-to-${to}.pdf`,
      });
      toast.success("Wastage report downloaded.");
    } catch {
      toast.error("Couldn't build that report.");
    } finally {
      setBusy(null);
    }
  }

  async function studentReport() {
    setBusy("students");
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, roll_number, room_number");
      if (error) throw error;

      const slotIds = new Set(range.map((s) => s.slot_id));
      const rows = (profiles ?? []).map((profile) => {
        const mine = (bookings ?? []).filter(
          (b) => b.student_id === profile.id && slotIds.has(b.slot_id),
        );
        const attendedCount = (checkIns ?? []).filter(
          (c) => c.student_id === profile.id && slotIds.has(c.slot_id),
        ).length;
        const active = mine.filter((b) => b.status !== "cancelled").length;
        return [
          profile.full_name || "—",
          profile.roll_number ?? "—",
          profile.room_number ?? "—",
          active,
          attendedCount,
          active ? `${Math.round((attendedCount / active) * 100)}%` : "—",
        ];
      });

      buildReport({
        title: "Student attendance register",
        subtitle: label,
        summary: [
          `${rows.length} registered students in the hostel mess.`,
          `${attended} check-ins recorded in this window.`,
        ],
        tables: [
          {
            caption: "Per student",
            head: ["Student", "Roll no", "Room", "Booked", "Attended", "Attendance %"],
            rows,
          },
        ],
        fileName: `mess-students-${from}-to-${to}.pdf`,
      });
      toast.success("Student register downloaded.");
    } catch {
      toast.error("Couldn't build that report.");
    } finally {
      setBusy(null);
    }
  }

  const REPORTS = [
    {
      key: "attendance",
      title: "Attendance report",
      body: "Slot-by-slot capacity, bookings, check-ins and a daily attendance chart.",
      run: attendanceReport,
    },
    {
      key: "satisfaction",
      title: "Food satisfaction report",
      body: "Average scores per meal with taste, hygiene and quantity breakdowns.",
      run: satisfactionReport,
    },
    {
      key: "wastage",
      title: "Wastage & no-shows",
      body: "Unclaimed plates, worst offending slots and no-shows by meal type.",
      run: wastageReport,
    },
    {
      key: "students",
      title: "Student register",
      body: "Per-student booking versus attendance percentages for the window.",
      run: studentReport,
    },
  ];

  return (
    <AppShell title="PDF reports" description="Branded, print-ready reports for the hostel office.">
      <div className="glass rounded-2xl p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => { setFrom(addDays(today, -29)); setTo(today); }}>
            Last 30 days
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Slots in range" value={range.length} icon={FileText} />
        <StatCard label="Seats booked" value={booked} />
        <StatCard label="No-show rate" value={`${noShow.toFixed(1)}%`} tone="warning" />
        <StatCard label="Avg rating" value={avgRating ? avgRating.toFixed(2) : "—"} tone="accent" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <div key={report.key} className="glass flex flex-col rounded-2xl p-5">
            <h3 className="font-display text-base font-semibold">{report.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{report.body}</p>
            <Button className="mt-4" onClick={report.run} disabled={isLoading || busy !== null}>
              {busy === report.key ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
