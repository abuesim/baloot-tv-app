"use client";

import { useState, useTransition } from "react";
import {
  Crown,
  Headphones,
  Sparkles,
  User as UserIcon,
  Shield,
  ShieldOff,
  KeyRound,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import {
  toggleUserActiveAction,
  deleteUserAction,
  resetPasswordAction,
  setUserRoleAction,
} from "./actions";

type Role = "ADMIN" | "SUPPORT" | "CONTENT_CREATOR" | "USER";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count: { games: number; players: number };
};

const ROLES: {
  value: Role;
  label: string;
  desc: string;
  cls: string;
  icon: typeof Crown;
}[] = [
  {
    value: "ADMIN",
    label: "أدمن",
    desc: "كل الصلاحيات",
    cls: "bg-gold/20 text-gold",
    icon: Crown,
  },
  {
    value: "SUPPORT",
    label: "دعم فني",
    desc: "يساعد المستخدمين",
    cls: "bg-cyan-500/20 text-cyan-300",
    icon: Headphones,
  },
  {
    value: "CONTENT_CREATOR",
    label: "صانع محتوى",
    desc: "يدير إعلاناته وشاشته",
    cls: "bg-purple-500/20 text-purple-300",
    icon: Sparkles,
  },
  {
    value: "USER",
    label: "مستخدم",
    desc: "الأساسي",
    cls: "bg-white/10 text-white/70",
    icon: UserIcon,
  },
];

const ROLE_BY_VALUE = Object.fromEntries(ROLES.map((r) => [r.value, r])) as Record<
  Role,
  (typeof ROLES)[number]
>;

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UsersTable({
  users,
  myId,
}: {
  users: UserRow[];
  myId: string;
}) {
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [roleFor, setRoleFor] = useState<UserRow | null>(null);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-navy rounded-2xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">الصلاحية</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">اللاعبون</th>
              <th className="text-right p-3">الصكات</th>
              <th className="text-right p-3">آخر دخول</th>
              <th className="text-right p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRowDesktop
                key={u.id}
                u={u}
                myId={myId}
                onResetPassword={() => setResetFor(u.id)}
                onChangeRole={() => setRoleFor(u)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <UserCardMobile
            key={u.id}
            u={u}
            myId={myId}
            onResetPassword={() => setResetFor(u.id)}
            onChangeRole={() => setRoleFor(u)}
          />
        ))}
      </div>

      {resetFor && (
        <ResetPasswordDialog
          userId={resetFor}
          onClose={() => setResetFor(null)}
        />
      )}
      {roleFor && (
        <ChangeRoleDialog user={roleFor} onClose={() => setRoleFor(null)} />
      )}
    </>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const r = ROLE_BY_VALUE[role];
  const Icon = r.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${r.cls}`}
    >
      <Icon size={12} />
      {r.label}
    </span>
  );
}

function UserActions({
  u,
  myId,
  onResetPassword,
  onChangeRole,
}: {
  u: UserRow;
  myId: string;
  onResetPassword: () => void;
  onChangeRole: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  if (u.id === myId) {
    return <span className="text-xs text-white/40">(أنت)</span>;
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={onChangeRole}
        className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded inline-flex items-center gap-1"
      >
        <UserCog size={12} />
        الدور
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => toggleUserActiveAction(u.id))}
        className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded inline-flex items-center gap-1"
      >
        {u.active ? (
          <>
            <ShieldOff size={12} /> تعطيل
          </>
        ) : (
          <>
            <Shield size={12} /> تفعيل
          </>
        )}
      </button>
      <button
        onClick={onResetPassword}
        className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded inline-flex items-center gap-1"
      >
        <KeyRound size={12} />
        كلمة السر
      </button>
      <button
        disabled={isPending}
        onClick={() => {
          if (confirm(`حذف ${u.displayName}؟`)) {
            startTransition(() => deleteUserAction(u.id));
          }
        }}
        className="text-xs bg-danger/20 hover:bg-danger/30 text-red-300 px-2.5 py-1 rounded inline-flex items-center gap-1"
      >
        <Trash2 size={12} />
        حذف
      </button>
    </div>
  );
}

function UserRowDesktop({
  u,
  myId,
  onResetPassword,
  onChangeRole,
}: {
  u: UserRow;
  myId: string;
  onResetPassword: () => void;
  onChangeRole: () => void;
}) {
  return (
    <tr className="border-t border-white/5">
      <td className="p-3">
        <div className="font-bold">{u.displayName}</div>
        <div className="text-xs text-white/50" dir="ltr">
          @{u.username}
        </div>
      </td>
      <td className="p-3">
        <RoleBadge role={u.role} />
      </td>
      <td className="p-3">
        {u.active ? (
          <span className="text-green-400">نشط</span>
        ) : (
          <span className="text-red-400">معطّل</span>
        )}
      </td>
      <td className="p-3">{u._count.players}</td>
      <td className="p-3">{u._count.games}</td>
      <td className="p-3 text-white/60">{fmtDate(u.lastLoginAt)}</td>
      <td className="p-3">
        <UserActions
          u={u}
          myId={myId}
          onResetPassword={onResetPassword}
          onChangeRole={onChangeRole}
        />
      </td>
    </tr>
  );
}

function UserCardMobile({
  u,
  myId,
  onResetPassword,
  onChangeRole,
}: {
  u: UserRow;
  myId: string;
  onResetPassword: () => void;
  onChangeRole: () => void;
}) {
  return (
    <div className="bg-navy rounded-2xl border border-white/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{u.displayName}</div>
          <div className="text-xs text-white/50 truncate" dir="ltr">
            @{u.username}
          </div>
        </div>
        <RoleBadge role={u.role} />
      </div>
      <div className="flex items-center gap-3 text-xs text-white/60">
        {u.active ? (
          <span className="text-green-400">● نشط</span>
        ) : (
          <span className="text-red-400">● معطّل</span>
        )}
        <span>👥 {u._count.players}</span>
        <span>🎴 {u._count.games}</span>
        <span className="ml-auto">{fmtDate(u.lastLoginAt)}</span>
      </div>
      <UserActions
        u={u}
        myId={myId}
        onResetPassword={onResetPassword}
        onChangeRole={onChangeRole}
      />
    </div>
  );
}

function ChangeRoleDialog({
  user,
  onClose,
}: {
  user: UserRow;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Role>(user.role);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setUserRoleAction(user.id, selected);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-navy rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">تغيير دور — {user.displayName}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = selected === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                className={`w-full text-right p-3 rounded-xl border-2 flex items-center gap-3 transition ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-white/10 bg-navy-light hover:border-white/30"
                }`}
              >
                <span className={`p-2 rounded-lg ${r.cls}`}>
                  <Icon size={20} />
                </span>
                <div className="flex-1">
                  <div className="font-bold">{r.label}</div>
                  <div className="text-xs text-white/60">{r.desc}</div>
                </div>
                {active && (
                  <span className="text-accent text-xs font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 rounded-xl"
          >
            إلغاء
          </button>
          <button
            onClick={save}
            disabled={isPending || selected === user.role}
            className="px-5 py-2 btn-grad rounded-xl"
          >
            {isPending ? "..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await resetPasswordAction(userId, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-navy rounded-2xl p-6 w-full max-w-sm border border-white/10"
      >
        <h3 className="font-bold text-lg mb-4">كلمة سر جديدة</h3>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2 mb-4"
        />
        {error && (
          <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-2 mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 rounded-xl"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 btn-grad rounded-xl"
          >
            تغيير
          </button>
        </div>
      </form>
    </div>
  );
}
