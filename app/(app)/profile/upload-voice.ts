// رفع مقطع صوتي عبر مسار API (يتفادى حد جسم الـ Server Action ~١ ميجا)
export async function uploadVoiceClip(
  key: string,
  dataUri: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/voice-clip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, dataUri }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d?.ok) return { ok: false, error: d?.error ?? "فشل الرفع" };
    return { ok: true };
  } catch {
    return { ok: false, error: "تعذّر الاتصال بالخادم" };
  }
}
