import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  env: {
    // Sentry's DSN is a public client key. Map the server-side deployment
    // variables into Next's explicitly public names at build time.
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? '',
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      'production',
  },
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
