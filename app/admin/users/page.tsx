import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import UsersTable from "./UsersTable";
import NewUserForm from "./NewUserForm";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      active: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { games: true, players: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">المستخدمون ({users.length})</h1>
      </div>

      <NewUserForm />

      <UsersTable users={users} myId={me?.id ?? ""} />
    </div>
  );
}
