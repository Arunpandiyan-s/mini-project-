import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFeedbackSubmission } from "@/lib/api";

export function FeedbackCard() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (rating === 0) {
      toast.error("Please choose a rating first");
      return;
    }
    setSending(true);

    const res = await apiFeedbackSubmission({
      rating,
      comment: comment || undefined,
    });

    setSending(false);
    if (res.success) {
      setRating(0);
      setComment("");
    }
  };

  return (
    <section className="card-surface p-4" aria-labelledby="feedback-title">
      <h2 id="feedback-title" className="text-base font-semibold">
        How is your stay?
      </h2>
      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
            onClick={() => setRating(value)}
            className="p-1"
          >
            <Star
              className={`h-8 w-8 transition ${
                value <= rating ? "fill-gold text-gold" : "text-border"
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Tell us anything (optional)"
        className="mt-3 min-h-20 rounded-xl"
        aria-label="Feedback comment"
      />
      <Button variant="hero" size="xl" className="mt-3 w-full" onClick={submit} disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {sending ? "Sending…" : "Submit feedback"}
      </Button>
    </section>
  );
}