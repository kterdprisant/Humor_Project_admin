import type { Tally } from "@/lib/types";

/** Net score with up/down breakdown. Color marks sit beside neutral text. */
export function Score({ tally }: { tally: Tally }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm tabular-nums">
      <span className="font-semibold">{tally.score > 0 ? `+${tally.score}` : tally.score}</span>
      <span className="inline-flex items-center gap-1 text-ink-muted">
        <span aria-hidden className="h-2 w-2 rounded-full bg-up" />
        {tally.upvotes}
        <span aria-hidden className="ml-1 h-2 w-2 rounded-full bg-down" />
        {tally.downvotes}
        <span className="sr-only">
          {tally.upvotes} upvotes, {tally.downvotes} downvotes
        </span>
      </span>
    </span>
  );
}

export function VoteBadge({ value }: { value: 1 | -1 }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={`h-2 w-2 rounded-full ${value === 1 ? "bg-up" : "bg-down"}`} />
      {value === 1 ? "Upvote" : "Downvote"}
    </span>
  );
}
