import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchAvailability } from "@/lib/api";
import { MEALS, MEAL_LABEL, formatDate, formatTime, todayISO } from "@/lib/types";
import type { MealType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/menu")({
  head: () => ({
    meta: [
      { title: "Slots & menu editor — Smart Mess" },
      {
        name: "description",
        content: "Create hostel meal slots, publish the menu, set capacity and booking cutoffs.",
      },
      { property: "og:title", content: "Slots & menu editor — Smart Mess" },
      {
        property: "og:description",
        content: "Publish the mess menu and manage seat capacity per meal slot.",
      },
    ],
  }),
  component: AdminMenuPage,
});

const DEFAULT_TIMES: Record<MealType, { start: string; end: string }> = {
  breakfast: { start: "07:30", end: "09:30" },
  lunch: { start: "12:30", end: "14:30" },
  dinner: { start: "19:30", end: "21:30" },
};

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function AdminMenuPage() {
  const today = todayISO();
  const to = addDays(today, 13);
  const queryClient = useQueryClient();

  const [slotDate, setSlotDate] = useState(today);
  const [meal, setMeal] = useState<MealType>("lunch");
  const [menu, setMenu] = useState("");
  const [capacity, setCapacity] = useState("150");
  const [startTime, setStartTime] = useState(DEFAULT_TIMES.lunch.start);
  const [endTime, setEndTime] = useState(DEFAULT_TIMES.lunch.end);
  const [cutoff, setCutoff] = useState("60");

  const { data: slots, isLoading } = useQuery({
    queryKey: ["availability", today, to],
    queryFn: () => fetchAvailability(today, to),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  }

  const createSlot = useMutation({
    mutationFn: async () => {
      if (menu.trim().length < 3) throw new Error("Describe the menu for this slot.");
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || cap < 1 || cap > 5000) throw new Error("Capacity must be 1–5000.");
      const cut = Number(cutoff);
      if (!Number.isFinite(cut) || cut < 0 || cut > 1440) throw new Error("Cutoff must be 0–1440 minutes.");
      if (startTime >= endTime) throw new Error("Serving window end must be after the start.");

      const { error } = await supabase.from("meal_slots").insert({
        slot_date: slotDate,
        meal,
        menu: menu.trim().slice(0, 600),
        capacity: cap,
        start_time: startTime,
        end_time: endTime,
        booking_cutoff_minutes: cut,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot published.");
      setMenu("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateSlot = useMutation({
    mutationFn: async (input: { id: string; menu?: string; capacity?: number }) => {
      const patch: { menu?: string; capacity?: number } = {};
      if (input.menu !== undefined) patch.menu = input.menu.slice(0, 600);
      if (input.capacity !== undefined) patch.capacity = input.capacity;
      const { error } = await supabase.from("meal_slots").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot updated.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot removed.");
      refresh();
    },
    onError: () => toast.error("Slots with bookings can't be deleted. Cancel the bookings first."),
  });

  const seedWeek = useMutation({
    mutationFn: async () => {
      const rows: {
        slot_date: string;
        meal: MealType;
        menu: string;
        capacity: number;
        start_time: string;
        end_time: string;
        booking_cutoff_minutes: number;
      }[] = [];
      const existing = new Set((slots ?? []).map((s) => `${s.slot_date}|${s.meal}`));
      for (let i = 0; i < 7; i += 1) {
        const date = addDays(today, i);
        for (const m of MEALS) {
          if (existing.has(`${date}|${m}`)) continue;
          rows.push({
            slot_date: date,
            meal: m,
            menu: "Menu to be announced",
            capacity: 150,
            start_time: DEFAULT_TIMES[m].start,
            end_time: DEFAULT_TIMES[m].end,
            booking_cutoff_minutes: 60,
          });
        }
      }
      if (rows.length === 0) throw new Error("The next 7 days already have every slot.");
      const { error } = await supabase.from("meal_slots").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} slots created for the week.`);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const grouped = (slots ?? []).reduce<Record<string, typeof slots>>((acc, slot) => {
    (acc[slot.slot_date] ??= [])!.push(slot);
    return acc;
  }, {});

  return (
    <AppShell
      title="Slots & menu"
      description="Publish what's cooking, control seat capacity and booking cutoffs."
    >
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="glass h-fit rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">New meal slot</h2>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={slotDate}
                  min={today}
                  onChange={(e) => setSlotDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Meal</Label>
                <Select
                  value={meal}
                  onValueChange={(value) => {
                    const next = value as MealType;
                    setMeal(next);
                    setStartTime(DEFAULT_TIMES[next].start);
                    setEndTime(DEFAULT_TIMES[next].end);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEALS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MEAL_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu">Menu</Label>
              <Textarea
                id="menu"
                rows={3}
                maxLength={600}
                value={menu}
                onChange={(e) => setMenu(e.target.value)}
                placeholder="Rajma chawal, jeera aloo, salad, gulab jamun"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">Serving from</Label>
                <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Serving till</Label>
                <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cap">Capacity</Label>
                <Input id="cap" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cut">Cutoff (min)</Label>
                <Input id="cut" type="number" min={0} value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
              </div>
            </div>

            <Button className="w-full" onClick={() => createSlot.mutate()} disabled={createSlot.isPending}>
              {createSlot.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
              Publish slot
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => seedWeek.mutate()}
              disabled={seedWeek.isPending}
            >
              {seedWeek.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Fill the next 7 days
            </Button>
          </div>
        </section>

        <section className="space-y-5">
          {isLoading ? (
            <div className="glass grid h-40 place-items-center rounded-2xl">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              No upcoming slots yet. Publish one, or fill the next 7 days in one click.
            </div>
          ) : (
            Object.entries(grouped).map(([date, daySlots]) => (
              <div key={date} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold">{formatDate(date)}</h3>
                  <Badge variant="secondary">{(daySlots ?? []).length} slots</Badge>
                </div>
                <div className="mt-4 space-y-4">
                  {(daySlots ?? []).map((slot) => (
                    <div key={slot.slot_id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge>{MEAL_LABEL[slot.meal]}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {slot.booked_seats}/{slot.capacity} booked · {slot.checked_in_count} in
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete slot"
                            onClick={() => deleteSlot.mutate(slot.slot_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_130px]">
                        <Textarea
                          rows={2}
                          defaultValue={slot.menu}
                          maxLength={600}
                          onBlur={(e) => {
                            if (e.target.value !== slot.menu) {
                              updateSlot.mutate({ id: slot.slot_id, menu: e.target.value });
                            }
                          }}
                        />
                        <Input
                          type="number"
                          min={slot.booked_seats}
                          defaultValue={slot.capacity}
                          aria-label="Capacity"
                          onBlur={(e) => {
                            const next = Number(e.target.value);
                            if (Number.isFinite(next) && next !== slot.capacity) {
                              updateSlot.mutate({ id: slot.slot_id, capacity: next });
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
