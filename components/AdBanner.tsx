import { db } from "@/lib/db";
import { ImageCarousel } from "./ImageCarousel";

/**
 * @param ownerId — معرّف المستخدم المملوك له السياق (مثلاً صاحب المباراة).
 *   لو null/undefined: تظهر فقط الإعلانات العامة (للأدمن، userId = null).
 *   لو موجود: تظهر الإعلانات العامة + إعلانات المستخدم نفسه.
 */
export async function AdBanner({ ownerId }: { ownerId?: string | null }) {
  const banners = await db.adBanner.findMany({
    where: {
      active: true,
      OR: ownerId
        ? [{ userId: null }, { userId: ownerId }]
        : [{ userId: null }],
    },
    orderBy: { order: "asc" },
  });
  if (banners.length === 0) return null;

  const imageBanners = banners.filter((b) => b.imageUrl);
  const textBanners = banners.filter((b) => b.text);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      {imageBanners.length > 0 && (
        <ImageCarousel
          banners={imageBanners.map((b) => ({
            id: b.id,
            imageUrl: b.imageUrl!,
            linkUrl: b.linkUrl,
            text: b.text,
          }))}
        />
      )}
      {textBanners.length > 0 && <TextMarquee banners={textBanners} />}
    </div>
  );
}

function TextMarquee({
  banners,
}: {
  banners: { id: string; text: string | null; linkUrl: string | null }[];
}) {
  const items = [...banners, ...banners];
  return (
    <div className="bg-gold/95 text-navy-deep py-2 overflow-hidden whitespace-nowrap shadow-lg">
      <div className="inline-flex animate-marquee gap-12 font-bold text-sm">
        {items.map((b, i) => {
          const content = (
            <span className="px-6 inline-flex items-center gap-2">
              <span className="opacity-50">📢</span>
              {b.text}
            </span>
          );
          return b.linkUrl ? (
            <a
              key={`${b.id}-${i}`}
              href={b.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          ) : (
            <span key={`${b.id}-${i}`}>{content}</span>
          );
        })}
      </div>
    </div>
  );
}
