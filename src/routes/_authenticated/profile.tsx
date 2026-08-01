import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { claimAdminRole } from "@/lib/admin.functions";
import { fetchMyBookings, fetchMyCheckIns } from "@/lib/api";
import { useAuthUser, useProfile, useRole } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Smart Mess" },
      { name: "description", content: "Update your hostel details and view your mess activity summary." },
      { property: "og:title", content: "Profile — Smart Mess" },
      { property: "og:description", content: "Manage your Smart Mess student profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuthUser();
  const { data: profile } = useProfile(user?.id);
  const { data: role } = useRole(user?.id);
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [hostel, setHostel] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setRoomNumber(profile.room_number ?? "");
    setPhone(profile.phone ?? "");
    setRollNumber(profile.roll_number ?? "");
    setHostel(profile.hostel ?? "");
  }, [profile]);

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

  const save = useMutation({
    mutationFn: async () => {
      if (fullName.trim().length < 2) throw new Error("Enter your full name.");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim().slice(0, 120),
          room_number: roomNumber.trim().slice(0, 20),
          phone: phone.trim().slice(0, 20),
          roll_number: rollNumber.trim().slice(0, 40),
          hostel: hostel.trim().slice(0, 80),
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const claim = useMutation({
    mutationFn: () => claimAdminRole(),
    onSuccess: (result) => {
      toast.success(result.granted ? "You are now the mess manager." : "You already have admin access.");
      queryClient.invalidateQueries({ queryKey: ["role"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const attended = (checkIns ?? []).length;
  const booked = (bookings ?? []).filter((b) => b.status !== "cancelled").length;

  return (
    <AppShell title="Profile" description="Your hostel details and mess activity.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Meals booked" value={booked} />
        <StatCard label="Meals attended" value={attended} tone="accent" delay={0.05} />
        <StatCard
          label="No-show rate"
          value={booked ? `${Math.round(((booked - attended) / booked) * 100)}%` : "—"}
          tone="warning"
          delay={0.1}
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Your details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Room number</Label>
              <Input id="room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="B-214" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll">Roll number</Label>
              <Input id="roll" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="21CS1043" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hostel">Hostel block</Label>
              <Input id="hostel" value={hostel} onChange={(e) => setHostel(e.target.value)} placeholder="Nilgiri Block B" />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-accent" /> Access
          </h2>
          <Badge variant="secondary" className="mt-3 capitalize">
            {role ?? "student"}
          </Badge>
          {role === "admin" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              You have mess manager access — the admin tools are in the sidebar.
            </p>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                Setting this mess up for the first time? Claim the mess manager role. This only works
                while no manager exists.
              </p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => claim.mutate()} disabled={claim.isPending}>
                {claim.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Claim mess manager role
              </Button>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
