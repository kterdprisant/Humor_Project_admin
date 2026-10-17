"use client";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const err = error instanceof Error ? (error as Error & { digest?: string }) : null;
  return (
    <div className="rounded-xl border border-hairline bg-surface p-6">
      <h1 className="font-semibold">Something went wrong loading this page</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        {/* Production redacts server error messages; the digest matches the server log. */}
        {err?.digest ? `Error reference: ${err.digest}. Check the Vercel function logs.` : err?.message}
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        A &ldquo;permission denied for table&rdquo; error means a missing GRANT, not an RLS policy.
      </p>
      <button onClick={() => retry()} className="mt-4 rounded-md border border-hairline px-3 py-1.5 text-sm hover:bg-foreground/5">
        Try again
      </button>
    </div>
  );
}
