import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

const PAGE = 1000; // PostgREST's default max-rows

/**
 * Pages through a query until exhausted. Supabase silently caps each response
 * at max-rows, so a plain select() would truncate stats once a table passes
 * 1,000 rows. `page` must apply a stable order so ranges don't overlap.
 */
export async function fetchAll<T>(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) {
      // Remember: "permission denied for table X" is a missing GRANT, not RLS.
      throw new Error(`${label}: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}
