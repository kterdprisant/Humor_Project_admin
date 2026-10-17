"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { getActionAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/data/query";

// Convention: return { error } rather than throw. Next.js redacts thrown
// Server Action errors in production builds, so the admin would only ever
// see a generic message after deploying.
export type ActionState = { error: string | null };

type CaptionInput = {
  caption_text: string;
  image_url: string;
  image_description: string | null;
  user_id: string;
  iotd_date: string | null;
  regenerated_from_id: string | null;
};

function field(form: FormData, name: string) {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function parseCaption(
  form: FormData,
  selfId?: string,
): Promise<{ input: CaptionInput; error: null } | { input: null; error: string }> {
  const caption_text = field(form, "caption_text");
  const image_url = field(form, "image_url");
  const user_id = field(form, "user_id");
  const iotd_date = field(form, "iotd_date") || null;
  const regenerated_from_id = field(form, "regenerated_from_id") || null;

  if (!caption_text) return { input: null, error: "Caption text is required." };
  try {
    const u = new URL(image_url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return { input: null, error: "Image URL must be a valid http(s) URL." };
  }
  if (!isUuid(user_id)) return { input: null, error: "Pick an owner for this caption." };
  if (iotd_date && !/^\d{4}-\d{2}-\d{2}$/.test(iotd_date)) {
    return { input: null, error: "Image of the Day date must be YYYY-MM-DD." };
  }
  if (regenerated_from_id && !isUuid(regenerated_from_id)) {
    return { input: null, error: "\"Encore of\" must be a caption id." };
  }
  if (regenerated_from_id && regenerated_from_id === selfId) {
    return { input: null, error: "A caption can't be an Encore of itself." };
  }

  const admin = createAdminClient();
  const [owner, parent] = await Promise.all([
    admin.from("profiles").select("id").eq("id", user_id).maybeSingle(),
    regenerated_from_id
      ? admin.from("captions").select("id").eq("id", regenerated_from_id).maybeSingle()
      : Promise.resolve({ data: { id: null }, error: null }),
  ]);
  if (owner.error || !owner.data) return { input: null, error: "That owner doesn't exist." };
  if (parent.error || !parent.data) return { input: null, error: "The \"Encore of\" caption doesn't exist." };

  return {
    input: {
      caption_text,
      image_url,
      image_description: field(form, "image_description") || null,
      user_id,
      iotd_date,
      regenerated_from_id,
    },
    error: null,
  };
}

function describe(error: PostgrestError, verb: string) {
  if (error.code === "23505") {
    return `Couldn't ${verb} caption: that user already has an Image of the Day submission for this date.`;
  }
  if (error.code === "23503") {
    return `Couldn't ${verb} caption: other rows still reference it (${error.message}).`;
  }
  if (error.code === "42501") {
    // GRANT and RLS are separate layers; this is the GRANT one.
    return `Couldn't ${verb} caption: database permission denied (check table GRANTs). ${error.message}`;
  }
  return `Couldn't ${verb} caption: ${error.message}`;
}

export async function createCaption(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { error: authError } = await getActionAdmin();
  if (authError) return { error: authError };

  const parsed = await parseCaption(form);
  if (!parsed.input) return { error: parsed.error };

  const { data, error } = await createAdminClient()
    .from("captions")
    .insert(parsed.input)
    .select("id")
    .single();
  if (error) return { error: describe(error, "create") };

  revalidatePath("/captions");
  redirect(`/captions/${data.id}`);
}

export async function updateCaption(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { error: authError } = await getActionAdmin();
  if (authError) return { error: authError };
  if (!isUuid(id)) return { error: "Invalid caption id." };

  const parsed = await parseCaption(form, id);
  if (!parsed.input) return { error: parsed.error };

  const { data, error } = await createAdminClient()
    .from("captions")
    .update(parsed.input)
    .eq("id", id)
    .select("id");
  if (error) return { error: describe(error, "update") };
  if (!data?.length) return { error: "That caption no longer exists." };

  revalidatePath("/captions");
  redirect(`/captions/${id}`);
}

export async function deleteCaption(id: string): Promise<ActionState> {
  const { error: authError } = await getActionAdmin();
  if (authError) return { error: authError };
  if (!isUuid(id)) return { error: "Invalid caption id." };

  const { data, error } = await createAdminClient()
    .from("captions")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { error: describe(error, "delete") };
  if (!data?.length) return { error: "That caption no longer exists." };

  revalidatePath("/captions");
  redirect("/captions");
}
