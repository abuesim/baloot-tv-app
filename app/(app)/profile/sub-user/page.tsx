import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import SubUserSection from "./SubUserSection";

export default async function SubUserPage() {
  const me = await requireUser();

  // هذه الصفحة لصانعي المحتوى فقط (وليس المستخدم الفرعي نفسه)
  if (me.role !== "CONTENT_CREATOR" || me.parentUserId) {
    redirect("/profile");
  }

  const subUser = await db.user.findFirst({
    where: { parentUserId: me.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      active: true,
      subCanStartGame: true,
      subCanAddPlayers: true,
      subCanViewHistory: true,
      subCanViewStats: true,
    },
  });

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <h2 className="text-lg font-bold">المستخدم الفرعي</h2>
        <p className="text-sm text-white/50">
          حساب مساعد مرتبط بحسابك — اسمه دائماً{" "}
          <span className="text-gold font-bold" dir="ltr">{me.username}-</span>
        </p>
      </div>

      <SubUserSection
        creatorUsername={me.username}
        subUser={subUser}
      />
    </div>
  );
}
