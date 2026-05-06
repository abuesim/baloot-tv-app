import { getSettings } from "@/lib/settings";
import SettingsForm from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold mb-1">الإعدادات</h1>
        <p className="text-white/60">إعدادات عامة للتطبيق</p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
