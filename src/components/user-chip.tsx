import Link from "next/link";
import { Avatar } from "@/components/thumb";
import { displayName, type ProfileRow } from "@/lib/types";

type Person = Pick<ProfileRow, "id" | "first_name" | "last_name" | "email" | "avatar_url">;

export function UserChip({ user, fallbackId }: { user: Person | null; fallbackId?: string }) {
  const name = displayName(user);
  const id = user?.id ?? fallbackId;
  const body = (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar src={user?.avatar_url} name={name} />
      <span className="truncate">{name}</span>
    </span>
  );
  return id ? (
    <Link href={`/users/${id}`} className="min-w-0 hover:underline">
      {body}
    </Link>
  ) : (
    body
  );
}
