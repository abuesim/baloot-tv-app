import { db } from "@/lib/db";
import BannersList from "./BannersList";
import NewBannerForm from "./NewBannerForm";

export default async function AdminBannersPage() {
  const banners = await db.adBanner.findMany({
    orderBy: [{ active: "desc" }, { order: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">الإعلانات</h1>
        <p className="text-white/60">شريط الإعلانات السفلي ({banners.length})</p>
      </div>
      <NewBannerForm />
      <BannersList banners={banners} />
    </div>
  );
}
