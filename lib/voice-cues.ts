// التوجيهات الصوتية — مؤثرات تشتغل عند شروط معيّنة في الصكة
// (دوال نقية — تُستخدم في الاستوديو وفي الحاسبة)

export type CueDef = {
  key: string;
  label: string;
  desc: string;
};

export const VOICE_CUES: CueDef[] = [
  {
    key: "cue_diff35",
    label: "فرق كبير (٣٥+)",
    desc: "عند بلوغ الفرق بين الفريقين ٣٥ نقطة فأكثر",
  },
  {
    key: "cue_diff40",
    label: "فرق كبير (٤٠+)",
    desc: "عند بلوغ الفرق بين الفريقين ٤٠ نقطة فأكثر",
  },
  {
    key: "cue_diff50",
    label: "فرق كبير (٥٠+)",
    desc: "عند بلوغ الفرق بين الفريقين ٥٠ نقطة فأكثر",
  },
  {
    key: "cue_zero_twice",
    label: "صفر مرتين متتاليتين",
    desc: "عند تسجيل لنا أو لهم صفراً في جولتين متتاليتين",
  },
  {
    key: "cue_cross99",
    label: "تجاوز ١٠٠",
    desc: "فريق تجاوز ١٠٠ والفريق الثاني ما زال تحت ١٠٠",
  },
  {
    key: "cue_time10",
    label: "بعد ١٠ دقائق",
    desc: "مرور ١٠ دقائق على بداية الصكة",
  },
];

export const CUE_KEYS = VOICE_CUES.map((c) => c.key);

/** التوجيهات المرتبطة بتغيّر النتيجة — يُرجع المفاتيح التي يجب تشغيلها (حافة الانتقال) */
export function evaluateScoreCues(
  prev: { t1: number; t2: number },
  next: { t1: number; t2: number },
  currentRound?: { t1: number; t2: number },
  previousRound?: { t1: number; t2: number },
): string[] {
  const fired: string[] = [];

  // مؤثرات الفرق المنفصلة؛ عند تجاوز عدة حدود في جولة واحدة يعمل أعلى حد فقط
  const prevDiff = Math.abs(prev.t1 - prev.t2);
  const nextDiff = Math.abs(next.t1 - next.t2);
  const crossedDiffCue = [
    { threshold: 50, key: "cue_diff50" },
    { threshold: 40, key: "cue_diff40" },
    { threshold: 35, key: "cue_diff35" },
  ].find(({ threshold }) => prevDiff < threshold && nextDiff >= threshold);
  if (crossedDiffCue) fired.push(crossedDiffCue.key);

  // نفس الفريق سجّل صفراً في جولتين متتاليتين
  if (
    currentRound &&
    previousRound &&
    ((currentRound.t1 === 0 && previousRound.t1 === 0) ||
      (currentRound.t2 === 0 && previousRound.t2 === 0))
  ) {
    fired.push("cue_zero_twice");
  }

  // فريق بلغ ١٠٠ فأكثر والآخر تحته
  const crossed = (a: number, b: number) => a >= 100 && b < 100;
  const wasCrossed = crossed(prev.t1, prev.t2) || crossed(prev.t2, prev.t1);
  const isCrossed = crossed(next.t1, next.t2) || crossed(next.t2, next.t1);
  if (!wasCrossed && isCrossed) fired.push("cue_cross99");

  return fired;
}

/** مدة التوجيه الزمني بالملّي ثانية */
export const TIME_CUE_MS = 10 * 60 * 1000; // ١٠ دقائق
