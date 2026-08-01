import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchNotifications } from "@/lib/api";
import { useAuthUser } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Smart Mess" },
      { name: "description", content: "Booking confirmations, menu changes and mess announcements." },
      { property: "og:title", content: "Notifications — Smart Mess" },
      { property: "og:description", content: "Stay on top of mess announcements and booking updates." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchNotifications(user!.id),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = notifications ?? [];

  return (
    <AppShell title="Notifications" description="Everything the mess has sent you.">
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nothing here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`glass rounded-2xl p-5 ${item.is_read ? "opacity-70" : "border-l-4 border-l-accent"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
