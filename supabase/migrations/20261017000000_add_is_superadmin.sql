-- Admin app: superadmin flag on the shared profiles table.
-- Run in the Supabase SQL Editor (shared with the original Open Mic AI app).

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- WHY THE TRIGGER: the original app's `profiles_update_own` RLS policy lets a
-- signed-in user update their own row, with no column restriction. Without
-- this, anyone could call the REST API with the public anon key + their own
-- JWT and set is_superadmin = true on themselves, bypassing the admin gate.
--
-- A column-level REVOKE doesn't help while a table-level UPDATE grant exists,
-- and replacing that grant risks breaking the original app's profile form, so
-- block it here instead. API requests run as role anon/authenticated;
-- the SQL Editor, Table Editor, and service_role are unaffected.
create or replace function public.protect_is_superadmin()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.is_superadmin then
      raise exception 'is_superadmin cannot be set through the API';
    end if;
    if tg_op = 'UPDATE' and new.is_superadmin is distinct from old.is_superadmin then
      raise exception 'is_superadmin cannot be changed through the API';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_superadmin on public.profiles;
create trigger protect_is_superadmin
  before insert or update on public.profiles
  for each row execute function public.protect_is_superadmin();

-- Bootstrap (run separately, once, with your own email):
-- update public.profiles set is_superadmin = true where email = 'you@example.com';
