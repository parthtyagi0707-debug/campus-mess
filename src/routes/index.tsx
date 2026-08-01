import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  ChefHat,
  FileText,
  QrCode,
  Sparkles,
  Star,
  Vote,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Mess — Hostel Meal Booking, QR Check-in & AI Menus" },
      {
        name: "description",
        content:
          "A complete mess management system for university hostels: capacity-aware meal booking, QR check-ins, plate ratings, menu polls, AI meal plans and PDF reports.",
      },
      { property: "og:title", content: "Smart Mess — Hostel Dining, Solved" },
      {
        property: "og:description",
        content:
          "Book meals, scan QR tokens at the counter, rate every plate and plan menus with AI — one system for students and mess managers.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: CalendarCheck, title: "Capacity-aware booking", body: "Students reserve breakfast, lunch or dinner slots. Seats and cutoff times are enforced in the database, so a slot can never oversell." },
  { icon: QrCode, title: "QR check-in", body: "Every booking mints a signed QR token. The counter scans it once — duplicates and wrong-slot scans are rejected instantly." },
  { icon: Star, title: "Ratings & reviews", body: "Taste, quantity and hygiene scored per meal, with optional photos. Managers see exactly which dishes are failing." },
  { icon: Vote, title: "Menu voting", body: "Run polls on next week's menu. Live results, one vote per student, closed automatically at the deadline." },
  { icon: Sparkles, title: "AI meal plans", body: "Gemini drafts weekly menus from ratings, budget per plate and dietary constraints — saved and reusable." },
  { icon: FileText, title: "PDF reports", body: "Branded attendance, wastage and satisfaction reports with charts, ready to email to the warden." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] gradient-hero opacity-30" />
      <div className="relative mx-auto max-w-6xl px-5 py-8">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl gradient-lime text-sm font-bold text-primary-foreground">
              SM
            </span>
            <span className="font-display text-lg font-semibold">Smart Mess</span>
          </span>
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </header>

        <section className="py-20 text-center sm:py-28">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            <ChefHat className="h-3.5 w-3.5 text-accent" /> Built for university hostels
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl"
          >
            The hostel mess, finally
            <span className="text-accent"> running on data</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            Booking, QR check-ins, plate ratings, menu polls, AI meal planning and warden-ready PDF
            reports — for students and mess managers in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-9 flex flex-wrap justify-center gap-3"
          >
            <Button asChild size="lg">
              <Link to="/auth">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </motion.div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass rounded-2xl p-6"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-accent">
                <feature.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </motion.article>
          ))}
        </section>
      </div>
    </div>
  );
}
