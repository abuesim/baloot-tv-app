"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBannerAction } from "./actions";

/** ضغط وتصغير الصورة في المتصفح — عرض أقصى 1000px، ارتفاع أقصى 400px، JPEG 82% */
function compressBannerImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1000;
      const MAX_H = 400;
      let { naturalWidth: w, naturalHeight: h } = img;
      const scaleW = w > MAX_W ? MAX_W / w : 1;
      const scaleH = h > MAX_H ? MAX_H / h : 1;
      const scale = Math.min(scaleW, scaleH);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("فشل تحميل الصورة")); };
    img.src = url;
  });
}

export default function NewBannerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // حقول النموذج
  const textRef = useRef<HTMLInputElement>(null);
  const imageUrlRef = useRef<HTMLInputElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setImageBase64(null);
      return;
    }
    setCompressing(true);
    setError(null);
    try {
      const base64 = await compressBannerImage(file);
      setImageBase64(base64);
      setPreview(base64);
    } catch {
      setError("فشل معالجة الصورة، حاول مرة أخرى");
      setImageBase64(null);
      setPreview(null);
    } finally {
      setCompressing(false);
    }
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
    setImageBase64(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createBannerAction({
        text: textRef.current?.value.trim() || undefined,
        linkUrl: linkUrlRef.current?.value.trim() || undefined,
        order: Number(orderRef.current?.value ?? 0),
        imageBase64: imageBase64 ?? undefined,
        imageUrl: imageUrlRef.current?.value.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // إعادة تعيين النموذج
      if (textRef.current) textRef.current.value = "";
      if (imageUrlRef.current) imageUrlRef.current.value = "";
      if (linkUrlRef.current) linkUrlRef.current.value = "";
      if (orderRef.current) orderRef.current.value = "0";
      clearFile();
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-grad px-5 py-3 rounded-xl"
      >
        + إعلان جديد
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-navy p-6 rounded-2xl border border-white/10 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">إعلان جديد</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPreview(null);
            setImageBase64(null);
          }}
          className="text-white/60 hover:text-white"
        >
          إلغاء
        </button>
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">نص الإعلان</label>
        <input
          ref={textRef}
          className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
          placeholder="مرحباً بكم..."
        />
        <p className="text-xs text-white/40 mt-1">يظهر في الشريط المتحرك السفلي</p>
      </div>

      <div className="border-t border-white/10 pt-4">
        <label className="block text-sm mb-2 text-white/80">صورة الإعلان (اختياري)</label>

        {preview ? (
          <div className="relative inline-block mb-2">
            <img
              src={preview}
              alt="معاينة"
              className="rounded-xl max-h-32 border border-white/10"
            />
            <button
              type="button"
              onClick={clearFile}
              className="absolute -top-2 -left-2 bg-danger text-white w-6 h-6 rounded-full text-xs hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        ) : null}

        {compressing && (
          <div className="text-xs text-white/50 mb-2">جاري ضغط الصورة...</div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          disabled={compressing}
          className="block w-full text-sm text-white/70 file:bg-accent/20 file:hover:bg-accent/30 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-white file:font-bold file:cursor-pointer file:ml-3 cursor-pointer disabled:opacity-50"
        />
        <p className="text-xs text-white/40 mt-1">
          JPG / PNG / WEBP — تظهر في شريط الصور.
        </p>

        <div className="mt-3">
          <label className="block text-xs mb-1 text-white/60">
            أو رابط صورة خارجي:
          </label>
          <input
            ref={imageUrlRef}
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-2 text-white/80">رابط عند الضغط (اختياري)</label>
          <input
            ref={linkUrlRef}
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm mb-2 text-white/80">ترتيب العرض</label>
          <input
            ref={orderRef}
            type="number"
            defaultValue={0}
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
          />
        </div>
      </div>

      {error && (
        <div className="bg-danger/20 text-red-300 text-sm rounded-xl p-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={isPending || compressing}
        className="btn-grad px-6 py-2 rounded-xl"
      >
        {isPending ? "جاري الإضافة..." : "إضافة"}
      </button>
    </form>
  );
}
