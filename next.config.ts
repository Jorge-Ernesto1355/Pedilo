import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./docs/legal/**/*'],
  },
};

export default withSentryConfig(nextConfig, {
  org: "pedilo-70",
  project: "pedilo-frontend",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
