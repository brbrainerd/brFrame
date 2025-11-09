/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  turbopack: {},
};

export default nextConfig;
