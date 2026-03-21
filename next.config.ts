import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "react-globe.gl", "three-globe"],
};

export default nextConfig;
