import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Vote as VoteIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyVotes, fetchPollOptions, fetchPollResults, fetchPolls } from "@/lib/api";
import { useAuthUser } from "@/lib/session";
import { MEAL_LABEL, formatDate } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/vote")({
  head: () => ({
    meta: [
      { title: "Menu voting — Smart Mess" },
      { name: "description", content: "Vote on next week's hostel mess menu and see live results." },
      { property: "og:title", content: "Menu voting — Smart Mess" },
      { property: "og:description", content: "One vote per student, live results, closes automatically." },
    ],
  }),
  component: VotePage,
});

function VotePage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();

  const { data: polls } = useQuery({ queryKey: ["polls"], queryFn: fetchPolls });
  const { data: options } = useQuery({ queryKey: ["poll-options"], queryFn: fetchPollOptions });
  const { data: results } = useQuery({ queryKey: ["poll-results"], queryFn: fetchPollResults });
  const { data: myVotes } = useQuery({
    queryKey: ["my-votes", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyVotes(user!.id),
  });

  const voteFor = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      const { error } = await supabase
        .from("votes")
        .upsert(
          { poll_id: pollId, option_id: optionId, student_id: user!.id },
          { onConflict: "poll_id,student_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vote recorded.");
      queryClient.invalidateQueries({ queryKey: ["poll-results"] });
      queryClient.invalidateQueries({ queryKey: ["my-votes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const votedOptionByPoll = new Map((myVotes ?? []).map((v) => [v.poll_id, v.option_id]));
  const activePolls = (polls ?? []).filter((p) => p.is_active);

  return (
    <AppShell
      title="Menu voting"
      description="Pick what you want on the plate. One vote per poll — you can change it until the poll closes."
    >
      {activePolls.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <VoteIcon className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No polls are open right now.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {activePolls.map((poll) => {
            const pollOptions = (options ?? []).filter((o) => o.poll_id === poll.id);
            const pollResults = (results ?? []).filter((r) => r.poll_id === poll.id);
            const total = pollResults.reduce((sum, r) => sum + Number(r.votes), 0);
            const closed = new Date(poll.closes_at).getTime() <= Date.now();
            const myOption = votedOptionByPoll.get(poll.id);

            return (
              <section key={poll.id} className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{poll.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {poll.meal ? `${MEAL_LABEL[poll.meal]} · ` : ""}
                      {poll.target_day ? `${formatDate(poll.target_day)} · ` : ""}
                      {total} vote{total === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={closed ? "outline" : "secondary"}>{closed ? "Closed" : "Open"}</Badge>
                </div>
                {poll.description ? (
                  <p className="mt-3 text-sm text-muted-foreground">{poll.description}</p>
                ) : null}

                <div className="mt-5 space-y-3">
                  {pollOptions.map((option) => {
                    const votes = Number(
                      pollResults.find((r) => r.option_id === option.id)?.votes ?? 0,
                    );
                    const percent = total === 0 ? 0 : (votes / total) * 100;
                    const mine = myOption === option.id;
                    return (
                      <button
                        key={option.id}
                        disabled={closed || voteFor.isPending}
                        onClick={() => voteFor.mutate({ pollId: poll.id, optionId: option.id })}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          mine ? "border-accent bg-secondary" : "border-border hover:bg-secondary/60"
                        } ${closed ? "cursor-default opacity-80" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {mine ? <CheckCircle2 className="h-4 w-4 text-accent" /> : null}
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {votes} · {percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full gradient-lime" style={{ width: `${percent}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-[11px] text-muted-foreground">
                  Closes {new Date(poll.closes_at).toLocaleString()}
                </p>
              </section>
            );
          })}
        </div>
      )}

      {(polls ?? []).some((p) => !p.is_active) ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">Past polls</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(polls ?? [])
              .filter((p) => !p.is_active)
              .map((poll) => {
                const pollResults = (results ?? []).filter((r) => r.poll_id === poll.id);
                const winner = pollResults.slice().sort((a, b) => Number(b.votes) - Number(a.votes))[0];
                return (
                  <div key={poll.id} className="glass rounded-2xl p-4">
                    <p className="text-sm font-medium">{poll.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Winner: {winner ? `${winner.label} (${winner.votes})` : "No votes"}
                    </p>
                  </div>
                );
              })}
          </div>
        </section>
      ) : null}

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["poll-results"] })}>
          Refresh results
        </Button>
      </div>
    </AppShell>
  );
}
