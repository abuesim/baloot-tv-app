"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateSettings } from "@/lib/settings";

const schema = z.object({
  appName: z.string().min(1).max(50),
  appTagline: z.string().max(150),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(300),
  defaultTargetScore: z.number().int().min(50).max(500),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateSettingsAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse({
    appName: String(formData.get("appName") ?? "").trim(),
    appTagline: String(formData.get("appTagline") ?? "").trim(),
    maintenanceMode: formData.get("maintenanceMode") === "on",
    maintenanceMessage: String(formData.get("maintenanceMessage") ?? "").trim(),
    defaultTargetScore: Number(formData.get("defaultTargetScore")),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  await updateSettings(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}
