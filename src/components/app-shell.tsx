import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  ChefHat,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Moon,
  QrCode,
  ScanLine,
  Sparkles,
  Star,
  Sun,
  User,
  Vote,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchNotifications } from "@/lib/api";
import { useAuthUser, useProfile, useRole } from "@/lib/session";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STUDENT_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/book", label: "Book a meal", icon: CalendarCheck },
  { to: "/my-tokens", label: "My tokens", icon: QrCode },
  { to: "/reviews", label: "Rate & review", icon: MessageSquareHeart },
  { to: "/vote", label: "Menu voting", icon: Vote },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Admin overview", icon: BarChart3 },
  { to: "/admin/scan", label: "QR check-in", icon: ScanLine },
  { to: "/admin/menu", label: "Slots & menu", icon: ChefHat },
  { to: "/admin/polls", label: "Menu polls", icon: Vote },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/ai", label: "AI assistant", icon: Sparkles },
  { to: "/admin/reports", label: "PDF reports", icon: FileText },
  { to: "/admin/access", label: "Access", icon: ShieldCheck },
] as const;

function NavList({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const section = (title: string, items: readonly { to: string; label: string; icon: typeof Bell }[]) => (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-foreground/80 hover:bg-secondary",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <nav className="space-y-6">
      {section("Student", STUDENT_NAV)}
      {isAdmin ? section("Mess manager", ADMIN_NAV) : null}
    </nav>
  );
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { user } = useAuthUser();
  const { data: profile } = useProfile(user?.id);
  const { data: role } = useRole(user?.id);
  const isAdmin = role === "admin";
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchNotifications(user!.id),
  });
  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 gradient-hero opacity-25" />
      <div className="relative mx-auto flex max-w-[1500px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-6 border-r border-border bg-sidebar/70 p-5 backdrop-blur-xl lg:flex">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl gradient-lime text-sm font-bold text-primary-foreground">
              SM
            </span>
            <span>
              <span className="block font-display text-base font-semibold leading-tight">Smart Mess</span>
              <span className="block text-xs text-muted-foreground">Hostel dining OS</span>
            </span>
          </Link>
          <div className="flex-1 overflow-y-auto pr-1">
            <NavList isAdmin={isAdmin} />
          </div>
          <div className="glass rounded-2xl p-3">
            <p className="truncate text-sm font-medium">{profile?.full_name || "Student"}</p>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            <Badge variant="secondary" className="mt-2 capitalize">
              {role ?? "student"}
            </Badge>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <header className="mb-7 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto p-5">
                  <SheetTitle className="mb-5 font-display">Smart Mess</SheetTitle>
                  <NavList isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
                  <Button variant="ghost" size="sm" className="mt-6 w-full justify-start" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </Button>
                </SheetContent>
              </Sheet>
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
                {description ? (
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
                ) : null}
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link to="/notifications" aria-label="Notifications">
                  <span className="relative">
                    <Bell className="h-4 w-4" />
                    {unread > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
