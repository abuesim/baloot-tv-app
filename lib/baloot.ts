// قواعد لعبة بلوت — منطق مشترك

export type GameMode = "NORMAL" | "MASHDOOD";

export const GAME_MODES = {
  NORMAL: {
    label: "عادي",
    description: "البداية من ٠ والوصول إلى ١٥٢",
    startScore: 0,
    targetScore: 152,
  },
  MASHDOOD: {
    label: "مشدود",
    description: "البداية من ٥٢ والوصول إلى ١٥٢",
    startScore: 52,
    targetScore: 152,
  },
} as const satisfies Record<
  GameMode,
  { label: string; description: string; startScore: number; targetScore: number }
>;

/**
 * تحديد الفائز.
 * - إذا أحد الفريقين وصل الهدف، الفريق الأعلى نقاطاً هو الفائز.
 * - إذا تعادلا عند الهدف، نعتبرها لم تنته (سيناريو نادر).
 */
export function getWinner(
  team1Score: number,
  team2Score: number,
  target: number,
): 1 | 2 | null {
  const reached1 = team1Score >= target;
  const reached2 = team2Score >= target;
  if (!reached1 && !reached2) return null;
  if (team1Score === team2Score) return null;
  return team1Score > team2Score ? 1 : 2;
}

/**
 * النقاط الصغيرة المنفردة (١–١٥ مقابل صفر) تُضم للجولة السابقة
 * بدل إنشاء جولة جديدة. ٠–٠ لا تُسجّل، و١٦ فأكثر جولة مستقلة.
 */
export function shouldMergeWithPreviousRound(team1: number, team2: number): boolean {
  return (
    (team1 === 0 && team2 >= 1 && team2 <= 15) ||
    (team2 === 0 && team1 >= 1 && team1 <= 15)
  );
}

/**
 * إنشاء كود تلفزيون عشوائي من ٦ خانات.
 */
export function generateTvCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * توليد كود تلفزيون فريد (يتحقق من عدم تكراره في DB).
 */
export async function generateUniqueTvCode(
  isUsedFn: (code: string) => Promise<boolean>,
  maxTries = 10,
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const code = generateTvCode();
    if (!(await isUsedFn(code))) return code;
  }
  throw new Error("تعذر توليد كود تلفزيون فريد");
}
