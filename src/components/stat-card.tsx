import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "warning" | "destructive";
  delay?: number;
}

const TONES: Record<string, string> = {
  default: "text-primary",
  accent: "text-accent",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span className={cn("rounded-xl bg-secondary p-2.5", TONES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
