import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldPlus, UserCog } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/stat-card";
import { supabase } from "@/integrations/supabase/client";
import { grantAdminByEmail } from "@/lib/admin.functions";
import { useAuthUser } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin/access")({
  head: () => ({
    meta: [
      { title: "Access control — Smart Mess" },
      {
        name: "description",
        content: "Manage which accounts hold mess manager access for the hostel dining system.",
      },
      { property: "og:title", content: "Access control — Smart Mess" },
      { property: "og:description", content: "Grant or review mess manager access by email." },
    ],
  }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const grant = useServerFn(grantAdminByEmail);
  const [email, setEmail] = useState("");

  const { data: roles, isLoading } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, roll_number, room_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const promote = useMutation({
    mutationFn: async () => {
      const trimmed = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new Error("Enter a valid email address.");
      await grant({ data: { email: trimmed } });
    },
    onSuccess: () => {
      toast.success("Mess manager access granted.");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
    },
    onError: (error: Error) => toast.error(error.message || "Couldn't grant access."),
  });

  const admins = (roles ?? []).filter((r) => r.role === "admin");
  const students = (profiles ?? []).length;
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <AppShell title="Access control" description="Who can run the mess: managers and their accounts.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mess managers" value={admins.length} icon={ShieldCheck} />
        <StatCard label="Registered students" value={students} icon={UserCog} tone="accent" />
        <StatCard label="Total accounts" value={(roles ?? []).length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="glass h-fit rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">Add a mess manager</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The person must already have an account. Ask them to sign up first, then enter their email
            here.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Account email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@university.edu"
              />
            </div>
            <Button className="w-full" onClick={() => promote.mutate()} disabled={promote.isPending}>
              {promote.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldPlus className="mr-2 h-4 w-4" />
              )}
              Grant manager access
            </Button>
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">Current mess managers</h2>
          {isLoading ? (
            <div className="grid h-28 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No managers on record yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {admins.map((role) => {
                const profile = profileById.get(role.user_id);
                return (
                  <div
                    key={role.user_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{profile?.full_name || "Manager"}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email || role.user_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {role.user_id === user?.id ? <Badge variant="secondary">You</Badge> : null}
                      <Badge>
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Mess manager
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h3 className="mt-8 font-display text-sm font-semibold">Registered students</h3>
          <div className="mt-3 space-y-2">
            {(profiles ?? [])
              .filter((p) => !admins.some((a) => a.user_id === p.id))
              .slice(0, 50)
              .map((profile) => (
                <div
                  key={profile.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/60 px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{profile.full_name || "Student"}</span>
                  <span className="text-xs text-muted-foreground">
                    {profile.roll_number ? `${profile.roll_number} · ` : ""}
                    {profile.room_number ? `Room ${profile.room_number} · ` : ""}
                    {profile.email}
                  </span>
                </div>
              ))}
            {(profiles ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No student accounts yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
