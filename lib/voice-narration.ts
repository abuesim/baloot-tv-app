// منطق النشرة الصوتية — لبنات الأرقام والكلمات وتركيب الجملة
// (دوال نقية — تُستخدم في الاستوديو وفي الحاسبة)

export type ClipDef = { key: string; text: string; label: string };

const UNITS = ["صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS: Record<number, string> = {
  20: "عشرون", 30: "ثلاثون", 40: "أربعون", 50: "خمسون",
  60: "ستون", 70: "سبعون", 80: "ثمانون", 90: "تسعون",
};

// مجموعات العناصر كما تظهر في لوحة التحكم
export const VOICE_GROUPS: { title: string; clips: ClipDef[] }[] = [
  {
    title: "الكلمات",
    clips: [
      { key: "w_us", text: "لنا", label: "لنا" },
      { key: "w_them", text: "لهم", label: "لهم" },
      { key: "w_total", text: "المجموع", label: "المجموع" },
      { key: "w_win", text: "الفوز", label: "الفوز" },
      { key: "w_and", text: "و", label: "و (حرف الوصل)" },
    ],
  },
  {
    title: "الأرقام ٠–٩",
    clips: UNITS.map((t, i) => ({ key: `n${i}`, text: t, label: `${i} — ${t}` })),
  },
  {
    title: "الأرقام ١٠–١٩",
    clips: TEENS.map((t, i) => ({ key: `n${i + 10}`, text: t, label: `${i + 10} — ${t}` })),
  },
  {
    title: "العشرات",
    clips: Object.entries(TENS).map(([n, t]) => ({ key: `n${n}`, text: t, label: `${n} — ${t}` })),
  },
  {
    title: "المئة",
    clips: [{ key: "n100", text: "مئة", label: "100 — مئة" }],
  },
];

// خريطة مفتاح → نص (للرجوع إلى الصوت الآلي عند غياب المقطع)
export const CLIP_TEXT: Record<string, string> = Object.fromEntries(
  VOICE_GROUPS.flatMap((g) => g.clips.map((c) => [c.key, c.text])),
);

export const ALL_CLIP_KEYS = VOICE_GROUPS.flatMap((g) => g.clips.map((c) => c.key));

/** يحوّل رقماً (٠–١٩٩) إلى سلسلة مفاتيح لبنات بصوت عربي مقبول */
export function numberToClips(n: number): string[] {
  if (!Number.isFinite(n) || n <= 0) return ["n0"];
  if (n < 20) return [`n${n}`];
  if (n < 100) {
    const t = Math.floor(n / 10) * 10;
    const u = n % 10;
    return u === 0 ? [`n${t}`] : [`n${u}`, "w_and", `n${t}`];
  }
  // 100–199 (وما فوق نادراً)
  const rem = n - 100;
  return rem === 0 ? ["n100"] : ["n100", "w_and", ...numberToClips(rem)];
}

/** نشرة الجولة: «لنا X.. لهم Y» */
export function scoreSequence(t1: number, t2: number): string[] {
  return ["w_us", ...numberToClips(t1), "w_them", ...numberToClips(t2)];
}

/** نشرة المجموع: «المجموع.. لنا X.. لهم Y» */
export function totalSequence(t1: number, t2: number): string[] {
  return ["w_total", "w_us", ...numberToClips(t1), "w_them", ...numberToClips(t2)];
}
