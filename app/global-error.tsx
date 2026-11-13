'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import { PediloErrorScreen } from './components/PediloErrorScreen'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        posthog.captureException(error)
    }, [error])

    return (
        <html lang="es">
            <body className="m-0">
                <PediloErrorScreen reset={reset} fullPage />
            </body>
        </html>
    )
}
