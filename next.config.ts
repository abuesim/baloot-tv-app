import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  
  // ملاحظة: قمنا بإزالة بلوك eslint و typescript لأن النظام الجديد 
  // في Next.js 16 يكتشفها تلقائياً من الملفات المنفصلة
  
  allowedDevOrigins: [
    "192.168.*.*", "10.*.*.*", "172.16.*.*", "172.17.*.*", "172.18.*.*", 
    "172.19.*.*", "172.20.*.*", "172.21.*.*", "172.22.*.*", "172.23.*.*", 
    "172.24.*.*", "172.25.*.*", "172.26.*.*", "172.27.*.*", "172.28.*.*", 
    "172.29.*.*", "172.30.*.*", "172.31.*.*", "*.local",
  ],

  output: 'standalone', 
};

export default nextConfig;