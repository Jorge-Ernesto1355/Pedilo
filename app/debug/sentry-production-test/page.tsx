import { notFound } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { SentryProductionTest } from './SentryProductionTest'

export default async function SentryProductionTestPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>
}) {
    const { token } = await searchParams
    const expectedToken = process.env.SENTRY_PRODUCTION_TEST_TOKEN
    const isVercelPreview = process.env.VERCEL_ENV === 'preview'

    if (
        process.env.NODE_ENV !== 'production' ||
        isVercelPreview ||
        !expectedToken ||
        token !== expectedToken
    ) {
        notFound()
    }

    Sentry.captureException(new Error('PEDILO_SENTRY_SERVER_PRODUCTION_TEST'))
    Sentry.captureMessage('PEDILO_SENTRY_SERVER_PRODUCTION_MESSAGE_TEST', 'error')
    const serverQueueFlushed = await Sentry.flush(5000)

    return <SentryProductionTest serverQueueFlushed={serverQueueFlushed} />
}
