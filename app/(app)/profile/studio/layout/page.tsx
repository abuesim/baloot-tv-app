import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canManageAds, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeTvLayout } from "@/lib/tv-layout";
import StudioTabs from "../StudioTabs";
import TvLayoutEditor from "./TvLayoutEditor";

export default async function TvLayoutPage() {
  const me = await requireUser();
  if (!canManageAds(me.role)) redirect("/profile");
  const user = await db.user.findUnique({
    where: { id: me.id },
    select: { tvLayout: true, tvAccentColor: true, tvCode: true },
  });
  if (!user) return null;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const tvUrl = user.tvCode ? `${proto}://${host}/tv/${user.tvCode}` : null;

  return (
    <div className="space-y-6">
      <StudioTabs />
      <TvLayoutEditor
        initialLayout={normalizeTvLayout(user.tvLayout, user.tvAccentColor)}
        accent={user.tvAccentColor}
        tvUrl={tvUrl}
      />
    </div>
  );
}
