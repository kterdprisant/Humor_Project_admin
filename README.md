# Open Mic AI · Admin

Admin area for [Open Mic AI](https://github.com/kterdprisant/Humor_Project). It's a separate
Next.js app and Vercel project that connects to the **same Supabase project** as the
original app.

- **Dashboard**: highlights from the data.
- **Users**: read `profiles`.
- **Captions**: full CRUD.
- **Votes**: read `votes`.

Every route is behind Google sign-in **and** `profiles.is_superadmin = TRUE`.

## Setup

1. `cp .env.example .env.local` and fill in the same Supabase values as the original app.
2. In the Supabase SQL Editor, run
   [`supabase/migrations/20261017000000_add_is_superadmin.sql`](supabase/migrations/20261017000000_add_is_superadmin.sql).
3. Make yourself a superadmin (see [Bootstrapping](#bootstrapping-the-first-superadmin)):
   ```sql
   update public.profiles set is_superadmin = true where email = 'you@example.com';
   ```
4. Add each origin's callback to **Supabase → Authentication → URL Configuration →
   Redirect URLs**: `http://localhost:3000/auth/callback`, plus the Vercel domain(s), e.g.
   `https://<project>-*.vercel.app/auth/callback`. A "redirect mismatch" error at sign-in
   almost always means this list is missing an entry.
5. `npm install && npm run dev`

## How the gate works

There are several layers, and none of them trusts the ones before it:

| Layer | Where | What it checks |
| --- | --- | --- |
| Proxy | `src/proxy.ts` → `src/lib/supabase/update-session.ts` | Refreshes the session. With no signed-in user, every path except `/login` and `/auth/callback` redirects to `/login`. |
| DAL | `src/lib/dal.ts` | `requireSuperadmin()` validates the user with `auth.getUser()`, then reads `profiles.is_superadmin` for that verified id. Any error or missing row **fails closed** (redirects to `/forbidden`). |
| Pages and data | every `(admin)` page and every data function | Each one calls `requireSuperadmin()` itself. The layout alone isn't enough, because layouts don't re-run on every client navigation. |
| Server Actions | every action | `getActionAdmin()` runs before any write and returns `{ error }` rather than throwing, because Next.js redacts thrown action errors in production. |

Admin data is read with the **service-role client** (`src/lib/supabase/admin.ts`), which
bypasses RLS. That's why the code checks the superadmin flag before every query instead of
relying on RLS.

The migration also adds a trigger that stops `is_superadmin` from being changed through the
Supabase API (roles `anon` and `authenticated`). The original app's `profiles_update_own`
policy lets users update any column of their own row. Without the trigger, anyone could
`PATCH` their own profile with the public anon key and promote themselves.

## Bootstrapping the first superadmin

> *If only superadmins can get into the admin app, how does the first superadmin get made?*

From **outside** the app. The project owner sets `is_superadmin = TRUE` on their own row
directly in the Supabase dashboard (Table Editor or SQL Editor). That works because those
tools run with database-owner privileges, and only someone with access to the Supabase
project can use them.

The app deliberately has **no** "make me an admin" route or self-service flow:

- `is_superadmin` only controls access to *this app's routes*. Who can *set* the column is
  a separate question, and the answer has to be "only people who already control the
  database". Otherwise the gate is meaningless.
- Any in-app way to grant the flag would have to be reachable by someone who isn't an admin
  yet, so it would be a door around the gate for anyone with a Google account.
- For the same reason, the trigger blocks the API from changing the flag. That way even the
  original app's own-row update policy can't be used to promote yourself.

After the first admin exists, more admins are still added in the Supabase dashboard.

## Deploying (Vercel)

- Set the same three env vars in Vercel (`SUPABASE_SERVICE_ROLE_KEY` server-side only).
- **Before submitting:** Project → Settings → Deployment Protection → turn off **Vercel
  Authentication**, so the deployment can be opened in an Incognito window.
- Submit the **latest commit-specific deployment URL** (the
  `https://<project>-<hash>-<team>.vercel.app` link for the newest commit), not just the
  production alias.
