import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./docs/legal/**/*'],
  },
};

export default nextConfig;
