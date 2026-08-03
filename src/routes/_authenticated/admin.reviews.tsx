import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, MessageSquareHeart, Reply } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StarRating } from "@/components/star-rating";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fetchReviews, fetchSlots, notify, signedImageUrl } from "@/lib/api";
import { MEAL_LABEL, formatDate, todayISO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Student feedback — Smart Mess" },
      {
        name: "description",
        content: "Read every plate rating, open the photo evidence and reply to student feedback.",
      },
      { property: "og:title", content: "Student feedback — Smart Mess" },
      { property: "og:description", content: "Respond to hostel mess reviews and close the loop." },
    ],
  }),
  component: AdminReviewsPage,
});

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const today = todayISO();
  const [filter, setFilter] = useState<"all" | "unanswered" | "low">("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<string | null>(null);

  const { data: reviews, isLoading } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });
  const { data: slots } = useQuery({
    queryKey: ["slots", addDays(today, -60), addDays(today, 14)],
    queryFn: () => fetchSlots(addDays(today, -60), addDays(today, 14)),
  });
  const { data: profiles } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, room_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const slotById = useMemo(
    () => new Map((slots ?? []).map((s) => [s.id, s])),
    [slots],
  );
  const profileById = useMemo(
    () => new Map((profiles ?? []).map((p) => [p.id, p])),
    [profiles],
  );

  const all = reviews ?? [];
  const avg = all.length ? all.reduce((sum, r) => sum + r.overall, 0) / all.length : 0;
  const unanswered = all.filter((r) => !r.admin_reply).length;
  const low = all.filter((r) => r.overall <= 2).length;

  const visible = all.filter((review) => {
    if (filter === "unanswered") return !review.admin_reply;
    if (filter === "low") return review.overall <= 2;
    return true;
  });

  const reply = useMutation({
    mutationFn: async (input: { id: string; studentId: string; text: string }) => {
      if (input.text.trim().length < 3) throw new Error("Write a reply before sending.");
      const { error } = await supabase
        .from("reviews")
        .update({ admin_reply: input.text.trim().slice(0, 1000), replied_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
      await notify(
        input.studentId,
        "The mess manager replied",
        input.text.trim().slice(0, 300),
      );
    },
    onSuccess: (_data, variables) => {
      toast.success("Reply sent to the student.");
      setDrafts((prev) => ({ ...prev, [variables.id]: "" }));
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function openPhoto(path: string) {
    const url = await signedImageUrl(path);
    if (!url) {
      toast.error("Couldn't open that photo.");
      return;
    }
    setPhoto(url);
  }

  return (
    <AppShell title="Student feedback" description="Every plate rating, with the option to reply.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Average rating" value={avg ? avg.toFixed(2) : "—"} icon={MessageSquareHeart} />
        <StatCard label="Awaiting reply" value={unanswered} icon={Reply} tone="warning" />
        <StatCard label="Low ratings (≤2)" value={low} tone="destructive" />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mt-6">
        <TabsList>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="unanswered">Unanswered ({unanswered})</TabsTrigger>
          <TabsTrigger value="low">Low rated ({low})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="glass grid h-40 place-items-center rounded-2xl">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </div>
        ) : (
          visible.map((review) => {
            const slot = slotById.get(review.slot_id);
            const profile = review.is_anonymous ? null : profileById.get(review.student_id);
            return (
              <div key={review.id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {review.is_anonymous
                          ? "Anonymous student"
                          : (profile?.full_name || "Student")}
                      </span>
                      {profile?.room_number ? (
                        <Badge variant="secondary">Room {profile.room_number}</Badge>
                      ) : null}
                      {slot ? (
                        <Badge variant="outline">
                          {MEAL_LABEL[slot.meal]} · {formatDate(slot.slot_date)}
                        </Badge>
                      ) : null}
                      {review.emoji ? <span className="text-lg">{review.emoji}</span> : null}
                    </div>
                    {slot ? <p className="mt-1 text-xs text-muted-foreground">{slot.menu}</p> : null}
                  </div>
                  <StarRating value={review.overall} readOnly size="sm" />
                </div>

                <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-4">
                  <span>Taste {review.taste}/5</span>
                  <span>Hygiene {review.hygiene}/5</span>
                  <span>Quantity {review.quantity}/5</span>
                  <span>Temperature {review.temperature}/5</span>
                </div>

                {review.comment ? <p className="mt-3 text-sm">{review.comment}</p> : null}

                {review.image_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => openPhoto(review.image_url!)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    View photo
                  </Button>
                ) : null}

                {review.admin_reply ? (
                  <div className="mt-4 rounded-xl border border-border bg-secondary p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Your reply
                    </p>
                    <p className="mt-1">{review.admin_reply}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <Textarea
                      rows={2}
                      value={drafts[review.id] ?? ""}
                      maxLength={1000}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="Thanks for flagging this — we've changed the oil supplier from Monday."
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        reply.mutate({
                          id: review.id,
                          studentId: review.student_id,
                          text: drafts[review.id] ?? "",
                        })
                      }
                      disabled={reply.isPending}
                    >
                      {reply.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Reply className="mr-2 h-4 w-4" />
                      )}
                      Send reply
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {photo ? (
        <button
          type="button"
          aria-label="Close photo"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6"
          onClick={() => setPhoto(null)}
        >
          <img src={photo} alt="Student meal photo" className="max-h-[80vh] rounded-2xl" />
        </button>
      ) : null}
    </AppShell>
  );
}
