"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdBanner } from "@prisma/client";
import {
  createMyBannerAction,
  updateMyBannerAction,
  toggleMyBannerAction,
  deleteMyBannerAction,
} from "./ads-actions";

/** ضغط الصورة في المتصفح — عرض أقصى 1000px، ارتفاع أقصى 400px، JPEG 82% */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1000, MAX_H = 400;
      let { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(w > MAX_W ? MAX_W / w : 1, h > MAX_H ? MAX_H / h : 1);
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("فشل")); };
    img.src = url;
  });
}

// ─── حقول الصورة مشتركة (إنشاء + تعديل) ────────────────────────
function ImageFields({
  currentImageUrl,
  fileRef,
  preview,
  compressing,
  onFileChange,
  onClearImage,
}: {
  currentImageUrl?: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  preview: string | null;
  compressing: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}) {
  const hasImage = preview || currentImageUrl;
  return (
    <>
      <div>
        <label className="block text-xs mb-1 text-white/80">صورة (اختياري)</label>
        {hasImage && (
          <div className="relative inline-block mb-2">
            <img
              src={preview ?? currentImageUrl!}
              className="rounded-lg max-h-24 border border-white/10"
            />
            <button
              type="button"
              onClick={onClearImage}
              className="absolute -top-2 -left-2 bg-danger text-white w-5 h-5 rounded-full text-xs leading-none"
            >
              ✕
            </button>
          </div>
        )}
        {compressing && (
          <div className="text-xs text-white/50 mb-1">⏳ جاري ضغط الصورة...</div>
        )}
        <input
          ref={fileRef}
          name="imageFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          disabled={compressing}
          className="block w-full text-xs text-white/70 file:bg-accent/20 file:hover:bg-accent/30 file:border-0 file:rounded file:px-3 file:py-1 file:text-white file:cursor-pointer file:ml-2 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-xs mb-1 text-white/80">رابط الصورة الخارجي (بديل)</label>
        <input
          name="imageUrl"
          dir="ltr"
          className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </div>
    </>
  );
}

// ─── إنشاء إعلان جديد ────────────────────────────────────────────
export default function MyAdsSection({ ads }: { ads: AdBanner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); setImageBase64(null); return; }
    setCompressing(true);
    setError(null);
    try {
      const b64 = await compressImage(file);
      setImageBase64(b64);
      setPreview(b64);
    } catch {
      setError("فشل معالجة الصورة");
      setImageBase64(null); setPreview(null);
    } finally {
      setCompressing(false);
    }
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
    setImageBase64(null);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    if (imageBase64) formData.set("imageBase64", imageBase64);
    startTransition(async () => {
      const res = await createMyBannerAction(formData);
      if (!res.ok) { setError(res.error); return; }
      (document.getElementById("my-ad-form") as HTMLFormElement)?.reset();
      setPreview(null);
      setImageBase64(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="btn-grad px-4 py-2 rounded-xl text-sm"
        >
          + إعلان جديد
        </button>
      )}

      {open && (
        <form
          id="my-ad-form"
          action={onSubmit}
          className="bg-navy-light p-4 rounded-2xl border border-white/10 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold">إعلان جديد</h4>
            <button
              type="button"
              onClick={() => { setOpen(false); setPreview(null); }}
              className="text-white/60 text-sm hover:text-white"
            >
              إلغاء
            </button>
          </div>

          <div>
            <label className="block text-xs mb-1 text-white/80">نص الإعلان</label>
            <input
              name="text"
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
              placeholder="نص يظهر في الشريط المتحرك"
            />
          </div>

          <ImageFields
            fileRef={fileRef}
            preview={preview}
            compressing={compressing}
            onFileChange={onFileChange}
            onClearImage={clearFile}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1 text-white/80">رابط عند الضغط</label>
              <input
                name="linkUrl"
                dir="ltr"
                className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-white/80">ترتيب</label>
              <input
                name="order"
                type="number"
                defaultValue={0}
                dir="ltr"
                className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="bg-danger/20 text-red-300 text-xs rounded-lg p-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-grad px-5 py-2 rounded-lg text-sm"
          >
            {isPending ? "..." : "إضافة"}
          </button>
        </form>
      )}

      {ads.length === 0 ? (
        <div className="text-center text-white/40 py-6 text-sm">
          ما عندك إعلانات بعد
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map((b) => (
            <AdRow key={b.id} ad={b} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── صف الإعلان (عرض + تعديل inline) ────────────────────────────
function AdRow({ ad }: { ad: AdBanner }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // حالة الصورة في وضع التعديل
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [clearImage, setClearImage] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setPreview(null);
    setImageBase64(null);
    setClearImage(false);
    if (editFileRef.current) editFileRef.current.value = "";
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); setImageBase64(null); return; }
    setCompressing(true);
    setError(null);
    try {
      const b64 = await compressImage(file);
      setImageBase64(b64);
      setPreview(b64);
      setClearImage(false);
    } catch {
      setError("فشل معالجة الصورة");
    } finally {
      setCompressing(false);
    }
  }

  function onClearImage() {
    setPreview(null);
    setImageBase64(null);
    setClearImage(true);
    if (editFileRef.current) editFileRef.current.value = "";
  }

  function onSubmitEdit(formData: FormData) {
    setError(null);
    if (imageBase64) formData.set("imageBase64", imageBase64);
    if (clearImage)  formData.set("clearImage", "1");
    startTransition(async () => {
      const res = await updateMyBannerAction(ad.id, formData);
      if (!res.ok) { setError(res.error); return; }
      cancelEdit();
      router.refresh();
    });
  }

  // ── وضع التعديل ──────────────────────────────────────────────
  if (editing) {
    // الصورة الحالية (base64 → لا نعرضها في حقل URL الخارجي)
    const currentImageUrl = clearImage
      ? null
      : preview
        ? null   // preview يظهر في المعاينة
        : ad.imageUrl;

    return (
      <form
        action={onSubmitEdit}
        className="bg-navy-light rounded-xl p-4 border border-accent/40 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm">✏️ تعديل الإعلان</h4>
          <button
            type="button"
            onClick={cancelEdit}
            className="text-white/60 text-sm hover:text-white"
          >
            إلغاء
          </button>
        </div>

        {/* نص */}
        <div>
          <label className="block text-xs mb-1 text-white/80">نص الإعلان</label>
          <input
            name="text"
            defaultValue={ad.text ?? ""}
            className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
            placeholder="نص يظهر في الشريط المتحرك"
          />
        </div>

        {/* الصورة */}
        <div>
          <label className="block text-xs mb-1 text-white/80">صورة</label>
          {(preview || (!clearImage && ad.imageUrl)) && (
            <div className="relative inline-block mb-2">
              <img
                src={preview ?? ad.imageUrl!}
                className="rounded-lg max-h-24 border border-white/10"
              />
              <button
                type="button"
                onClick={onClearImage}
                className="absolute -top-2 -left-2 bg-danger text-white w-5 h-5 rounded-full text-xs leading-none"
              >
                ✕
              </button>
            </div>
          )}
          {compressing && (
            <div className="text-xs text-white/50 mb-1">⏳ جاري ضغط الصورة...</div>
          )}
          <input
            ref={editFileRef}
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            disabled={compressing}
            className="block w-full text-xs text-white/70 file:bg-accent/20 file:hover:bg-accent/30 file:border-0 file:rounded file:px-3 file:py-1 file:text-white file:cursor-pointer file:ml-2 disabled:opacity-50"
          />
        </div>

        {/* رابط صورة خارجي */}
        <div>
          <label className="block text-xs mb-1 text-white/80">رابط الصورة الخارجي (بديل)</label>
          <input
            name="imageUrl"
            dir="ltr"
            defaultValue={
              ad.imageUrl && !ad.imageUrl.startsWith("data:")
                ? ad.imageUrl
                : ""
            }
            className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>

        {/* رابط + ترتيب */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1 text-white/80">رابط عند الضغط</label>
            <input
              name="linkUrl"
              dir="ltr"
              defaultValue={ad.linkUrl ?? ""}
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-white/80">ترتيب</label>
            <input
              name="order"
              type="number"
              defaultValue={ad.order}
              dir="ltr"
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="bg-danger/20 text-red-300 text-xs rounded-lg p-2">{error}</div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-grad px-5 py-2 rounded-lg text-sm"
          >
            {isPending ? "..." : "حفظ التعديلات"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg"
          >
            إلغاء
          </button>
        </div>
      </form>
    );
  }

  // ── وضع العرض ────────────────────────────────────────────────
  return (
    <div
      className={`flex items-center gap-3 bg-navy-light rounded-xl p-3 border border-white/10 ${
        !ad.active ? "opacity-50" : ""
      }`}
    >
      {ad.imageUrl && (
        <img
          src={ad.imageUrl}
          className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">
          {ad.text || <span className="text-white/40 italic">— بدون نص —</span>}
        </div>
        {ad.linkUrl && (
          <div className="text-xs text-white/50 truncate" dir="ltr">
            ↗ {ad.linkUrl}
          </div>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <button
          disabled={isPending}
          onClick={() => setEditing(true)}
          className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
        >
          تعديل
        </button>
        <button
          disabled={isPending}
          onClick={() => startTransition(() => toggleMyBannerAction(ad.id))}
          className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
        >
          {ad.active ? "تعطيل" : "تفعيل"}
        </button>
        <button
          disabled={isPending}
          onClick={() => {
            if (confirm("حذف الإعلان؟")) {
              startTransition(() => deleteMyBannerAction(ad.id));
            }
          }}
          className="text-xs bg-danger/20 hover:bg-danger/30 text-red-300 px-2 py-1 rounded"
        >
          حذف
        </button>
      </div>
    </div>
  );
}
