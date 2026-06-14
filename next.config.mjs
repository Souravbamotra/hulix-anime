/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.anilist.co",
      },
    ],
    qualities: [75],
  },
};

export default nextConfig;
