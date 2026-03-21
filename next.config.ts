import type { NextConfig } from "next";
import path from "path";
import CopyPlugin from "copy-webpack-plugin";

const cesiumRoot = path.dirname(require.resolve("cesium/package.json"));
const cesiumBuild = path.join(cesiumRoot, "Build/Cesium");

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            { from: path.join(cesiumBuild, "Workers"), to: "../public/cesium/Workers" },
            { from: path.join(cesiumBuild, "ThirdParty"), to: "../public/cesium/ThirdParty" },
            { from: path.join(cesiumBuild, "Assets"), to: "../public/cesium/Assets" },
            { from: path.join(cesiumBuild, "Widgets"), to: "../public/cesium/Widgets" },
          ],
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
