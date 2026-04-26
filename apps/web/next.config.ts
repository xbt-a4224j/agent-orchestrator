import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agent-orchestrator/engine", "@agent-orchestrator/db"],
};

export default nextConfig;
