import Link from "next/link";
import { PAGE_SIZE } from "@/lib/data/query";

/** Prev/next links that keep the current query params. */
export function Pagination({
  page,
  total,
  basePath,
  params,
}: {
  page: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const link = "rounded-md border border-hairline px-3 py-1.5 hover:bg-foreground/5";
  return (
    <div className="flex items-center justify-between text-sm text-ink-secondary">
      <span className="tabular-nums">
        {total === 0
          ? "No results"
          : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()}`}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className={link} href={href(page - 1)}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link className={link} href={href(page + 1)}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
