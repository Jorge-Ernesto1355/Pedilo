import { notFound } from 'next/navigation'
import { SentryProductionTest } from './SentryProductionTest'

export default async function SentryProductionTestPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>
}) {
    const { token } = await searchParams
    const expectedToken = process.env.SENTRY_PRODUCTION_TEST_TOKEN

    if (process.env.NODE_ENV !== 'production' || !expectedToken || token !== expectedToken) {
        notFound()
    }

    return <SentryProductionTest />
}
