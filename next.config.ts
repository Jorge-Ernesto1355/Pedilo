import type { NextConfig } from 'next'
import { withPostHogConfig } from '@posthog/nextjs-config'
import { withSentryConfig } from '@sentry/nextjs/config'

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
        // PostHog's browser SDK needs public values. Keep the Vercel-facing
        // variables short while exposing them under Next's client-safe names.
        NEXT_PUBLIC_POSTHOG_KEY:
            process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
        NEXT_PUBLIC_POSTHOG_HOST:
            process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '',
    },
    outputFileTracingIncludes: {
        '/*': ['./docs/legal/**/*'],
    },
}

const sentryConfig = withSentryConfig(nextConfig, {
    org: 'pedilo-70',
    project: 'pedilo-frontend',
    silent: !process.env.CI,
    widenClientFileUpload: true,
    sourcemaps: {
        deleteSourcemapsAfterUpload: true,
    },
})

export default withPostHogConfig(sentryConfig, {
    personalApiKey: process.env.POSTHOG_API_KEY ?? '',
    projectId: process.env.POSTHOG_PROJECT_ID,
    host: process.env.POSTHOG_HOST,
    sourcemaps: {
        enabled: Boolean(
            process.env.POSTHOG_API_KEY?.startsWith('phx_') && process.env.POSTHOG_PROJECT_ID,
        ),
        deleteAfterUpload: true,
    },
})
