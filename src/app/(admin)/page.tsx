import Link from "next/link";
import { getDashboardStats, RANGES, type RangeKey, type RankedCaption } from "@/lib/data/stats";
import { Card, StatTile } from "@/components/card";
import { VoteTrendChart } from "@/components/vote-trend-chart";
import { Thumb } from "@/components/thumb";
import { Score } from "@/components/score";
import { UserChip } from "@/components/user-chip";
import { fmtCount, fmtDate } from "@/components/format";

const RANGE_LABELS: Record<RangeKey, string> = { "30": "30 days", "90": "90 days", all: "All time" };

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { range: raw } = await searchParams;
  const range: RangeKey = typeof raw === "string" && raw in RANGES ? (raw as RangeKey) : "30";
  // getDashboardStats runs requireSuperadmin() before reading anything.
  const s = await getDashboardStats(range);

  const rangeVotes = s.inRange.up + s.inRange.down;
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">What the crowd at Open Mic AI has been up to.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Captions" value={fmtCount(s.totals.captions)} note={`${fmtCount(s.totals.encores)} Encores`} />
        <StatTile label="Users" value={fmtCount(s.totals.users)} />
        <StatTile label="Votes" value={fmtCount(s.totals.votes)} />
        <StatTile label="Crowd approval" value={pct(s.totals.approval)} note="share of all votes that are upvotes" />
      </div>

      <Card
        title="Applause vs. boos"
        subtitle={
          rangeVotes
            ? `${fmtCount(rangeVotes)} votes · ${pct(s.inRange.up / rangeVotes)} upvotes${
                s.busiest ? ` · busiest night ${fmtDate(s.busiest.day)} (${s.busiest.up + s.busiest.down})` : ""
              }`
            : "No votes in this range"
        }
        action={
          <nav className="flex shrink-0 gap-1 rounded-lg border border-hairline p-0.5 text-sm">
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <Link
                key={k}
                href={k === "30" ? "/" : `/?range=${k}`}
                aria-current={k === range ? "true" : undefined}
                className={`rounded-md px-2.5 py-1 ${k === range ? "bg-foreground/10 font-medium" : "text-ink-secondary hover:text-foreground"}`}
              >
                {RANGE_LABELS[k]}
              </Link>
            ))}
          </nav>
        }
      >
        <VoteTrendChart data={s.trend} />
        <p className="mt-2 text-xs text-ink-muted">
          Days are by each vote&apos;s last update (UTC), so a changed vote counts on the day it was changed.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Leaderboard title="Hall of fame" subtitle="Highest net score" items={s.fame} empty="No votes yet." />
        <Leaderboard title="Hall of shame" subtitle="Lowest net score" items={s.shame} empty="Nobody's been booed. Yet." />
        <Leaderboard
          title="Most divisive"
          subtitle="Lots of votes, split down the middle"
          items={s.divisive}
          empty="No caption has both fans and haters yet."
        />
      </div>

      <Card title="Image of the Day history" subtitle={`${s.totals.iotdDays} days with submissions · most recent 14`}>
        {s.iotd.length === 0 ? (
          <p className="text-sm text-ink-muted">No Image of the Day submissions yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {s.iotd.map((d) => (
              <li key={d.day} className="flex flex-col gap-2">
                <Link href={`/captions?filter=iotd&day=${d.day}`} className="group">
                  <Thumb src={d.imageUrl} alt={d.imageDescription ?? ""} size="xl" />
                  <div className="mt-2 text-sm font-medium group-hover:underline">{fmtDate(d.day)}</div>
                </Link>
                <div className="text-xs text-ink-muted tabular-nums">
                  {d.submissions} {d.submissions === 1 ? "caption" : "captions"} · {d.votes} votes
                </div>
                {d.winner ? (
                  <div className="text-sm">
                    <span className="text-ink-muted">🏆 </span>
                    <Link href={`/captions/${d.winner.id}`} className="hover:underline">
                      &ldquo;{d.winner.caption_text}&rdquo;
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                      <UserChip user={d.winner.author} />
                      <Score tally={d.winner.tally} />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-ink-muted">No votes cast</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Leaderboard({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle: string;
  items: RankedCaption[];
  empty: string;
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ol className="space-y-3">
          {items.map((c, i) => (
            <li key={c.id} className="flex gap-3">
              <span className="w-4 shrink-0 pt-0.5 text-sm text-ink-muted tabular-nums">{i + 1}</span>
              <Thumb src={c.image_url} size="md" />
              <div className="min-w-0 flex-1">
                <Link href={`/captions/${c.id}`} className="line-clamp-2 text-sm hover:underline">
                  {c.caption_text}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                  <Score tally={c.tally} />
                  <UserChip user={c.author} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
