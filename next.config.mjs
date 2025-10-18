/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "cookie",
            key: "next-auth.session-token",
          },
        ],
        destination: "/",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*",
      },
    ];
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

export default nextConfig;
