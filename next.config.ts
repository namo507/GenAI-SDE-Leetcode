import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 writes a plain static site to .next-export/ for any static
 * host, in its own folder so it never disturbs a running `next start`.
 * STATIC_ASSET_PREFIX (for example "/assets") serves the JS, CSS and fonts from
 * <prefix>/_next/ for hosts that cannot publish paths starting with "_".
 */
const staticExport = Boolean(process.env.STATIC_EXPORT);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(staticExport
    ? { output: "export", distDir: ".next-export", assetPrefix: process.env.STATIC_ASSET_PREFIX || undefined }
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
