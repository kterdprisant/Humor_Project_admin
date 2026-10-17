import "server-only";

import { requireSuperadmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/data/fetch-all";
import { likePattern, PAGE_SIZE } from "@/lib/data/query";
import {
  EMPTY_TALLY,
  type CaptionRow,
  type ProfileRow,
  type Tally,
  type TallyRow,
  type VoteRow,
} from "@/lib/types";

export type CaptionFilter = "all" | "iotd" | "encore" | "regular";

type AuthorRow = Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "avatar_url">;

export type CaptionListItem = CaptionRow & { tally: Tally; author: AuthorRow | null };

const CAPTION_COLUMNS =
  "id, user_id, image_url, image_description, caption_text, created_at, iotd_date, regenerated_from_id";
const AUTHOR_COLUMNS = "id, first_name, last_name, email, avatar_url";

/** Tallies for specific captions (the RPC result is filterable like a table). */
export async function talliesFor(ids: string[]): Promise<Map<string, Tally>> {
  const out = new Map<string, Tally>();
  // Chunked to keep the in.(...) filter well under URL length limits.
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await createAdminClient()
      .rpc("caption_vote_tallies")
      .in("caption_id", ids.slice(i, i + 200));
    if (error) throw new Error(`caption_vote_tallies: ${error.message}`);
    for (const { caption_id, ...t } of (data ?? []) as TallyRow[]) out.set(caption_id, t);
  }
  return out;
}

async function authorsFor(userIds: string[]): Promise<Map<string, AuthorRow>> {
  const ids = [...new Set(userIds)];
  const out = new Map<string, AuthorRow>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await createAdminClient()
      .from("profiles")
      .select(AUTHOR_COLUMNS)
      .in("id", ids.slice(i, i + 200));
    if (error) throw new Error(`profiles: ${error.message}`);
    for (const p of data ?? []) out.set(p.id, p);
  }
  return out;
}

export async function decorate(rows: CaptionRow[]): Promise<CaptionListItem[]> {
  const [tallies, authors] = await Promise.all([
    talliesFor(rows.map((r) => r.id)),
    authorsFor(rows.map((r) => r.user_id)),
  ]);
  return rows.map((r) => ({
    ...r,
    tally: tallies.get(r.id) ?? EMPTY_TALLY,
    author: authors.get(r.user_id) ?? null,
  }));
}

export async function listCaptions(opts: {
  q?: string;
  filter?: CaptionFilter;
  day?: string;
  page?: number;
}) {
  await requireSuperadmin();
  const page = Math.max(1, opts.page ?? 1);

  let query = createAdminClient()
    .from("captions")
    .select(CAPTION_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (opts.q) query = query.ilike("caption_text", likePattern(opts.q));
  if (opts.filter === "iotd") query = query.not("iotd_date", "is", null);
  if (opts.filter === "encore") query = query.not("regenerated_from_id", "is", null);
  if (opts.filter === "regular") query = query.is("iotd_date", null).is("regenerated_from_id", null);
  if (opts.day) query = query.eq("iotd_date", opts.day);

  const { data, count, error } = await query;
  if (error) throw new Error(`captions: ${error.message}`);
  return { rows: await decorate((data ?? []) as CaptionRow[]), total: count ?? 0, page };
}

export type CaptionVote = VoteRow & { voter: AuthorRow | null };

export async function getCaption(id: string) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: caption, error } = await admin
    .from("captions")
    .select(CAPTION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`captions: ${error.message}`);
  if (!caption) return null;

  const [parentRes, encoresRes, votes] = await Promise.all([
    caption.regenerated_from_id
      ? admin.from("captions").select(CAPTION_COLUMNS).eq("id", caption.regenerated_from_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from("captions").select(CAPTION_COLUMNS).eq("regenerated_from_id", id).order("created_at"),
    fetchAll<VoteRow>("votes", (from, to) =>
      admin
        .from("votes")
        .select("user_id, caption_id, value, updated_at")
        .eq("caption_id", id)
        .order("updated_at", { ascending: false })
        .order("user_id")
        .range(from, to),
    ),
  ]);
  if (parentRes.error) throw new Error(`captions: ${parentRes.error.message}`);
  if (encoresRes.error) throw new Error(`captions: ${encoresRes.error.message}`);

  const related = [caption, ...(parentRes.data ? [parentRes.data] : []), ...(encoresRes.data ?? [])];
  const [decorated, voters] = await Promise.all([
    decorate(related as CaptionRow[]),
    authorsFor(votes.map((v) => v.user_id)),
  ]);
  const byId = new Map(decorated.map((c) => [c.id, c]));

  return {
    caption: byId.get(caption.id)!,
    parent: parentRes.data ? byId.get(parentRes.data.id)! : null,
    encores: (encoresRes.data ?? []).map((e) => byId.get(e.id)!),
    votes: votes.map((v): CaptionVote => ({ ...v, voter: voters.get(v.user_id) ?? null })),
  };
}

/** Raw row for the edit form. */
export async function getCaptionRow(id: string): Promise<CaptionRow | null> {
  await requireSuperadmin();
  const { data, error } = await createAdminClient()
    .from("captions")
    .select(CAPTION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`captions: ${error.message}`);
  return data as CaptionRow | null;
}

/** Every profile, for the caption owner picker. */
export async function listOwnerOptions() {
  await requireSuperadmin();
  const admin = createAdminClient();
  const rows = await fetchAll<AuthorRow>("profiles", (from, to) =>
    admin.from("profiles").select(AUTHOR_COLUMNS).order("email").order("id").range(from, to),
  );
  return rows;
}
