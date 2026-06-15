"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSubUserAction,
  changeSubUserPasswordAction,
  updateSubUserPermissionsAction,
  toggleSubUserAction,
  deleteSubUserAction,
} from "./actions";

type SubUser = {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  subCanStartGame: boolean;
  subCanAddPlayers: boolean;
  subCanViewHistory: boolean;
  subCanViewStats: boolean;
  subCanManageTournaments: boolean;
  subCanDelete: boolean;
};

// ============================================================
// المكوّن الرئيسي
// ============================================================

export default function SubUserSection({
  creatorUsername,
  subUser,
}: {
  creatorUsername: string;
  subUser: SubUser | null;
}) {
  const router = useRouter();

  if (!subUser) {
    return <CreateSubUser username={`${creatorUsername}-`} onCreated={() => router.refresh()} />;
  }

  return <ManageSubUser sub={subUser} onChanged={() => router.refresh()} />;
}

// ============================================================
// إنشاء مستخدم فرعي
// ============================================================

function CreateSubUser({
  username,
  onCreated,
}: {
  username: string;
  onCreated: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("كلمتا السر غير متطابقتين");
      return;
    }
    startTransition(async () => {
      const res = await createSubUserAction(password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated();
    });
  }

  return (
    <div className="space-y-6">
      {/* شرح مختصر */}
      <div className="bg-gold/10 border border-gold/20 rounded-2xl p-4 text-sm text-white/80 space-y-1">
        <p className="font-bold text-gold">ما هو المستخدم الفرعي؟</p>
        <p>حساب مساعد خاص بك يمكنك منحه للمساعد في تشغيل الجلسات — يقدر يضيف لاعبين ويبدأ صكات بدون صلاحيات الإدارة الكاملة.</p>
      </div>

      {/* معاينة اسم المستخدم */}
      <div>
        <p className="text-sm text-white/60 mb-2">سيكون اسم المستخدم الفرعي:</p>
        <div className="inline-flex items-center gap-2 bg-navy-light border border-white/15 rounded-xl px-4 py-2">
          <span className="text-lg font-black tracking-wider text-gold" dir="ltr">
            {username}
          </span>
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">ثابت</span>
        </div>
      </div>

      {/* نموذج الإنشاء */}
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <div>
          <label className="block text-sm mb-1 text-white/80">كلمة السر</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            dir="ltr"
            placeholder="٦ أحرف على الأقل"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-white/80">تأكيد كلمة السر</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            dir="ltr"
            placeholder="أعد الكتابة"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
          />
        </div>

        {error && (
          <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={isPending || !password || !confirm}
          className="btn-grad px-6 py-2 rounded-xl disabled:opacity-50"
        >
          {isPending ? "جاري الإنشاء..." : "إنشاء المستخدم الفرعي"}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// إدارة مستخدم فرعي موجود
// ============================================================

type PermKey =
  | "subCanStartGame"
  | "subCanAddPlayers"
  | "subCanViewHistory"
  | "subCanViewStats"
  | "subCanManageTournaments"
  | "subCanDelete";

const PERMISSIONS: {
  key: PermKey;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { key: "subCanStartGame",   label: "بدء صكة جديدة",    desc: "يقدر يبدأ صكة ويسجّل النقاط",   icon: "🎮" },
  { key: "subCanAddPlayers",  label: "إضافة لاعبين",      desc: "يقدر يضيف لاعبين للروستر",       icon: "👤" },
  { key: "subCanViewHistory", label: "عرض السجل",         desc: "يقدر يشوف سجل الصكات السابقة",   icon: "📋" },
  { key: "subCanViewStats",   label: "عرض الإحصائيات",   desc: "يقدر يشوف إحصائيات اللاعبين",    icon: "📊" },
  { key: "subCanManageTournaments", label: "إدارة البطولات", desc: "إنشاء البطولات والقرعة وتكوين الفرق", icon: "🏆" },
  { key: "subCanDelete",      label: "الحذف",             desc: "حذف الصكات والبطولات وسجلاتها", icon: "🗑️" },
];

function ManageSubUser({
  sub,
  onChanged,
}: {
  sub: SubUser;
  onChanged: () => void;
}) {
  const [perms, setPerms] = useState({
    subCanStartGame:   sub.subCanStartGame,
    subCanAddPlayers:  sub.subCanAddPlayers,
    subCanViewHistory: sub.subCanViewHistory,
    subCanViewStats:   sub.subCanViewStats,
    subCanManageTournaments: sub.subCanManageTournaments,
    subCanDelete:      sub.subCanDelete,
  });
  const [permsSaved, setPermsSaved] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);
  const [isPendingPerms, startPerms] = useTransition();

  // كلمة السر
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPendingPass, startPass] = useTransition();

  // تعطيل / حذف
  const [isPendingToggle, startToggle] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPendingDelete, startDelete] = useTransition();

  function savePerms() {
    setPermsError(null);
    setPermsSaved(false);
    startPerms(async () => {
      const res = await updateSubUserPermissionsAction(perms);
      if (!res.ok) { setPermsError(res.error); return; }
      setPermsSaved(true);
      setTimeout(() => setPermsSaved(false), 2500);
      onChanged();
    });
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(null);
    if (newPass !== confirmPass) {
      setPassMsg({ ok: false, text: "كلمتا السر غير متطابقتين" });
      return;
    }
    startPass(async () => {
      const res = await changeSubUserPasswordAction(newPass);
      if (!res.ok) { setPassMsg({ ok: false, text: res.error }); return; }
      setPassMsg({ ok: true, text: "تم تغيير كلمة السر ✓" });
      setNewPass("");
      setConfirmPass("");
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleSubUserAction();
      onChanged();
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteSubUserAction();
      onChanged();
    });
  }

  return (
    <div className="space-y-6">

      {/* بطاقة المستخدم الفرعي */}
      <div className="bg-navy-light border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-lg font-black text-gold">
            ف
          </div>
          <div>
            <div className="font-black text-lg tracking-wider" dir="ltr">{sub.username}</div>
            <div className="text-xs text-white/50">{sub.displayName}</div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={isPendingToggle}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
            sub.active
              ? "bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400"
              : "bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400"
          }`}
        >
          {isPendingToggle ? "..." : sub.active ? "● نشط" : "○ معطّل"}
        </button>
      </div>

      {/* الصلاحيات */}
      <div className="bg-navy rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-base">الصلاحيات</h3>
          <button
            onClick={savePerms}
            disabled={isPendingPerms}
            className="text-xs btn-grad px-4 py-1.5 rounded-lg disabled:opacity-50"
          >
            {isPendingPerms ? "..." : permsSaved ? "✓ حُفظ" : "حفظ"}
          </button>
        </div>
        <div className="divide-y divide-white/5">
          {PERMISSIONS.map(({ key, label, desc, icon }) => (
            <div key={key} className="flex items-center justify-between px-5 py-3.5 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-white/40">{desc}</div>
                </div>
              </div>
              <Toggle
                value={perms[key]}
                onChange={(v) => setPerms((p) => ({ ...p, [key]: v }))}
              />
            </div>
          ))}
        </div>
        {permsError && (
          <div className="mx-5 mb-3 bg-danger/20 text-red-300 text-xs rounded-xl p-2">{permsError}</div>
        )}
      </div>

      {/* تغيير كلمة السر */}
      <div className="bg-navy rounded-2xl border border-white/10 p-5">
        <h3 className="font-bold text-base mb-4">تغيير كلمة السر</h3>
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-sm mb-1 text-white/80">كلمة السر الجديدة</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              minLength={6}
              dir="ltr"
              placeholder="٦ أحرف على الأقل"
              className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-white/80">تأكيد كلمة السر</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
              dir="ltr"
              placeholder="أعد الكتابة"
              className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            />
          </div>
          {passMsg && (
            <div className={`rounded-xl p-3 text-sm ${passMsg.ok ? "bg-green-500/20 text-green-300" : "bg-danger/20 text-red-300"}`}>
              {passMsg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={isPendingPass || !newPass || !confirmPass}
            className="btn-grad px-6 py-2 rounded-xl disabled:opacity-50"
          >
            {isPendingPass ? "..." : "تغيير"}
          </button>
        </form>
      </div>

      {/* خطر: حذف المستخدم الفرعي */}
      <div className="bg-navy rounded-2xl border border-danger/20 p-5">
        <h3 className="font-bold text-base mb-1 text-red-400">حذف المستخدم الفرعي</h3>
        <p className="text-xs text-white/50 mb-4">سيتم حذف الحساب نهائياً. اللاعبون والصكات المسجّلة تبقى محفوظة في حسابك.</p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm bg-danger/20 hover:bg-danger/30 text-red-300 px-5 py-2 rounded-xl"
          >
            حذف الحساب
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">تأكيد الحذف؟</span>
            <button
              onClick={handleDelete}
              disabled={isPendingDelete}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-50"
            >
              {isPendingDelete ? "..." : "حذف"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-white/50 hover:text-white px-3 py-2"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ============================================================
// مكوّن Toggle
// ============================================================

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        value ? "bg-gold" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? "-translate-x-0.5 right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}
