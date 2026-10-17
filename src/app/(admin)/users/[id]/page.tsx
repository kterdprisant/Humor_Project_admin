import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/data/users";
import { isUuid } from "@/lib/data/query";
import { Card, StatTile, tableCls } from "@/components/card";
import { Avatar, Thumb } from "@/components/thumb";
import { Score, VoteBadge } from "@/components/score";
import { fmtDate, fmtDateTime } from "@/components/format";
import { displayName } from "@/lib/types";

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // getUserDetail runs requireSuperadmin() before reading anything.
  const data = await getUserDetail(id);
  if (!data) notFound();
  const { profile, captions, votes } = data;

  const earned = captions.reduce((s, c) => s + c.tally.score, 0);
  const ups = votes.filter((v) => v.value === 1).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/users" className="hover:text-foreground">
          Users
        </Link>
        <span>/</span>
        <span>{displayName(profile)}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="scale-[2] origin-left pr-8">
          <Avatar src={profile.avatar_url} name={displayName(profile)} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">
            {displayName(profile)}
            {profile.is_superadmin && (
              <span className="ml-2 align-middle rounded bg-foreground/10 px-1.5 py-0.5 text-xs font-normal text-ink-secondary">
                admin
              </span>
            )}
          </h1>
          <p className="text-sm text-ink-secondary">{profile.email ?? "No email"}</p>
          <p className="font-mono text-xs text-ink-muted">{profile.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Captions" value={String(captions.length)} />
        <StatTile label="Net score earned" value={earned > 0 ? `+${earned}` : String(earned)} />
        <StatTile label="Votes cast" value={String(votes.length)} />
        <StatTile
          label="Generosity"
          value={votes.length ? `${Math.round((ups / votes.length) * 100)}%` : "—"}
          note="share of their votes that are upvotes"
        />
      </div>

      <Card title="Captions" subtitle={`${captions.length} posted`}>
        {captions.length === 0 ? (
          <p className="text-sm text-ink-muted">No captions yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {captions.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <Thumb src={c.image_url} />
                <Link href={`/captions/${c.id}`} className="line-clamp-1 flex-1 text-sm hover:underline">
                  {c.caption_text}
                </Link>
                <span className="hidden text-xs text-ink-muted sm:inline">
                  {c.iotd_date ? "IOTD" : c.regenerated_from_id ? "Encore" : ""}
                </span>
                <Score tally={c.tally} />
                <span className="hidden w-24 text-right text-xs text-ink-muted md:inline">{fmtDate(c.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Votes cast"
        subtitle={`${votes.length} votes`}
        action={
          <Link href={`/votes?user=${profile.id}`} className="text-sm text-ink-secondary hover:underline">
            Open in Votes
          </Link>
        }
      >
        {votes.length === 0 ? (
          <p className="text-sm text-ink-muted">No votes yet.</p>
        ) : (
          <div className={`${tableCls.wrap} max-h-[28rem] overflow-y-auto`}>
            <table className={tableCls.table}>
              <tbody>
                {votes.map((v) => (
                  <tr key={v.caption_id}>
                    <td className={tableCls.td}>
                      {v.caption ? (
                        <Link href={`/captions/${v.caption_id}`} className="flex items-center gap-3 hover:underline">
                          <Thumb src={v.caption.image_url} />
                          <span className="line-clamp-1">{v.caption.caption_text}</span>
                        </Link>
                      ) : (
                        <span className="text-ink-muted">Deleted caption</span>
                      )}
                    </td>
                    <td className={tableCls.td}>
                      <VoteBadge value={v.value} />
                    </td>
                    <td className={`${tableCls.td} whitespace-nowrap text-ink-secondary`}>{fmtDateTime(v.updated_at)}</td>
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
