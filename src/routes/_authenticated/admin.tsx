import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuthUser, useRole } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuthUser();
  const { data: role, isLoading } = useRole(user?.id);

  if (loading || isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <AppShell title="Mess manager area" description="This section is limited to mess managers.">
        <div className="glass rounded-2xl p-10 text-center">
          <ShieldAlert className="mx-auto h-7 w-7 text-warning" />
          <p className="mt-3 text-sm text-muted-foreground">
            You don't have mess manager access. If you're setting this mess up, claim the manager role
            from your profile page.
          </p>
        </div>
      </AppShell>
    );
  }

  return <Outlet />;
}
