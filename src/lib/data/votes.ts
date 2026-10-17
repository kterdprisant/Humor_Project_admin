import "server-only";

import { requireSuperadmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAGE_SIZE } from "@/lib/data/query";
import type { CaptionRow, ProfileRow, VoteRow } from "@/lib/types";

export type VoteListItem = VoteRow & {
  voter: Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "avatar_url"> | null;
  caption: Pick<CaptionRow, "id" | "caption_text" | "image_url"> | null;
};

export async function listVotes(opts: {
  value?: 1 | -1;
  userId?: string;
  captionId?: string;
  page?: number;
}) {
  await requireSuperadmin();
  const admin = createAdminClient();
  const page = Math.max(1, opts.page ?? 1);

  let query = admin
    .from("votes")
    .select("user_id, caption_id, value, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("caption_id")
    .order("user_id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (opts.value) query = query.eq("value", opts.value);
  if (opts.userId) query = query.eq("user_id", opts.userId);
  if (opts.captionId) query = query.eq("caption_id", opts.captionId);

  const { data, count, error } = await query;
  if (error) throw new Error(`votes: ${error.message}`);
  const votes = (data ?? []) as VoteRow[];

  const userIds = [...new Set(votes.map((v) => v.user_id))];
  const captionIds = [...new Set(votes.map((v) => v.caption_id))];
  const [voters, captions] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id, first_name, last_name, email, avatar_url").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    captionIds.length
      ? admin.from("captions").select("id, caption_text, image_url").in("id", captionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (voters.error) throw new Error(`profiles: ${voters.error.message}`);
  if (captions.error) throw new Error(`captions: ${captions.error.message}`);
  const voterById = new Map((voters.data ?? []).map((p) => [p.id, p]));
  const captionById = new Map((captions.data ?? []).map((c) => [c.id, c]));

  const rows: VoteListItem[] = votes.map((v) => ({
    ...v,
    voter: voterById.get(v.user_id) ?? null,
    caption: captionById.get(v.caption_id) ?? null,
  }));
  return { rows, total: count ?? 0, page };
}
