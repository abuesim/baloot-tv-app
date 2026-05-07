import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export type UploadCategory = "players" | "banners";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function dirsFor(category: UploadCategory) {
  const rel = `/uploads/${category}`;
  const abs = path.join(PUBLIC_DIR, "uploads", category);
  return { rel, abs };
}

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function saveUploadedImage(
  file: File,
  category: UploadCategory,
): Promise<UploadResult> {
  if (!ALLOWED_MIMES.has(file.type)) {
    return { ok: false, error: "نوع الصورة غير مدعوم (JPG / PNG / WEBP فقط)" };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "حجم الصورة أكبر من ٥ ميجا" };
  }
  if (file.size === 0) {
    return { ok: false, error: "الملف فارغ" };
  }

  const { rel, abs } = dirsFor(category);
  await mkdir(abs, { recursive: true });

  const ext = EXT_MAP[file.type]!;
  const filename = `${randomBytes(12).toString("hex")}.${ext}`;
  const absPath = path.join(abs, filename);

  if (!absPath.startsWith(abs + path.sep)) {
    return { ok: false, error: "مسار غير صالح" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);

  return { ok: true, url: `${rel}/${filename}` };
}

export async function deleteUploadedImage(url: string | null): Promise<void> {
  if (!url) return;
  if (!url.startsWith("/uploads/")) return;
  // المسار مثل /uploads/players/abc.jpg أو /uploads/banners/xyz.png
  const parts = url.split("/").filter(Boolean); // ["uploads","players","abc.jpg"]
  if (parts.length !== 3) return;
  const [, category, filename] = parts as [string, string, string];
  if (category !== "players" && category !== "banners") return;

  const { abs } = dirsFor(category);
  const absPath = path.join(abs, filename);
  if (!absPath.startsWith(abs + path.sep)) return;
  try {
    await unlink(absPath);
  } catch {
    // الملف غير موجود أصلاً
  }
}

// أسماء قديمة للتوافق
export const savePlayerImage = (file: File) =>
  saveUploadedImage(file, "players");
export const deletePlayerImage = deleteUploadedImage;

// ─── رفع الصوت ───────────────────────────────────────────────
const ALLOWED_AUDIO_MIMES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav",
  "audio/ogg",  "audio/mp4", "audio/x-m4a",
]);
const AUDIO_EXT_MAP: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3":  "mp3",
  "audio/wav":  "wav",
  "audio/ogg":  "ogg",
  "audio/mp4":  "m4a",
  "audio/x-m4a":"m4a",
};
const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

export async function saveUploadedAudio(file: File): Promise<UploadResult> {
  if (!ALLOWED_AUDIO_MIMES.has(file.type)) {
    return { ok: false, error: "نوع الملف غير مدعوم (MP3 / WAV / OGG فقط)" };
  }
  if (file.size > MAX_AUDIO_SIZE) {
    return { ok: false, error: "حجم الملف أكبر من ٥ ميجا" };
  }
  if (file.size === 0) {
    return { ok: false, error: "الملف فارغ" };
  }

  const abs = path.join(PUBLIC_DIR, "uploads", "sounds");
  await mkdir(abs, { recursive: true });

  const ext = AUDIO_EXT_MAP[file.type] ?? "mp3";
  const filename = `${randomBytes(12).toString("hex")}.${ext}`;
  const absPath = path.join(abs, filename);

  if (!absPath.startsWith(abs + path.sep)) {
    return { ok: false, error: "مسار غير صالح" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);

  return { ok: true, url: `/uploads/sounds/${filename}` };
}

export async function deleteUploadedAudio(url: string | null): Promise<void> {
  if (!url || !url.startsWith("/uploads/sounds/")) return;
  const filename = url.split("/").pop();
  if (!filename) return;
  const abs = path.join(PUBLIC_DIR, "uploads", "sounds");
  const absPath = path.join(abs, filename);
  if (!absPath.startsWith(abs + path.sep)) return;
  try { await unlink(absPath); } catch { /* الملف غير موجود */ }
}
