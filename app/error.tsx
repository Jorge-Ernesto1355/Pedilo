'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { PediloErrorScreen } from './components/PediloErrorScreen'

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        posthog.captureException(error)
    }, [error])

    return <PediloErrorScreen reset={reset} />
}
