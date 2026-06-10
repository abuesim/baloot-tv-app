import { db } from "@/lib/db";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";
// نسمح للاتصال بالبقاء أطول مدة ممكنة على Vercel
export const maxDuration = 60;

const USER_TV_SELECT = {
  id: true,
  displayName: true,
  tvOrientation: true,
  tvAccentColor: true,
  tvShowRounds: true,
  tvShowChat: true,
  tvChatUrl: true,
  tvShowDonations: true,
  tvDonationUrl: true,
  tvShowAlert: true,
  tvAlertUrl: true,
  tvStreamlabsToken: true,
  tvAlertSound: true,
  tvRefreshSeconds: true,
} as const;

type GameRow = Awaited<ReturnType<typeof getCurrentGameForUser>>;

async function getCurrentGameForUser(userId: string) {
  return db.game.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    include: {
      participants: { include: { player: true } },
      rounds: { orderBy: { number: "asc" } },
    },
  });
}

// بصمة مختصرة لحالة الصكة — نكتشف أي تغيّر بمقارنتها
function gameSignature(g: GameRow): string {
  if (!g) return "none";
  return [
    g.id,
    g.team1Score,
    g.team2Score,
    g.winner,
    g.status,
    g.rounds.length,
  ].join(":");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const user = await db.user.findUnique({
    where: { tvCode: code },
    select: USER_TV_SELECT,
  });
  if (!user) return new Response("Not found", { status: 404 });

  const initialGame = await getCurrentGameForUser(user.id);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      function send(data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      }

      // الحالة المبدئية
      send({ type: "init", user, game: initialGame });

      // نحتفظ بآخر بصمة معروفة حتى لا نرسل تكراراً بلا داعي
      let lastSig = gameSignature(initialGame);

      // ① اشتراك الذاكرة — تحديث فوري إذا صادف نفس نسخة السيرفر
      const unsubscribe = subscribe(`tv:user:${user.id}`, (data) => {
        // لو وصل حدث صكة، حدّث البصمة حتى لا يكرّره الـ polling
        const d = data as { type?: string; game?: GameRow };
        if (d?.type === "game") lastSig = gameSignature(d.game ?? null);
        send(data);
      });

      // ② polling قاعدة البيانات — يعمل عبر كل نسخ السيرفر (الحل الأساسي على Vercel)
      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const g = await getCurrentGameForUser(user.id);
          const sig = gameSignature(g);
          if (sig !== lastSig) {
            lastSig = sig;
            if (g) send({ type: "game", game: g });
            else send({ type: "init", user, game: null });
          }
        } catch {
          // تجاهل أخطاء الاستعلام المؤقتة
        }
      }, 2000);

      // نبضة إبقاء الاتصال حياً
      const ping = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          closed = true;
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(poll);
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
