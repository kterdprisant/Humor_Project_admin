import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaption, type CaptionListItem } from "@/lib/data/captions";
import { isUuid } from "@/lib/data/query";
import { Card, tableCls } from "@/components/card";
import { Thumb } from "@/components/thumb";
import { Score, VoteBadge } from "@/components/score";
import { UserChip } from "@/components/user-chip";
import { fmtDate, fmtDateTime } from "@/components/format";
import { DeleteCaptionButton } from "../delete-button";
import { deleteCaption } from "../actions";

export default async function CaptionPage({ params }: PageProps<"/captions/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // getCaption runs requireSuperadmin() before reading anything.
  const data = await getCaption(id);
  if (!data) notFound();
  const { caption: c, parent, encores, votes } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/captions" className="hover:text-foreground">
          Captions
        </Link>
        <span>/</span>
        <span className="font-mono text-xs">{c.id}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <Thumb src={c.image_url} alt={c.image_description ?? ""} size="xl" />
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xl font-medium">&ldquo;{c.caption_text}&rdquo;</p>
            <div className="flex shrink-0 items-start gap-2">
              <Link
                href={`/captions/${c.id}/edit`}
                className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-foreground/5"
              >
                Edit
              </Link>
              <DeleteCaptionButton action={deleteCaption.bind(null, c.id)} />
            </div>
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-ink-muted">Owner</dt>
            <dd>
              <UserChip user={c.author} fallbackId={c.user_id} />
            </dd>
            <dt className="text-ink-muted">Score</dt>
            <dd>
              <Score tally={c.tally} />
            </dd>
            <dt className="text-ink-muted">Created</dt>
            <dd>{fmtDateTime(c.created_at)}</dd>
            <dt className="text-ink-muted">Image of the Day</dt>
            <dd>
              {c.iotd_date ? (
                <Link href={`/captions?filter=iotd&day=${c.iotd_date}`} className="hover:underline">
                  {fmtDate(c.iotd_date)}
                </Link>
              ) : (
                "—"
              )}
            </dd>
            <dt className="text-ink-muted">Description</dt>
            <dd className="text-ink-secondary">{c.image_description || "—"}</dd>
            <dt className="text-ink-muted">Image URL</dt>
            <dd className="truncate">
              <a href={c.image_url} target="_blank" rel="noreferrer" className="text-ink-secondary hover:underline">
                {c.image_url}
              </a>
            </dd>
          </dl>
        </div>
      </div>

      {(parent || encores.length > 0) && (
        <Card title="Encore lineage" subtitle="Regenerated versions of this caption">
          <ul className="space-y-3">
            {parent && <Related label="Encore of" c={parent} />}
            {encores.map((e) => (
              <Related key={e.id} label="Encore" c={e} />
            ))}
          </ul>
        </Card>
      )}

      <Card title="Votes" subtitle={`${votes.length} total`}>
        {votes.length === 0 ? (
          <p className="text-sm text-ink-muted">No votes yet.</p>
        ) : (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Voter</th>
                  <th className={tableCls.th}>Vote</th>
                  <th className={tableCls.th}>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v) => (
                  <tr key={v.user_id}>
                    <td className={tableCls.td}>
                      <UserChip user={v.voter} fallbackId={v.user_id} />
                    </td>
                    <td className={tableCls.td}>
                      <VoteBadge value={v.value} />
                    </td>
                    <td className={`${tableCls.td} text-ink-secondary`}>{fmtDateTime(v.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Related({ label, c }: { label: string; c: CaptionListItem }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-ink-muted">{label}</span>
      <Thumb src={c.image_url} />
      <Link href={`/captions/${c.id}`} className="line-clamp-1 flex-1 text-sm hover:underline">
        {c.caption_text}
      </Link>
      <Score tally={c.tally} />
    </li>
  );
}
