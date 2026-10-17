import Link from "next/link";
import { listCaptions, type CaptionFilter } from "@/lib/data/captions";
import { pageParam, stringParam } from "@/lib/data/query";
import { PageHeader, tableCls } from "@/components/card";
import { Pagination } from "@/components/pagination";
import { Thumb } from "@/components/thumb";
import { Score } from "@/components/score";
import { UserChip } from "@/components/user-chip";
import { fmtDate } from "@/components/format";

const FILTERS: { key: CaptionFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "regular", label: "Regular" },
  { key: "iotd", label: "Image of the Day" },
  { key: "encore", label: "Encores" },
];

export default async function CaptionsPage({ searchParams }: PageProps<"/captions">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const rawFilter = stringParam(sp.filter);
  const filter = FILTERS.some((f) => f.key === rawFilter) ? (rawFilter as CaptionFilter) : "all";
  const rawDay = stringParam(sp.day);
  const day = rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? rawDay : undefined;

  // listCaptions runs requireSuperadmin() before reading anything.
  const { rows, total, page } = await listCaptions({ q, filter, day, page: pageParam(sp.page) });

  const filterHref = (key: CaptionFilter) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (key !== "all") qs.set("filter", key);
    const s = qs.toString();
    return s ? `/captions?${s}` : "/captions";
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Captions">
        <Link href="/captions/new" className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background">
          New caption
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2" action="/captions">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search caption text…"
            className="w-64 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm"
          />
          <button className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-foreground/5">Search</button>
        </form>
        <nav className="flex gap-1 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={filterHref(f.key)}
              className={`rounded-md px-2.5 py-1 ${f.key === filter ? "bg-foreground/10 font-medium" : "text-ink-secondary hover:text-foreground"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        {day && (
          <span className="rounded-md bg-foreground/5 px-2.5 py-1 text-sm">
            Image of the Day {fmtDate(day)}{" "}
            <Link href={filterHref(filter)} className="ml-1 text-ink-muted hover:text-foreground" aria-label="Clear date">
              ×
            </Link>
          </span>
        )}
      </div>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Caption</th>
              <th className={tableCls.th}>Owner</th>
              <th className={tableCls.th}>Score</th>
              <th className={tableCls.th}>Type</th>
              <th className={tableCls.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-foreground/[0.03]">
                <td className={tableCls.td}>
                  <Link href={`/captions/${c.id}`} className="flex items-center gap-3 hover:underline">
                    <Thumb src={c.image_url} />
                    <span className="line-clamp-2 max-w-md">{c.caption_text}</span>
                  </Link>
                </td>
                <td className={tableCls.td}>
                  <UserChip user={c.author} fallbackId={c.user_id} />
                </td>
                <td className={tableCls.td}>
                  <Score tally={c.tally} />
                </td>
                <td className={`${tableCls.td} whitespace-nowrap text-ink-secondary`}>
                  {c.iotd_date ? `IOTD ${fmtDate(c.iotd_date)}` : c.regenerated_from_id ? "Encore" : "Regular"}
                </td>
                <td className={`${tableCls.td} whitespace-nowrap text-ink-secondary`}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No captions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        total={total}
        basePath="/captions"
        params={{ q, filter: filter === "all" ? undefined : filter, day }}
      />
    </div>
  );
}
