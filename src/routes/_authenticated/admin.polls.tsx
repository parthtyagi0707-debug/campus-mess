import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Vote as VoteIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchPollOptions, fetchPollResults, fetchPolls } from "@/lib/api";
import { MEALS, MEAL_LABEL } from "@/lib/types";
import type { MealType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/polls")({
  head: () => ({
    meta: [
      { title: "Menu polls — Smart Mess" },
      {
        name: "description",
        content: "Create menu polls, add dish options and watch student votes come in live.",
      },
      { property: "og:title", content: "Menu polls — Smart Mess" },
      { property: "og:description", content: "Let students vote on next week's hostel mess menu." },
    ],
  }),
  component: AdminPollsPage,
});

function AdminPollsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meal, setMeal] = useState<MealType | "none">("none");
  const [targetDay, setTargetDay] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [newOption, setNewOption] = useState<Record<string, string>>({});

  const { data: polls, isLoading } = useQuery({ queryKey: ["polls"], queryFn: fetchPolls });
  const { data: options } = useQuery({ queryKey: ["poll-options"], queryFn: fetchPollOptions });
  const { data: results } = useQuery({ queryKey: ["poll-results"], queryFn: fetchPollResults });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["polls"] });
    queryClient.invalidateQueries({ queryKey: ["poll-options"] });
    queryClient.invalidateQueries({ queryKey: ["poll-results"] });
  }

  const createPoll = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 4) throw new Error("Give the poll a clear title.");
      const labels = optionsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 12);
      if (labels.length < 2) throw new Error("Add at least two options, one per line.");

      const { data: poll, error } = await supabase
        .from("polls")
        .insert({
          title: title.trim().slice(0, 160),
          description: description.trim().slice(0, 600),
          ...(meal !== "none" ? { meal } : {}),
          ...(targetDay.trim() ? { target_day: targetDay.trim().slice(0, 40) } : {}),
          ...(closesAt ? { closes_at: new Date(closesAt).toISOString() } : {}),
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: optionError } = await supabase
        .from("poll_options")
        .insert(labels.map((label) => ({ poll_id: poll.id, label: label.slice(0, 120) })));
      if (optionError) throw optionError;
    },
    onSuccess: () => {
      toast.success("Poll is live for students.");
      setTitle("");
      setDescription("");
      setOptionsText("");
      setTargetDay("");
      setClosesAt("");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("polls")
        .update({ is_active: input.isActive })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  const addOption = useMutation({
    mutationFn: async (input: { pollId: string; label: string }) => {
      if (input.label.trim().length < 2) throw new Error("Enter an option name.");
      const { error } = await supabase
        .from("poll_options")
        .insert({ poll_id: input.pollId, label: input.label.trim().slice(0, 120) });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      setNewOption((prev) => ({ ...prev, [variables.pollId]: "" }));
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePoll = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("poll_options").delete().eq("poll_id", id);
      const { error } = await supabase.from("polls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Poll deleted.");
      refresh();
    },
    onError: () => toast.error("Polls that already have votes can't be deleted — close them instead."),
  });

  return (
    <AppShell title="Menu polls" description="Ask the hostel what they want on the plate next week.">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="glass h-fit rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">New poll</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday dinner special"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Winner gets cooked this Sunday."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Meal</Label>
                <Select value={meal} onValueChange={(value) => setMeal(value as MealType | "none")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any meal</SelectItem>
                    {MEALS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MEAL_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="day">Target day</Label>
                <Input
                  id="day"
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value)}
                  placeholder="Sunday"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="closes">Closes at</Label>
              <Input
                id="closes"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opts">Options (one per line)</Label>
              <Textarea
                id="opts"
                rows={5}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"Chole bhature\nPav bhaji\nHyderabadi biryani"}
              />
            </div>
            <Button className="w-full" onClick={() => createPoll.mutate()} disabled={createPoll.isPending}>
              {createPoll.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <VoteIcon className="mr-2 h-4 w-4" />
              )}
              Launch poll
            </Button>
          </div>
        </section>

        <section className="space-y-5">
          {isLoading ? (
            <div className="glass grid h-40 place-items-center rounded-2xl">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (polls ?? []).length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              No polls yet. Create one on the left and students will see it instantly.
            </div>
          ) : (
            (polls ?? []).map((poll) => {
              const pollOptions = (options ?? []).filter((o) => o.poll_id === poll.id);
              const pollResults = (results ?? []).filter((r) => r.poll_id === poll.id);
              const total = pollResults.reduce((sum, r) => sum + Number(r.votes), 0);
              const closed = new Date(poll.closes_at).getTime() < Date.now();
              return (
                <div key={poll.id} className="glass rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold">{poll.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {poll.meal ? <Badge variant="secondary">{MEAL_LABEL[poll.meal]}</Badge> : null}
                        {poll.target_day ? <Badge variant="secondary">{poll.target_day}</Badge> : null}
                        <Badge variant={poll.is_active && !closed ? "default" : "outline"}>
                          {closed ? "Closed" : poll.is_active ? "Live" : "Paused"}
                        </Badge>
                        <span className="text-muted-foreground">{total} votes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive.mutate({ id: poll.id, isActive: !poll.is_active })}
                      >
                        {poll.is_active ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete poll"
                        onClick={() => deletePoll.mutate(poll.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {pollOptions.map((option) => {
                      const votes = Number(
                        pollResults.find((r) => r.option_id === option.id)?.votes ?? 0,
                      );
                      const pct = total ? (votes / total) * 100 : 0;
                      return (
                        <div key={option.id}>
                          <div className="flex items-center justify-between text-sm">
                            <span>{option.label}</span>
                            <span className="text-muted-foreground">
                              {votes} · {Math.round(pct)}%
                            </span>
                          </div>
                          <Progress value={pct} className="mt-1.5 h-2" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      value={newOption[poll.id] ?? ""}
                      onChange={(e) => setNewOption((prev) => ({ ...prev, [poll.id]: e.target.value }))}
                      placeholder="Add another option"
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        addOption.mutate({ pollId: poll.id, label: newOption[poll.id] ?? "" })
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
