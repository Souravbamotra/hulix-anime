/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
