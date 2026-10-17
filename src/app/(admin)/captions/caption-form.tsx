"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "./actions";
import type { CaptionRow, ProfileRow } from "@/lib/types";
import { displayName } from "@/lib/types";

type Owner = Pick<ProfileRow, "id" | "first_name" | "last_name" | "email">;

const input =
  "w-full rounded-md border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-up";

export function CaptionForm({
  action,
  owners,
  initial,
  defaultOwnerId,
  cancelHref,
  submitLabel,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  owners: Owner[];
  initial?: CaptionRow;
  defaultOwnerId: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="max-w-2xl space-y-5 rounded-xl border border-hairline bg-surface p-6">
      <Field label="Caption" htmlFor="caption_text">
        <textarea
          id="caption_text"
          name="caption_text"
          required
          rows={3}
          defaultValue={initial?.caption_text}
          className={input}
        />
      </Field>

      <Field label="Image URL" htmlFor="image_url" hint="Paste a link to an existing image (http or https).">
        <input id="image_url" name="image_url" type="url" required defaultValue={initial?.image_url} className={input} />
      </Field>

      <Field label="Image description" htmlFor="image_description" hint="Optional alt text / description.">
        <textarea
          id="image_description"
          name="image_description"
          rows={2}
          defaultValue={initial?.image_description ?? ""}
          className={input}
        />
      </Field>

      <Field label="Owner" htmlFor="user_id" hint="The profile this caption is credited to.">
        <select id="user_id" name="user_id" required defaultValue={initial?.user_id ?? defaultOwnerId} className={input}>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {displayName(o)}
              {o.email && displayName(o) !== o.email ? ` (${o.email})` : ""}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Image of the Day date" htmlFor="iotd_date" hint="Leave empty for a regular caption.">
          <input id="iotd_date" name="iotd_date" type="date" defaultValue={initial?.iotd_date ?? ""} className={input} />
        </Field>
        <Field label="Encore of (caption id)" htmlFor="regenerated_from_id" hint="Leave empty unless regenerated.">
          <input
            id="regenerated_from_id"
            name="regenerated_from_id"
            defaultValue={initial?.regenerated_from_id ?? ""}
            placeholder="uuid"
            className={`${input} font-mono`}
          />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md border border-down/40 bg-down/10 px-3 py-2 text-sm">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="rounded-md px-4 py-2 text-sm text-ink-secondary hover:bg-foreground/5">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
