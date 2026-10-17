import "server-only";

import { requireSuperadmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/data/fetch-all";
import { decorate, talliesFor } from "@/lib/data/captions";
import { orSafe, PAGE_SIZE } from "@/lib/data/query";
import type { CaptionRow, ProfileRow, VoteRow } from "@/lib/types";

const PROFILE_COLUMNS = "id, first_name, last_name, avatar_url, email, is_superadmin";

export type UserListItem = ProfileRow & {
  captions: number;
  votesCast: number;
  pointsEarned: number;
};

export async function listUsers(opts: { q?: string; page?: number }) {
  await requireSuperadmin();
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);

  let query = admin
    .from("profiles")
    .select(PROFILE_COLUMNS, { count: "exact" })
    .order("is_superadmin", { ascending: false })
    .order("email")
    .order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const term = opts.q ? orSafe(opts.q) : "";
  if (term) {
    query = query.or(
      ["first_name", "last_name", "email"].map((c) => `${c}.ilike.*${term}*`).join(","),
    );
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`profiles: ${error.message}`);
  const profiles = (data ?? []) as ProfileRow[];
  const ids = profiles.map((p) => p.id);
  if (ids.length === 0) return { rows: [], total: count ?? 0, page };

  const [captions, votes] = await Promise.all([
    fetchAll<Pick<CaptionRow, "id" | "user_id">>("captions", (from, to) =>
      admin.from("captions").select("id, user_id").in("user_id", ids).order("id").range(from, to),
    ),
    fetchAll<Pick<VoteRow, "user_id">>("votes", (from, to) =>
      admin
        .from("votes")
        .select("user_id")
        .in("user_id", ids)
        .order("user_id")
        .order("caption_id")
        .range(from, to),
    ),
  ]);
  const tallies = await talliesFor(captions.map((c) => c.id));

  const rows: UserListItem[] = profiles.map((p) => {
    const mine = captions.filter((c) => c.user_id === p.id);
    return {
      ...p,
      captions: mine.length,
      votesCast: votes.filter((v) => v.user_id === p.id).length,
      pointsEarned: mine.reduce((s, c) => s + (tallies.get(c.id)?.score ?? 0), 0),
    };
  });
  return { rows, total: count ?? 0, page };
}

export async function getUserDetail(id: string) {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`profiles: ${error.message}`);
  if (!profile) return null;

  const [captionRows, votes] = await Promise.all([
    fetchAll<CaptionRow>("captions", (from, to) =>
      admin
        .from("captions")
        .select("id, user_id, image_url, image_description, caption_text, created_at, iotd_date, regenerated_from_id")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    fetchAll<VoteRow>("votes", (from, to) =>
      admin
        .from("votes")
        .select("user_id, caption_id, value, updated_at")
        .eq("user_id", id)
        .order("updated_at", { ascending: false })
        .order("caption_id")
        .range(from, to),
    ),
  ]);

  // Captions this user voted on, for context in the votes table.
  const votedIds = [...new Set(votes.map((v) => v.caption_id))];
  const votedOn: CaptionRow[] = [];
  for (let i = 0; i < votedIds.length; i += 200) {
    const { data, error: e } = await admin
      .from("captions")
      .select("id, user_id, image_url, image_description, caption_text, created_at, iotd_date, regenerated_from_id")
      .in("id", votedIds.slice(i, i + 200));
    if (e) throw new Error(`captions: ${e.message}`);
    votedOn.push(...((data ?? []) as CaptionRow[]));
  }
  const votedById = new Map(votedOn.map((c) => [c.id, c]));

  return {
    profile: profile as ProfileRow,
    captions: await decorate(captionRows),
    votes: votes.map((v) => ({ ...v, caption: votedById.get(v.caption_id) ?? null })),
  };
}
