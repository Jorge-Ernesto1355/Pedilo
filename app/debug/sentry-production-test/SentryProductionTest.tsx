'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'

const TEST_MARKER = 'PEDILO_SENTRY_PRODUCTION_TEST'

export function SentryProductionTest() {
    const [status, setStatus] = useState('Preparando la prueba…')

    useEffect(() => {
        if (!Sentry.isInitialized()) {
            setStatus('Sentry no está inicializado en el navegador.')
            return
        }

        Sentry.captureException(new Error(TEST_MARKER))
        void Sentry.flush(5000).then((flushed) => {
            setStatus(
                flushed
                    ? 'Evento enviado. Confirma PEDILO_SENTRY_PRODUCTION_TEST en Sentry.'
                    : 'Sentry recibió el evento para envío, pero no confirmó el vaciado antes del límite de espera.',
            )
        })
    }, [])

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center text-slate-900">
            <p>{status}</p>
        </main>
    )
}
