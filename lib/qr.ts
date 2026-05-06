import QRCode from "qrcode";

/**
 * توليد QR كـ SVG inline (يتعامل مع التكبير بدون فقدان جودة).
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#f5b042", // الذهبي
      light: "#1a2244", // الأزرق الداكن
    },
    errorCorrectionLevel: "M",
    width: 256,
  });
}
