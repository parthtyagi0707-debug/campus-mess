import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { askGemini } from "@/lib/ai.functions";
import { fetchAiPlans, fetchRatingStats } from "@/lib/api";
import { useAuthUser } from "@/lib/session";
import { MEAL_LABEL, formatDate } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  head: () => ({
    meta: [
      { title: "AI meal planner — Smart Mess" },
      {
        name: "description",
        content: "Generate balanced weekly hostel menus and cost estimates with the AI mess assistant.",
      },
      { property: "og:title", content: "AI meal planner — Smart Mess" },
      {
        property: "og:description",
        content: "AI-generated weekly menus, wastage advice and budget estimates for your mess.",
      },
    ],
  }),
  component: AdminAiPage,
});

const PRESETS = [
  {
    label: "Weekly veg menu",
    prompt:
      "Plan a balanced 7-day vegetarian menu for a university hostel mess with breakfast, lunch and dinner. Keep it high-protein, rotate cuisines, and give an approximate per-plate cost in INR for each day.",
  },
  {
    label: "Cut food wastage",
    prompt:
      "Give me a practical action plan to reduce food wastage in a hostel mess that serves about 150 students per meal. Focus on portioning, booking data, and prep scheduling.",
  },
  {
    label: "Festival special",
    prompt:
      "Suggest three festival special dinner menus for an Indian university hostel mess, each within a 90 INR per-plate budget, with a short shopping list.",
  },
];

function AdminAiPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const ask = useServerFn(askGemini);

  const [prompt, setPrompt] = useState(PRESETS[0]!.prompt);
  const [title, setTitle] = useState("Weekly veg menu");
  const [answer, setAnswer] = useState("");

  const { data: stats } = useQuery({ queryKey: ["rating-stats"], queryFn: fetchRatingStats });
  const { data: plans } = useQuery({ queryKey: ["ai-plans"], queryFn: fetchAiPlans });

  const worst = (stats ?? [])
    .slice()
    .sort((a, b) => Number(a.avg_overall) - Number(b.avg_overall))
    .slice(0, 5);

  const generate = useMutation({
    mutationFn: async (input: string) => {
      if (input.trim().length < 8) throw new Error("Describe what you want the AI to plan.");
      const context = worst.length
        ? `\n\nRecent low-rated meals in this mess (use these to improve the plan):\n${worst
            .map(
              (s) =>
                `- ${formatDate(s.slot_date)} ${MEAL_LABEL[s.meal]}: "${s.menu}" rated ${Number(
                  s.avg_overall,
                ).toFixed(1)}/5 across ${s.review_count} reviews`,
            )
            .join("\n")}`
        : "";
      const result = await ask({ data: { prompt: `${input.trim()}${context}` } });
      return result.content;
    },
    onSuccess: (content) => setAnswer(content),
    onError: (error: Error) => toast.error(error.message),
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      if (!answer.trim()) throw new Error("Generate a plan first.");
      const { error } = await supabase.from("ai_plans").insert({
        kind: "menu",
        title: title.trim().slice(0, 160) || "AI plan",
        prompt: prompt.trim().slice(0, 4000),
        content: answer,
        ...(user?.id ? { created_by: user.id } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan saved.");
      queryClient.invalidateQueries({ queryKey: ["ai-plans"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-plans"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="AI meal planner"
      description="Ask for menus, budgets or wastage advice — grounded in your own rating data."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setTitle(preset.label);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="prompt">Your request</Label>
              <Textarea
                id="prompt"
                rows={5}
                maxLength={4000}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => generate.mutate(prompt)}
              disabled={generate.isPending}
            >
              {generate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate with AI
            </Button>
            {worst.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Your {worst.length} lowest-rated recent meals are automatically attached as context.
              </p>
            ) : null}
          </div>

          {answer ? (
            <div className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1 space-y-2">
                  <Label htmlFor="ptitle">Save as</Label>
                  <Input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
                  {savePlan.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save plan
                </Button>
              </div>
              <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                {answer}
              </pre>
            </div>
          ) : null}
        </section>

        <aside className="glass h-fit rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">Saved plans</h2>
          {(plans ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing saved yet. Generate a plan and hit save to keep it here.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {(plans ?? []).map((plan) => (
                <div key={plan.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{plan.title}</p>
                      <Badge variant="secondary" className="mt-1">
                        {new Date(plan.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete plan"
                      onClick={() => deletePlan.mutate(plan.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => {
                      setAnswer(plan.content);
                      setTitle(plan.title);
                      setPrompt(plan.prompt);
                    }}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
