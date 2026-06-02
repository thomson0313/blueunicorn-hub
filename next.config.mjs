/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Custom server.ts + Socket.IO locally; HTTP polling on Vercel serverless.
    NEXT_PUBLIC_REALTIME_MODE: process.env.VERCEL ? "polling" : "socket",
  },
};

export default nextConfig;
