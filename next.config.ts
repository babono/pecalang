import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads its WASM/data files relative to its own module URL; letting
  // the bundler rewrite it breaks that path resolution. Keep the DB drivers
  // as real node modules on the server.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
