import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquareHeart, Upload } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { StarRating } from "@/components/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchAvailability, fetchMyBookings, fetchRatingStats, fetchReviews } from "@/lib/api";
import { useAuthUser } from "@/lib/session";
import { MEAL_LABEL, formatDate, todayISO } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/reviews")({
  head: () => ({
    meta: [
      { title: "Rate & review meals — Smart Mess" },
      { name: "description", content: "Score taste, hygiene, quantity and temperature for every meal you attended." },
      { property: "og:title", content: "Rate & review meals — Smart Mess" },
      { property: "og:description", content: "Your feedback drives next week's hostel mess menu." },
    ],
  }),
  component: ReviewsPage,
});

const EMOJIS = ["🤤", "😋", "🙂", "😕", "🤢"];

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const commentSchema = z.string().trim().max(1000, "Keep your comment under 1000 characters");

function ReviewsPage() {
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const today = todayISO();

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [scores, setScores] = useState({ taste: 4, hygiene: 4, quantity: 4, temperature: 4 });
  const [comment, setComment] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchMyBookings(user!.id),
  });
  const { data: slots } = useQuery({
    queryKey: ["availability", addDays(today, -30), addDays(today, 7)],
    queryFn: () => fetchAvailability(addDays(today, -30), addDays(today, 7)),
  });
  const { data: reviews } = useQuery({ queryKey: ["reviews"], queryFn: fetchReviews });
  const { data: stats } = useQuery({ queryKey: ["rating-stats"], queryFn: fetchRatingStats });

  const slotById = new Map((slots ?? []).map((s) => [s.slot_id, s]));
  const myReviewedBookings = new Set(
    (reviews ?? []).filter((r) => r.student_id === user?.id).map((r) => r.booking_id),
  );
  const reviewable = (bookings ?? []).filter(
    (b) => b.status === "attended" && !myReviewedBookings.has(b.id),
  );
  const selected = reviewable.find((b) => b.id === bookingId) ?? reviewable[0];
  const overall =
    (scores.taste + scores.hygiene + scores.quantity + scores.temperature) / 4;

  const submit = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Nothing to review yet.");
      const parsed = commentSchema.safeParse(comment);
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);

      let imagePath: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user!.id}/${selected.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("review-images")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const { error } = await supabase.from("reviews").insert({
        booking_id: selected.id,
        slot_id: selected.slot_id,
        student_id: user!.id,
        overall: Math.round(overall),
        taste: scores.taste,
        hygiene: scores.hygiene,
        quantity: scores.quantity,
        temperature: scores.temperature,
        comment: parsed.data,
        emoji,
        image_url: imagePath,
        is_anonymous: anonymous,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks! Your review is in.");
      setComment("");
      setEmoji(null);
      setFile(null);
      setBookingId(null);
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["rating-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const myReviews = (reviews ?? []).filter((r) => r.student_id === user?.id);

  return (
    <AppShell
      title="Rate & review"
      description="You can review a meal once you've checked in at the counter for it."
    >
      <div className="grid gap-5 lg:grid-cols-5">
        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold">Leave a review</h2>
          {!selected ? (
            <p className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nothing to review right now. Attend a booked meal and your review form appears here.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {reviewable.length > 1 ? (
                <div className="space-y-2">
                  <Label>Which meal?</Label>
                  <div className="flex flex-wrap gap-2">
                    {reviewable.map((b) => {
                      const slot = slotById.get(b.slot_id);
                      const active = b.id === selected.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setBookingId(b.id)}
                          className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                            active
                              ? "border-transparent bg-primary text-primary-foreground"
                              : "border-border bg-card/60 hover:bg-secondary"
                          }`}
                        >
                          {slot ? `${MEAL_LABEL[slot.meal]} · ${formatDate(slot.slot_date)}` : "Meal"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-border bg-card/60 p-4">
                <p className="text-sm font-medium">
                  {slotById.get(selected.slot_id)
                    ? `${MEAL_LABEL[slotById.get(selected.slot_id)!.meal]} · ${formatDate(slotById.get(selected.slot_id)!.slot_date)}`
                    : "Selected meal"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {slotById.get(selected.slot_id)?.menu}
                </p>
              </div>

              <div className="space-y-3">
                <StarRating label="Taste" value={scores.taste} onChange={(v) => setScores({ ...scores, taste: v })} />
                <StarRating label="Hygiene" value={scores.hygiene} onChange={(v) => setScores({ ...scores, hygiene: v })} />
                <StarRating label="Quantity" value={scores.quantity} onChange={(v) => setScores({ ...scores, quantity: v })} />
                <StarRating label="Temperature" value={scores.temperature} onChange={(v) => setScores({ ...scores, temperature: v })} />
                <p className="text-sm text-muted-foreground">
                  Overall score: <span className="font-semibold text-foreground">{overall.toFixed(1)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>How did it feel?</Label>
                <div className="flex gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(emoji === e ? null : e)}
                      className={`grid h-11 w-11 place-items-center rounded-xl border text-xl transition-transform hover:scale-110 ${
                        emoji === e ? "border-accent bg-secondary" : "border-border"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Dal was thin today, but the rotis were fresh and hot."
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" />
                  {file ? file.name.slice(0, 22) : "Add photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
                  Post anonymously
                </label>
              </div>

              <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit review
              </Button>
            </div>
          )}
        </section>

        <aside className="space-y-5 lg:col-span-2">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold">Best rated meals</h2>
            <div className="mt-4 space-y-3">
              {(stats ?? [])
                .slice()
                .sort((a, b) => b.avg_overall - a.avg_overall)
                .slice(0, 5)
                .map((stat) => (
                  <div key={stat.slot_id} className="rounded-xl border border-border bg-card/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {MEAL_LABEL[stat.meal]} · {formatDate(stat.slot_date)}
                      </p>
                      <Badge variant="secondary">{Number(stat.avg_overall).toFixed(1)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{stat.menu}</p>
                  </div>
                ))}
              {(stats ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              ) : null}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold">Your reviews</h2>
            <div className="mt-4 space-y-3">
              {myReviews.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquareHeart className="h-4 w-4" /> Nothing yet.
                </p>
              ) : (
                myReviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="rounded-xl border border-border bg-card/60 p-3">
                    <div className="flex items-center justify-between">
                      <StarRating value={review.overall} size="sm" readOnly />
                      <span className="text-lg">{review.emoji}</span>
                    </div>
                    {review.comment ? (
                      <p className="mt-1.5 text-xs text-muted-foreground">{review.comment}</p>
                    ) : null}
                    {review.admin_reply ? (
                      <p className="mt-2 rounded-lg bg-secondary p-2 text-xs">
                        <span className="font-semibold">Mess manager: </span>
                        {review.admin_reply}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
