import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { LogoutButton } from "@/components/LogoutButton";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settings = await getSettings();

  // وضع الصيانة
  if (settings.maintenanceMode && user.role !== "ADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <div className="text-6xl mb-4">🛠️</div>
          <h1 className="text-2xl font-bold mb-3">{settings.maintenanceMessage}</h1>
          <LogoutButton className="text-sm text-white/40 underline" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        appName={settings.appName}
        displayName={user.displayName}
        isAdmin={user.role === "ADMIN"}
      />

      <MobileBottomNav />

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
