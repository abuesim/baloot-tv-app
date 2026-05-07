import Link from "next/link";
import { canManageAds, requireUser, ROLE_LABEL } from "@/lib/auth";
import ProfileTabs from "./ProfileTabs";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireUser();
  const showStudio = canManageAds(me.role);
  // تبويب المساعد: فقط لصانعي المحتوى (وليس للمستخدم الفرعي نفسه)
  const showSubUser = me.role === "CONTENT_CREATOR" && !me.parentUserId;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-1">ملفي الشخصي</h1>
        <p className="text-white/60">
          @{me.username} ·{" "}
          <span className="text-gold">{ROLE_LABEL[me.role]}</span>
        </p>
      </div>

      <ProfileTabs showStudio={showStudio} showSubUser={showSubUser} />

      {children}
    </div>
  );
}
