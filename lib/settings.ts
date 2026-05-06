import { db } from "./db";

/**
 * يجلب إعدادات التطبيق (أو ينشئها بالقيم الافتراضية لو غير موجودة).
 * صف واحد دائماً (id = 1).
 */
export async function getSettings() {
  const existing = await db.appSetting.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return db.appSetting.create({
    data: { id: 1 }, // الباقي قيم افتراضية من الـ schema
  });
}

export async function updateSettings(data: {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  defaultTargetScore?: number;
  appName?: string;
  appTagline?: string;
}) {
  return db.appSetting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
}
