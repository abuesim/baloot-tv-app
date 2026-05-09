import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * خادم وسيط للـ iframes الخاصة بالتراكبات (Streamlabs / StreamElements / إلخ)
 *
 * المشكلة: خدمات البث تضع رأس X-Frame-Options أو CSP frame-ancestors
 *          مما يمنع المتصفح من تحميلها داخل iframe عادي.
 *          OBS Browser Source لا يُطبّق هذه القيود، لذا يعمل هناك.
 *
 * الحل: نجلب المحتوى من الخادم ونحذف رؤوس الحجب قبل إرساله للمتصفح.
 */

const ALLOWED_HOSTS = [
  // ── Streamlabs / StreamElements ──
  "streamlabs.com",
  "streamelements.com",
  "cdn.streamelements.com",
  // ── KapChat / NightDev ──
  "nightdev.com",
  "kapchat.nightdev.com",
  // ── TikTok ──
  "tiktok.com",
  "www.tiktok.com",
  "live.tiktok.com",
  // ── TikTok Chat Overlays ──
  "tikfinity.zerody.one",
  "streamticker.com",
  "tiktoklivechat.com",
  "ownchat.me",
  "own3d.pro",
  "app.own3d.pro",
  "streamchat.live",
  "chat.overlay.gg",
  "overlay.gg",
  "touch.tiktok.com",
  "webcast.tiktok.com",
  // ── Local / custom ──
  "overlay.creators.sa",
];

function isAllowed(rawUrl: string): boolean {
  try {
    const { hostname, protocol } = new URL(rawUrl);
    if (protocol !== "https:") return false;
    return ALLOWED_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");

  if (!target) return new Response("Missing url", { status: 400 });
  if (!isAllowed(target))
    return new Response("Domain not allowed", { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        // نتظاهر بأننا متصفح عادي حتى لا يرفض الخادم الطلب
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
  } catch {
    return new Response("Proxy fetch error", { status: 502 });
  }

  // نبني رؤوس الاستجابة ونحذف كل ما يمنع التضمين
  const out = new Headers();

  const ct = upstream.headers.get("content-type");
  if (ct) out.set("content-type", ct);
  out.set("cache-control", "no-cache, no-store");

  // X-Frame-Options — نحذفه تماماً (لا نمرره للمتصفح)
  // Content-Security-Policy — نحذفه كلياً لأنه قد يحتوي على script-src 'self'
  // أو default-src 'self' يمنع تحميل الملفات من الـ domain الأصلي بعد الـ proxy
  // (الأمان محفوظ لأن الـ ALLOWED_HOSTS يقصر الطلبات على نطاقات موثوقة)

  // لو الاستجابة HTML — نحقن <base> لإصلاح الـ relative URLs
  // بدونها تُحمَّل الملفات من domain خادمنا بدل overlay.creators.sa
  if (ct?.includes("text/html")) {
    const html = await upstream.text();
    const origin = new URL(target).origin;
    // نحقن <base href="..."> مباشرةً بعد <head> أو في بداية الصفحة
    const fixed = /<head/i.test(html)
      ? html.replace(/(<head[^>]*>)/i, `$1<base href="${origin}/">`)
      : `<base href="${origin}/">${html}`;
    out.set("content-type", "text/html; charset=utf-8");
    return new Response(fixed, { status: upstream.status, headers: out });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
