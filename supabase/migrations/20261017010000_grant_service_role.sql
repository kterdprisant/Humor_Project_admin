-- Admin app: privileges the service-role client needs on the shared tables.
-- GRANTs are separate from RLS: service_role bypasses RLS but still needs
-- these, or queries fail with "permission denied for table/function X".
-- Found by probing in production: SELECT/UPDATE were already granted;
-- DELETE on captions and EXECUTE on the tallies RPC were not.

grant execute on function public.caption_vote_tallies() to service_role;

-- Full CRUD on captions (idempotent: re-granting existing privileges is a no-op).
grant select, insert, update, delete on public.captions to service_role;

-- Read-only tables.
grant select on public.profiles, public.votes to service_role;
