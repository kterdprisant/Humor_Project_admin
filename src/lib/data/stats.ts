import "server-only";

import { connection } from "next/server";
import { requireSuperadmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/data/fetch-all";
import {
  EMPTY_TALLY,
  type CaptionRow,
  type ProfileRow,
  type Tally,
  type TallyRow,
  type VoteRow,
} from "@/lib/types";

export const RANGES = { "30": 30, "90": 90, all: null } as const;
export type RangeKey = keyof typeof RANGES;

type Author = Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "avatar_url">;
export type RankedCaption = Pick<CaptionRow, "id" | "caption_text" | "image_url" | "created_at"> & {
  tally: Tally;
  author: Author | null;
};

export type DayPoint = { day: string; up: number; down: number };

export type IotdDay = {
  day: string;
  imageUrl: string;
  imageDescription: string | null;
  submissions: number;
  votes: number;
  winner: RankedCaption | null;
};

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export async function getDashboardStats(range: RangeKey) {
  await requireSuperadmin();
  // Uses the current time (Date.now) for the trend window, so this must only
  // ever render for a real request, never in a prerender/prefetch pass.
  await connection();
  const admin = createAdminClient();

  const [captions, votes, tallies, profiles] = await Promise.all([
    fetchAll<CaptionRow>("captions", (from, to) =>
      admin
        .from("captions")
        .select("id, user_id, image_url, image_description, caption_text, created_at, iotd_date, regenerated_from_id")
        .order("id")
        .range(from, to),
    ),
    fetchAll<Pick<VoteRow, "value" | "updated_at">>("votes", (from, to) =>
      admin.from("votes").select("value, updated_at").order("caption_id").order("user_id").range(from, to),
    ),
    fetchAll<TallyRow>("caption_vote_tallies", (from, to) =>
      admin.rpc("caption_vote_tallies").order("caption_id").range(from, to),
    ),
    fetchAll<Author>("profiles", (from, to) =>
      admin.from("profiles").select("id, first_name, last_name, email, avatar_url").order("id").range(from, to),
    ),
  ]);

  const tallyById = new Map(tallies.map(({ caption_id, ...t }) => [caption_id, t]));
  const authorById = new Map(profiles.map((p) => [p.id, p]));
  const rank = (c: CaptionRow): RankedCaption => ({
    id: c.id,
    caption_text: c.caption_text,
    image_url: c.image_url,
    created_at: c.created_at,
    tally: tallyById.get(c.id) ?? EMPTY_TALLY,
    author: authorById.get(c.user_id) ?? null,
  });
  const ranked = captions.map(rank);
  const total = (c: RankedCaption) => c.tally.upvotes + c.tally.downvotes;

  // --- Vote trend (by votes.updated_at: a changed vote counts on its latest day) ---
  const now = Date.now();
  const days = RANGES[range];
  const counts = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    const key = v.updated_at.slice(0, 10);
    const c = counts.get(key) ?? { up: 0, down: 0 };
    if (v.value === 1) c.up++;
    else c.down++;
    counts.set(key, c);
  }
  const firstDay =
    days !== null
      ? now - (days - 1) * DAY_MS
      : Math.min(now, ...[...counts.keys()].map((k) => Date.parse(k)));
  const trend: DayPoint[] = [];
  for (let t = Date.parse(isoDay(new Date(firstDay))); t <= now; t += DAY_MS) {
    const day = isoDay(new Date(t));
    trend.push({ day, ...(counts.get(day) ?? { up: 0, down: 0 }) });
  }
  const inRange = trend.reduce((s, d) => ({ up: s.up + d.up, down: s.down + d.down }), { up: 0, down: 0 });
  const busiest = trend.reduce<DayPoint | null>(
    (b, d) => (d.up + d.down > (b ? b.up + b.down : 0) ? d : b),
    null,
  );

  // --- Hall of fame / shame / most divisive ---
  const voted = ranked.filter((c) => total(c) > 0);
  const fame = [...voted]
    .sort((a, b) => b.tally.score - a.tally.score || b.tally.upvotes - a.tally.upvotes)
    .slice(0, 5);
  const shame = voted
    .filter((c) => c.tally.score < 0)
    .sort((a, b) => a.tally.score - b.tally.score || b.tally.downvotes - a.tally.downvotes)
    .slice(0, 5);
  // Lots of votes, split close to 50/50: total × (minority share of majority).
  const controversy = (c: RankedCaption) =>
    total(c) * (Math.min(c.tally.upvotes, c.tally.downvotes) / Math.max(c.tally.upvotes, c.tally.downvotes));
  const divisive = voted
    .filter((c) => c.tally.upvotes > 0 && c.tally.downvotes > 0)
    .sort((a, b) => controversy(b) - controversy(a))
    .slice(0, 5);

  // --- Image of the Day history (from captions.iotd_date) ---
  const byDay = new Map<string, CaptionRow[]>();
  for (const c of captions) {
    if (!c.iotd_date) continue;
    byDay.set(c.iotd_date, [...(byDay.get(c.iotd_date) ?? []), c]);
  }
  const iotd: IotdDay[] = [...byDay.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 14)
    .map(([day, subs]) => {
      const rankedSubs = subs.map(rank).sort((a, b) => b.tally.score - a.tally.score);
      const top = rankedSubs[0];
      return {
        day,
        imageUrl: subs[0].image_url,
        imageDescription: subs[0].image_description,
        submissions: subs.length,
        votes: rankedSubs.reduce((s, c) => s + total(c), 0),
        winner: top && total(top) > 0 ? top : null,
      };
    });

  const allUp = votes.filter((v) => v.value === 1).length;
  return {
    totals: {
      captions: captions.length,
      users: profiles.length,
      votes: votes.length,
      approval: votes.length ? allUp / votes.length : null,
      encores: captions.filter((c) => c.regenerated_from_id).length,
      iotdDays: byDay.size,
    },
    trend,
    inRange,
    busiest,
    fame,
    shame,
    divisive,
    iotd,
  };
}
