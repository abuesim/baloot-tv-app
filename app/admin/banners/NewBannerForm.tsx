"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBannerAction } from "./actions";

export default function NewBannerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createBannerAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      (document.getElementById("new-banner-form") as HTMLFormElement)?.reset();
      setPreview(null);
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
      id="new-banner-form"
      action={onSubmit}
      className="bg-navy p-6 rounded-2xl border border-white/10 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">إعلان جديد</h3>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPreview(null);
          }}
          className="text-white/60 hover:text-white"
        >
          إلغاء
        </button>
      </div>

      <div>
        <label className="block text-sm mb-2 text-white/80">نص الإعلان</label>
        <input
          name="text"
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

        <input
          ref={fileRef}
          name="imageFile"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="block w-full text-sm text-white/70 file:bg-accent/20 file:hover:bg-accent/30 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-white file:font-bold file:cursor-pointer file:ml-3 cursor-pointer"
        />
        <p className="text-xs text-white/40 mt-1">
          JPG / PNG / WEBP — أقصى ٥ ميجا. تظهر في شريط الصور.
        </p>

        <div className="mt-3">
          <label className="block text-xs mb-1 text-white/60">
            أو رابط صورة خارجي:
          </label>
          <input
            name="imageUrl"
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
            name="linkUrl"
            dir="ltr"
            className="w-full bg-navy-light border border-white/10 rounded-xl px-3 py-2"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm mb-2 text-white/80">ترتيب العرض</label>
          <input
            name="order"
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
        disabled={isPending}
        className="btn-grad px-6 py-2 rounded-xl"
      >
        {isPending ? "جاري الإضافة..." : "إضافة"}
      </button>
    </form>
  );
}
