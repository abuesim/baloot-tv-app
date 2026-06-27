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
// المكوّن الرئيسي — قائمة المساعدين + نموذج إضافة
// ============================================================

export default function SubUserSection({
  creatorUsername,
  subUsers,
}: {
  creatorUsername: string;
  subUsers: SubUser[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      {/* شرح مختصر */}
      <div className="bg-gold/10 border border-gold/20 rounded-2xl p-4 text-sm text-white/80 space-y-1">
        <p className="font-bold text-gold">المساعدون</p>
        <p>
          حسابات مساعدة مرتبطة بحسابك — تقدر تنشئ أكثر من مساعد، كل واحد باسمه
          وكلمة سره وصلاحياته. يساعدونك في تشغيل الجلسات بدون صلاحيات الإدارة
          الكاملة.
        </p>
      </div>

      {/* قائمة المساعدين الحاليين */}
      {subUsers.length > 0 && (
        <div className="space-y-5">
          {subUsers.map((sub) => (
            <ManageSubUser key={sub.id} sub={sub} onChanged={refresh} />
          ))}
        </div>
      )}

      {/* إضافة مساعد جديد */}
      <CreateSubUser creatorUsername={creatorUsername} onCreated={refresh} />
    </div>
  );
}

// ============================================================
// إنشاء مساعد جديد
// ============================================================

function CreateSubUser({
  creatorUsername,
  onCreated,
}: {
  creatorUsername: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
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
      const res = await createSubUserAction({ name, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setPassword("");
      setConfirm("");
      onCreated();
    });
  }

  return (
    <div className="bg-navy rounded-2xl border border-white/10 p-5">
      <h3 className="font-bold text-base mb-4">➕ إضافة مساعد جديد</h3>
      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <div>
          <label className="block text-sm mb-1 text-white/80">اسم المساعد</label>
          <div className="flex items-center bg-navy-light border border-white/10 rounded-xl overflow-hidden">
            <span
              className="px-3 py-2 text-sm text-white/40 bg-white/5 shrink-0"
              dir="ltr"
            >
              {creatorUsername}-
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              required
              dir="ltr"
              placeholder="مثلاً ahmad"
              className="w-full bg-transparent px-3 py-2 outline-none"
            />
          </div>
          <p className="text-[11px] text-white/30 mt-1">
            حروف إنجليزية صغيرة وأرقام و _ فقط
          </p>
        </div>
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
          disabled={isPending || !name || !password || !confirm}
          className="btn-grad px-6 py-2 rounded-xl disabled:opacity-50"
        >
          {isPending ? "جاري الإنشاء..." : "إنشاء المساعد"}
        </button>
      </form>
    </div>
  );
}

// ============================================================
// إدارة مساعد موجود
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

  // طيّ بطاقة الإدارة
  const [open, setOpen] = useState(false);

  // تعطيل / حذف
  const [isPendingToggle, startToggle] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPendingDelete, startDelete] = useTransition();

  function savePerms() {
    setPermsError(null);
    setPermsSaved(false);
    startPerms(async () => {
      const res = await updateSubUserPermissionsAction(sub.id, perms);
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
      const res = await changeSubUserPasswordAction(sub.id, newPass);
      if (!res.ok) { setPassMsg({ ok: false, text: res.error }); return; }
      setPassMsg({ ok: true, text: "تم تغيير كلمة السر ✓" });
      setNewPass("");
      setConfirmPass("");
    });
  }

  function handleToggle() {
    startToggle(async () => {
      await toggleSubUserAction(sub.id);
      onChanged();
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteSubUserAction(sub.id);
      onChanged();
    });
  }

  return (
    <div className="bg-navy-light border border-white/10 rounded-2xl overflow-hidden">
      {/* رأس البطاقة */}
      <div className="p-4 flex items-center justify-between gap-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 text-right min-w-0"
        >
          <div className="w-11 h-11 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-lg font-black text-gold shrink-0">
            ف
          </div>
          <div className="min-w-0">
            <div className="font-black text-lg tracking-wider truncate" dir="ltr">{sub.username}</div>
            <div className="text-xs text-white/50 truncate">{sub.displayName}</div>
          </div>
          <span className="text-white/30 text-xs">{open ? "▲" : "▼"}</span>
        </button>
        <button
          onClick={handleToggle}
          disabled={isPendingToggle}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 ${
            sub.active
              ? "bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400"
              : "bg-red-500/20 text-red-400 hover:bg-green-500/20 hover:text-green-400"
          }`}
        >
          {isPendingToggle ? "..." : sub.active ? "● نشط" : "○ معطّل"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-6">
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

          {/* خطر: حذف المساعد */}
          <div className="bg-navy rounded-2xl border border-danger/20 p-5">
            <h3 className="font-bold text-base mb-1 text-red-400">حذف المساعد</h3>
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
      )}
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
