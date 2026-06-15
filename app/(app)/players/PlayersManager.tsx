"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  createPlayerAction,
  renamePlayerAction,
  deletePlayerAction,
  uploadPlayerImageAction,
  removePlayerImageAction,
} from "./actions";

/** ضغط وتصغير الصورة في المتصفح قبل الرفع — max 300px، JPEG 82% */
function compressImage(file: File, maxDim = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else        { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("فشل تحميل الصورة")); };
    img.src = url;
  });
}

type PlayerRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  gamesPlayed: number;
};

export default function PlayersManager({ players }: { players: PlayerRow[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createPlayerAction(name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewName("");
      router.refresh();
    });
  }

  function rename(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await renamePlayerAction(id, editName);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`حذف ${name}؟`)) return;
    startTransition(async () => {
      const res = await deletePlayerAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function pickImage(playerId: string) {
    fileInputRefs.current[playerId]?.click();
  }

  async function onFileSelected(playerId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingFor(playerId);
    try {
      // ضغط وتصغير الصورة في المتصفح أولاً
      const base64 = await compressImage(file, 300);
      const res = await uploadPlayerImageAction(playerId, base64);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    } catch {
      setError("فشل معالجة الصورة، حاول مرة أخرى");
    } finally {
      setUploadingFor(null);
      e.target.value = "";
    }
  }

  function removeImage(playerId: string) {
    if (!confirm("حذف الصورة؟")) return;
    startTransition(async () => {
      const res = await removePlayerImageAction(playerId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="اسم لاعب جديد"
          className="flex-1 bg-navy-light border border-white/10 rounded-xl px-4 py-3"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !newName.trim()}
          className="btn-grad px-6 rounded-xl"
        >
          إضافة
        </button>
      </form>

      {error && (
        <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
      )}

      {players.length === 0 ? (
        <div className="bg-navy rounded-2xl p-12 text-center text-white/40 border border-white/10">
          ما عندك لاعبين بعد. أضف أول لاعب من فوق ⬆️
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((p) => {
            const uploading = uploadingFor === p.id;
            return (
              <div
                key={p.id}
                className="bg-navy rounded-2xl p-4 border border-white/10 flex items-center gap-3"
              >
                {/* الأفاتار + زر الكاميرا */}
                <button
                  type="button"
                  onClick={() => pickImage(p.id)}
                  disabled={uploading}
                  className="relative group shrink-0"
                  title="غيّر الصورة"
                >
                  <PlayerAvatar
                    name={p.name}
                    imageUrl={p.imageUrl}
                    size="lg"
                    className={uploading ? "opacity-50" : ""}
                  />
                  {!uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs">📷</span>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-xs">
                      ...
                    </div>
                  )}
                </button>
                <input
                  ref={(el) => {
                    fileInputRefs.current[p.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileSelected(p.id, e)}
                  className="hidden"
                />

                {/* الاسم وأزرار التعديل */}
                {editingId === p.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-navy-light border border-white/10 rounded-lg px-3 py-1"
                    />
                    <button
                      onClick={() => rename(p.id)}
                      disabled={isPending}
                      className="text-xs bg-accent px-3 py-1 rounded"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-white/60"
                    >
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <>
                    <Link href={`/players/${p.id}`} className="flex-1 min-w-0 group/name">
                      <div className="font-bold text-lg truncate group-hover/name:text-gold transition-colors">
                        {p.name}
                        <span className="text-xs text-white/30 mr-1">📊</span>
                      </div>
                      <div className="text-xs text-white/50">
                        {p.gamesPlayed} صكة · اضغط للإحصائيات
                      </div>
                    </Link>
                    <div className="flex gap-1 flex-wrap shrink-0">
                      {p.imageUrl && (
                        <button
                          onClick={() => removeImage(p.id)}
                          disabled={isPending}
                          title="حذف الصورة"
                          className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
                        >
                          🗑️
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(p.id);
                          setEditName(p.name);
                        }}
                        className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => remove(p.id, p.name)}
                        disabled={p.gamesPlayed > 0}
                        title={p.gamesPlayed > 0 ? "شارك في صكات سابقة" : ""}
                        className="text-xs bg-danger/20 hover:bg-danger/30 disabled:opacity-30 disabled:cursor-not-allowed text-red-300 px-3 py-1 rounded"
                      >
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
