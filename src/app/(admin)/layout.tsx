import { requireSuperadmin } from "@/lib/dal";
import { signOut } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { Avatar } from "@/components/thumb";
import { displayName } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/captions", label: "Captions" },
  { href: "/users", label: "Users" },
  { href: "/votes", label: "Votes" },
] as const;

// Layouts don't re-render on every client navigation, so this is not the
// gate: each page and data function calls requireSuperadmin() itself.
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const admin = await requireSuperadmin();
  const name = displayName(admin);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-hairline bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <span className="font-semibold">🎤 Open Mic AI <span className="font-normal text-ink-muted">Admin</span></span>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <NavLink key={n.href} href={n.href}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-secondary">
            <Avatar src={admin.avatar_url} name={name} />
            <span className="hidden sm:inline">{admin.email}</span>
            <form action={signOut}>
              <button className="rounded-md px-2 py-1 hover:bg-foreground/5 hover:text-foreground">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
