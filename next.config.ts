import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this, Turbopack walks up past the repo looking for a lockfile and
  // picks up an unrelated one from the home directory.
  turbopack: {
    root: path.join(import.meta.dirname, "."),
  },
};

export default nextConfig;
