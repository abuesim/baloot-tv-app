import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

const schema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { username: parsed.data.username.toLowerCase().trim() },
  });

  if (!user || !user.active) {
    return NextResponse.json(
      { error: "اسم المستخدم أو كلمة السر غير صحيحة" },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "اسم المستخدم أو كلمة السر غير صحيحة" },
      { status: 401 },
    );
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.displayName = user.displayName;
  session.role = user.role;
  await session.save();

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({ ok: true, role: user.role });
}
