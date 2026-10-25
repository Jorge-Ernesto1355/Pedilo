import * as Sentry from '@sentry/nextjs'

Sentry.init({
    // Next.js only exposes NEXT_PUBLIC_* variables to the browser bundle.
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
