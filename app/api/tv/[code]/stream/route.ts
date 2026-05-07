import { db } from "@/lib/db";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

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
} as const;

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
      function send(data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // closed
        }
      }

      send({ type: "init", user, game: initialGame });

      const unsubscribe = subscribe(`tv:user:${user.id}`, send);

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // closed
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
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
