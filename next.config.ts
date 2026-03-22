import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "react-globe.gl", "three-globe"],
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
