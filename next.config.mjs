/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@napi-rs/canvas"],
  turbopack: {},
};

export default nextConfig;
