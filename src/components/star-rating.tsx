import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
  readOnly?: boolean;
}

const SIZES = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" };

export function StarRating({ value, onChange, size = "md", label, readOnly }: StarRatingProps) {
  return (
    <div className="flex items-center gap-3">
      {label ? <span className="w-28 text-sm text-muted-foreground">{label}</span> : null}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly || !onChange}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            className={cn(
              "transition-transform",
              !readOnly && onChange ? "hover:scale-115 cursor-pointer" : "cursor-default",
            )}
          >
            <Star
              className={cn(
                SIZES[size],
                star <= Math.round(value)
                  ? "fill-accent text-accent"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      {readOnly ? <span className="text-sm font-medium">{value ? value.toFixed(1) : "—"}</span> : null}
    </div>
  );
}
