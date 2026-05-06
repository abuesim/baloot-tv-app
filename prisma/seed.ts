import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function generateTvCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureUserTvCode(userId: string) {
  for (let i = 0; i < 10; i++) {
    const code = generateTvCode();
    const exists = await db.user.findUnique({ where: { tvCode: code } });
    if (!exists) {
      await db.user.update({ where: { id: userId }, data: { tvCode: code } });
      return code;
    }
  }
  throw new Error("تعذر توليد كود فريد");
}

async function main() {
  // ١. الإعدادات الافتراضية
  await db.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  console.log("✓ إعدادات التطبيق");

  // ٢. حساب الأدمن الأول
  const adminUsername = "admin";
  const adminPassword = "admin123";

  const existing = await db.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existing) {
    const u = await db.user.create({
      data: {
        username: adminUsername,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        displayName: "المدير",
        role: "ADMIN",
      },
    });
    await ensureUserTvCode(u.id);
    console.log("✓ حساب الأدمن أُنشئ");
    console.log("");
    console.log("───────────────────────────────────");
    console.log("  اسم المستخدم: admin");
    console.log("  كلمة السر:   admin123");
    console.log("  ⚠️  غيّر كلمة السر بعد أول دخول!");
    console.log("───────────────────────────────────");
  } else {
    console.log("• حساب الأدمن موجود مسبقاً");
  }

  // ٣. إعلان افتراضي تجريبي
  const adsCount = await db.adBanner.count();
  if (adsCount === 0) {
    await db.adBanner.create({
      data: {
        text: "مرحباً بكم في حاسبة بلوت 🎴",
        active: true,
        order: 0,
      },
    });
    console.log("✓ إعلان تجريبي");
  }

  // ٤. توليد أكواد تلفزيون لكل المستخدمين القدامى اللي ما عندهم كود
  const usersWithoutCode = await db.user.findMany({
    where: { tvCode: null },
    select: { id: true, username: true },
  });
  for (const u of usersWithoutCode) {
    const code = await ensureUserTvCode(u.id);
    console.log(`✓ كود تلفزيون لـ ${u.username}: ${code}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
