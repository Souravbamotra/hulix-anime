/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.anilist.co",
      },
      {
        protocol: "https",
        hostname: "**.rareanimes.mov",
      },
      {
        protocol: "https",
        hostname: "9anime.org.lv",
      },
    ],
    qualities: [75],
  },

  async headers() {
    // Content-Security-Policy
    // - script-src: 'self' + 'unsafe-eval'/'unsafe-inline' are required by
    //   Next.js client-side hydration and hls.js at runtime.
    // - frame-src: '*' because the player embeds iframes from several third-party
    //   anime providers whose domains can change; the open-proxy allowlist in
    //   proxy-stream/route.js handles the real restriction server-side.
    // - media-src: '*' + blob: for HLS streams (hls.js uses blob URLs).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "frame-src *",
      "connect-src 'self' https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const securityHeaders = [
      // Prevent browsers from MIME-sniffing away from the declared content-type
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Stop referrer from leaking full URLs to third-party origins
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable unnecessary browser features
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      // CSP
      { key: "Content-Security-Policy", value: csp },
    ];

    return [
      // API routes should never be framed
      {
        source: "/api/(.*)",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      // App pages: SAMEORIGIN so that nothing external can frame us, but our
      // own origin can (e.g. if we ever embed a /watch page inside the app).
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;

