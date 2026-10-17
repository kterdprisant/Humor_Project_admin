// Shapes of the shared Open Mic AI tables (schema owned by the original app).

export type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_superadmin: boolean;
};

export type CaptionRow = {
  id: string;
  user_id: string;
  image_url: string;
  image_description: string | null;
  caption_text: string;
  created_at: string;
  iotd_date: string | null;
  regenerated_from_id: string | null;
};

export type VoteRow = {
  user_id: string;
  caption_id: string;
  value: 1 | -1;
  updated_at: string;
};

/** One row of the caption_vote_tallies() RPC. */
export type TallyRow = {
  caption_id: string;
  upvotes: number;
  downvotes: number;
  score: number;
};

export type Tally = Omit<TallyRow, "caption_id">;

export const EMPTY_TALLY: Tally = { upvotes: 0, downvotes: 0, score: 0 };

export function displayName(p: Pick<ProfileRow, "first_name" | "last_name" | "email"> | null | undefined) {
  if (!p) return "Unknown user";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.email || "Unnamed user";
}
