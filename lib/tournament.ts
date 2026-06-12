// منطق توليد البطولات (دوال نقية — بدون قاعدة بيانات)

export type BracketSeed = {
  round: number; // 1 = الدور الأول ... R = النهائي
  position: number; // الموقع داخل الدور
  teamAId: string | null;
  teamBId: string | null;
  parentPosition: number | null; // الموقع في الدور التالي
  parentSlot: 1 | 2 | null; // 1 = خانة الفريق أ / 2 = خانة الفريق ب
};

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * بناء شجرة خروج المغلوب.
 * teamIds مُرتّبة مسبقاً (بعد القرعة).
 * تُوزّع «الباي» بحيث كل مواجهة في الدور الأول فيها فريق واحد (باي) أو فريقان — لا مواجهة فارغة.
 */
export function buildBracketSeeds(teamIds: string[]): BracketSeed[] {
  const T = teamIds.length;
  const size = nextPow2(Math.max(2, T));
  const rounds = Math.log2(size);
  const byes = size - T;
  const seeds: BracketSeed[] = [];

  // الدور الأول: أول «byes» مواجهات فيها فريق واحد، الباقي فريقان
  const firstRoundCount = size / 2;
  let ti = 0;
  for (let m = 0; m < firstRoundCount; m++) {
    let a: string | null = null;
    let b: string | null = null;
    if (m < byes) {
      a = teamIds[ti++] ?? null; // باي — فريق واحد يتأهل تلقائياً
    } else {
      a = teamIds[ti++] ?? null;
      b = teamIds[ti++] ?? null;
    }
    seeds.push({
      round: 1,
      position: m,
      teamAId: a,
      teamBId: b,
      parentPosition: Math.floor(m / 2),
      parentSlot: m % 2 === 0 ? 1 : 2,
    });
  }

  // الأدوار التالية (فارغة، تُملأ بالتأهل)
  for (let r = 2; r <= rounds; r++) {
    const count = size / Math.pow(2, r);
    const isFinal = r === rounds;
    for (let m = 0; m < count; m++) {
      seeds.push({
        round: r,
        position: m,
        teamAId: null,
        teamBId: null,
        parentPosition: isFinal ? null : Math.floor(m / 2),
        parentSlot: isFinal ? null : m % 2 === 0 ? 1 : 2,
      });
    }
  }

  return seeds;
}

/**
 * جدول الدوري الكامل (الكل ضد الكل) بطريقة الدائرة — توزيع متوازن على جولات.
 * يُرجع مصفوفة مواجهات بأرقام جولات.
 */
export function buildRoundRobin(
  teamIds: string[],
): { round: number; position: number; teamAId: string; teamBId: string }[] {
  const arr: (string | null)[] = [...teamIds];
  if (arr.length % 2 === 1) arr.push(null); // باي وهمي للجولة
  const n = arr.length;
  const out: { round: number; position: number; teamAId: string; teamBId: string }[] = [];

  for (let r = 0; r < n - 1; r++) {
    let pos = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) {
        out.push({ round: r + 1, position: pos++, teamAId: a, teamBId: b });
      }
    }
    // تدوير: نثبّت العنصر الأول وندوّر الباقي
    arr.splice(1, 0, arr.pop()!);
  }

  return out;
}

/** ترتيب الفرق حسب: الأكثر فوزاً ← الأقل خسارة ← آخر من فاز */
export function rankStandings<
  T extends { wins: number; losses: number; lastWinAt: Date | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    const ta = a.lastWinAt ? a.lastWinAt.getTime() : 0;
    const tb = b.lastWinAt ? b.lastWinAt.getTime() : 0;
    return tb - ta;
  });
}
