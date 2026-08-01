import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode as QrIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { fetchAvailability, fetchMyBookings } from "@/lib/api";
import { useAuthUser } from "@/lib/session";
import { MEAL_LABEL, formatDate, formatTime, todayISO, type Booking, type SlotAvailability } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/my-tokens")({
  head: () => ({
    meta: [
      { title: "My QR tokens — Smart Mess" },
      { name: "description", content: "Show your QR meal token at the mess counter to check in." },
      { property: "og:title", content: "My QR tokens — Smart Mess" },
      { property: "og:description", content: "Every booking mints a scannable QR token for counter check-in." },
    ],
  }),
  component: TokensPage,
});

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function TokenCard({ booking, slot }: { booking: Booking; slot: SlotAvailability | undefined }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(booking.token_code, {
      width: 320,
      margin: 1,
      color: { dark: "#14281a", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      active = false;
    };
  }, [booking.token_code]);

  return (
    <article className="glass flex flex-col items-center rounded-2xl p-6 text-center">
      <div className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {slot ? MEAL_LABEL[slot.meal] : "Meal"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {slot ? `${formatDate(slot.slot_date)} · ${formatTime(slot.start_time)}` : "Details unavailable"}
          </p>
        </div>
        <Badge
          variant={booking.status === "attended" ? "default" : booking.status === "cancelled" ? "outline" : "secondary"}
          className="capitalize"
        >
          {booking.status}
        </Badge>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-3">
        {dataUrl ? (
          <img src={dataUrl} alt="Meal check-in QR code" className="h-40 w-40" />
        ) : (
          <div className="grid h-40 w-40 place-items-center text-xs text-muted-foreground">Generating…</div>
        )}
      </div>
      <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{booking.token_code}</p>
      {slot ? <p className="mt-2 text-xs text-muted-foreground">{slot.menu}</p> : null}
    </article>
  );
}

function TokensPage() {
  const { user } = useAuthUser();
  const today = todayISO();

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyBookings(user!.id),
  });
  const { data: slots } = useQuery({
    queryKey: ["availability", addDays(today, -30), addDays(today, 14)],
    queryFn: () => fetchAvailability(addDays(today, -30), addDays(today, 14)),
  });

  const slotById = new Map((slots ?? []).map((s) => [s.slot_id, s]));
  const active = (bookings ?? []).filter((b) => b.status === "booked");
  const past = (bookings ?? []).filter((b) => b.status !== "booked");

  return (
    <AppShell
      title="My QR tokens"
      description="Show the QR at the counter. Each token can only be scanned once, during its meal window."
    >
      {active.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <QrIcon className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No active tokens. Book a meal to generate one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((booking) => (
            <TokenCard key={booking.id} booking={booking} slot={slotById.get(booking.slot_id)} />
          ))}
        </div>
      )}

      {past.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">History</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Meal</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {past.map((booking) => {
                  const slot = slotById.get(booking.slot_id);
                  return (
                    <tr key={booking.id} className="border-t border-border">
                      <td className="px-4 py-3">{slot ? MEAL_LABEL[slot.meal] : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {slot ? formatDate(slot.slot_date) : "—"}
                      </td>
                      <td className="px-4 py-3 capitalize">{booking.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
