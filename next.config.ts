import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  env: {
    // Vercel currently has the VITE_* names configured. These values are public
    // by design for a browser Sentry DSN and are copied at build time.
    NEXT_PUBLIC_SENTRY_DSN:
      process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN ?? '',
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
      process.env.VITE_SENTRY_ENVIRONMENT ??
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
