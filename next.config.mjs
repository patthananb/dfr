/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a standalone server.js so the Docker runtime image can ship only the
  // files it actually needs instead of the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
