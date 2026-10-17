export const PAGE_SIZE = 25;

/** `%term%` for ilike, with LIKE wildcards in user input escaped. */
export function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * For PostgREST `.or()` strings, where commas/parens/quotes are syntax:
 * drop them rather than let search input rewrite the filter.
 */
export function orSafe(term: string) {
  return term.replace(/[,()"\\]/g, " ").trim();
}

export function pageParam(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function stringParam(v: string | string[] | undefined) {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string | undefined): v is string {
  return !!v && UUID.test(v);
}
