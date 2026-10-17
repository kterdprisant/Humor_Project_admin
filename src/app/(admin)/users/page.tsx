import Link from "next/link";
import { listUsers } from "@/lib/data/users";
import { pageParam, stringParam } from "@/lib/data/query";
import { PageHeader, tableCls } from "@/components/card";
import { Pagination } from "@/components/pagination";
import { Avatar } from "@/components/thumb";
import { displayName } from "@/lib/types";

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  // listUsers runs requireSuperadmin() before reading anything.
  const { rows, total, page } = await listUsers({ q, page: pageParam(sp.page) });

  return (
    <div className="space-y-4">
      <PageHeader title="Users">
        <span className="text-sm text-ink-muted">Read-only</span>
      </PageHeader>

      <form className="flex gap-2" action="/users">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="w-64 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm"
        />
        <button className="rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-foreground/5">Search</button>
      </form>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>User</th>
              <th className={tableCls.th}>Email</th>
              <th className={`${tableCls.th} text-right`}>Captions</th>
              <th className={`${tableCls.th} text-right`}>Votes cast</th>
              <th className={`${tableCls.th} text-right`}>Net score earned</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-foreground/[0.03]">
                <td className={tableCls.td}>
                  <Link href={`/users/${u.id}`} className="inline-flex items-center gap-2 hover:underline">
                    <Avatar src={u.avatar_url} name={displayName(u)} />
                    {displayName(u)}
                  </Link>
                  {u.is_superadmin && (
                    <span className="ml-2 rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-ink-secondary">admin</span>
                  )}
                </td>
                <td className={`${tableCls.td} text-ink-secondary`}>{u.email ?? "—"}</td>
                <td className={`${tableCls.td} text-right tabular-nums`}>{u.captions}</td>
                <td className={`${tableCls.td} text-right tabular-nums`}>{u.votesCast}</td>
                <td className={`${tableCls.td} text-right tabular-nums`}>
                  {u.pointsEarned > 0 ? `+${u.pointsEarned}` : u.pointsEarned}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} basePath="/users" params={{ q }} />
    </div>
  );
}
