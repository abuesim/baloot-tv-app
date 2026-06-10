import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { generateUniqueTvCode } from "@/lib/baloot";

const schema = z.object({
  username: z
    .string()
    .min(3, "اسم المستخدم ٣ أحرف على الأقل")
    .max(30, "اسم المستخدم طويل جداً")
    .regex(/^[a-z0-9_]+$/, "حروف إنجليزية صغيرة وأرقام و _ فقط"),
  displayName: z
    .string()
    .min(2, "اسم العرض حرفان على الأقل")
    .max(60, "اسم العرض طويل جداً"),
  password: z
    .string()
    .min(4, "كلمة السر ٤ أحرف على الأقل")
    .max(100),
  phone: z
    .string()
    .min(9, "رقم الجوال غير صحيح")
    .max(15, "رقم الجوال غير صحيح")
    .regex(/^[0-9+\s-]+$/, "رقم الجوال يحتوي أرقاماً فقط"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse({
    username:    String(body?.username    ?? "").toLowerCase().trim(),
    displayName: String(body?.displayName ?? "").trim(),
    password:    String(body?.password    ?? ""),
    phone:       String(body?.phone       ?? "").trim(),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const { username, displayName, password, phone } = parsed.data;

  // تحقق من عدم تكرار اسم المستخدم
  const exists = await db.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json(
      { error: "اسم المستخدم محجوز، اختر اسماً آخر" },
      { status: 409 },
    );
  }

  const tvCode = await generateUniqueTvCode(async (c) => {
    const found = await db.user.findUnique({ where: { tvCode: c } });
    return found !== null;
  });

  // الحساب الجديد: active = false — لا يستطيع الدخول حتى يفعّله الأدمن
  await db.user.create({
    data: {
      username,
      displayName,
      passwordHash: await hashPassword(password),
      phone,
      active: false,
      tvCode,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
