'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'

const TEST_MARKER = 'PEDILO_SENTRY_PRODUCTION_TEST'
const MESSAGE_MARKER = 'PEDILO_SENTRY_PRODUCTION_MESSAGE_TEST'

export function SentryProductionTest({
    serverQueueFlushed,
}: {
    serverQueueFlushed: boolean
}) {
    const [status, setStatus] = useState('Preparando la prueba…')

    useEffect(() => {
        const initialized = Sentry.isInitialized()

        if (initialized) {
            Sentry.captureException(new Error(TEST_MARKER))
            Sentry.captureMessage(MESSAGE_MARKER, 'error')
        }

        void Sentry.flush(5000).then((flushed) => {
            setStatus(
                !initialized
                    ? 'Sentry no está inicializado en el navegador.'
                    : flushed
                    ? `Cola servidor: ${serverQueueFlushed ? 'vacía' : 'pendiente'}; cola navegador: vacía. Confirma los cuatro marcadores en Sentry; flush no confirma su recepción.`
                    : `Cola servidor: ${serverQueueFlushed ? 'vacía' : 'pendiente'}; la cola del navegador no terminó antes del límite. Confirma los marcadores en Sentry; flush no confirma su recepción.`,
            )
        })
    }, [serverQueueFlushed])

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center text-slate-900">
            <p>{status}</p>
        </main>
    )
}
