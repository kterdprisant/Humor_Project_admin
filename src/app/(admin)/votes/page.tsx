import Link from "next/link";
import { listVotes } from "@/lib/data/votes";
import { isUuid, pageParam, stringParam } from "@/lib/data/query";
import { PageHeader, tableCls } from "@/components/card";
import { Pagination } from "@/components/pagination";
import { Thumb } from "@/components/thumb";
import { VoteBadge } from "@/components/score";
import { UserChip } from "@/components/user-chip";
import { fmtDateTime } from "@/components/format";

const VALUES = [
  { key: undefined, label: "All" },
  { key: "up", label: "Upvotes" },
  { key: "down", label: "Downvotes" },
] as const;

export default async function VotesPage({ searchParams }: PageProps<"/votes">) {
  const sp = await searchParams;
  const rawValue = stringParam(sp.value);
  const valueKey = rawValue === "up" || rawValue === "down" ? rawValue : undefined;
  const user = stringParam(sp.user);
  const caption = stringParam(sp.caption);
  const userId = isUuid(user) ? user : undefined;
  const captionId = isUuid(caption) ? caption : undefined;

  // listVotes runs requireSuperadmin() before reading anything.
  const { rows, total, page } = await listVotes({
    value: valueKey === "up" ? 1 : valueKey === "down" ? -1 : undefined,
    userId,
    captionId,
    page: pageParam(sp.page),
  });

  const href = (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/votes?${s}` : "/votes";
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Votes">
        <span className="text-sm text-ink-muted">Read-only</span>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <nav className="flex gap-1">
          {VALUES.map((v) => (
            <Link
              key={v.label}
              href={href({ value: v.key, user: userId, caption: captionId })}
              className={`rounded-md px-2.5 py-1 ${v.key === valueKey ? "bg-foreground/10 font-medium" : "text-ink-secondary hover:text-foreground"}`}
            >
              {v.label}
            </Link>
          ))}
        </nav>
        {userId && (
          <span className="rounded-md bg-foreground/5 px-2.5 py-1">
            Voter filter{" "}
            <Link href={href({ value: valueKey, caption: captionId })} className="ml-1 text-ink-muted hover:text-foreground" aria-label="Clear voter filter">
              ×
            </Link>
          </span>
        )}
        {captionId && (
          <span className="rounded-md bg-foreground/5 px-2.5 py-1">
            Caption filter{" "}
            <Link href={href({ value: valueKey, user: userId })} className="ml-1 text-ink-muted hover:text-foreground" aria-label="Clear caption filter">
              ×
            </Link>
          </span>
        )}
      </div>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Voter</th>
              <th className={tableCls.th}>Vote</th>
              <th className={tableCls.th}>Caption</th>
              <th className={tableCls.th}>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={`${v.caption_id}:${v.user_id}`} className="hover:bg-foreground/[0.03]">
                <td className={tableCls.td}>
                  <span className="inline-flex items-center gap-2">
                    <UserChip user={v.voter} fallbackId={v.user_id} />
                    <Link href={href({ value: valueKey, user: v.user_id, caption: captionId })} className="text-xs text-ink-muted hover:text-foreground" title="Only this voter">
                      filter
                    </Link>
                  </span>
                </td>
                <td className={tableCls.td}>
                  <VoteBadge value={v.value} />
                </td>
                <td className={tableCls.td}>
                  {v.caption ? (
                    <Link href={`/captions/${v.caption_id}`} className="flex items-center gap-3 hover:underline">
                      <Thumb src={v.caption.image_url} />
                      <span className="line-clamp-1 max-w-sm">{v.caption.caption_text}</span>
                    </Link>
                  ) : (
                    <span className="text-ink-muted">Deleted caption</span>
                  )}
                </td>
                <td className={`${tableCls.td} whitespace-nowrap text-ink-secondary`}>{fmtDateTime(v.updated_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  No votes match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} basePath="/votes" params={{ value: valueKey, user: userId, caption: captionId }} />
    </div>
  );
}
