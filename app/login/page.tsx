import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/Logo";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/home");

  const settings = await getSettings();

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <Logo size="lg" text={settings.appName} />
          <p className="text-white/50 mt-3 text-sm">{settings.appTagline}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
