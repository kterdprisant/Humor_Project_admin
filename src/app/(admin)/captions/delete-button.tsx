"use client";

import { useActionState } from "react";
import type { ActionState } from "./actions";

export function DeleteCaptionButton({ action }: { action: (prev: ActionState) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Delete this caption permanently? This can't be undone.")) e.preventDefault();
      }}
      className="flex flex-col items-end gap-2"
    >
      <button
        disabled={pending}
        className="rounded-md border border-down/50 px-3 py-1.5 text-sm hover:bg-down/10 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state.error && (
        <p role="alert" className="max-w-sm text-right text-sm text-ink-secondary">
          {state.error}
        </p>
      )}
    </form>
  );
}
