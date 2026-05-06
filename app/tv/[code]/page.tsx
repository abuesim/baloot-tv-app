import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import TvBoard from "./TvBoard";

export default async function TvPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const user = await db.user.findUnique({
    where: { tvCode: code },
    select: {
      id: true,
      displayName: true,
      tvOrientation: true,
      tvAccentColor: true,
      tvShowRounds: true,
      tvShowChat: true,
      tvChatUrl: true,
      tvShowDonations: true,
      tvDonationUrl: true,
    },
  });
  if (!user) notFound();

  // نعرض فقط المباريات الجارية — المنتهية لا تظهر على الشاشة
  const game = await db.game.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    include: {
      participants: { include: { player: true } },
      rounds: { orderBy: { number: "asc" } },
    },
  });

  // جلب الإعلانات هنا وتمريرها لـ TvBoard حتى تتدوّر معه في وضع الطولي
  const banners = await db.adBanner.findMany({
    where: {
      active: true,
      OR: [{ userId: null }, { userId: user.id }],
    },
    orderBy: { order: "asc" },
    select: { id: true, imageUrl: true, text: true, linkUrl: true },
  });

  return (
    <TvBoard
      initialGame={game}
      initialUser={user}
      code={code}
      banners={banners}
    />
  );
}
