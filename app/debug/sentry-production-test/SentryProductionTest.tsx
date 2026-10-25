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

        const sentryTestKey = 'pedilo-sentry-production-test-sent'
        if (window.sessionStorage.getItem(sentryTestKey)) {
            setStatus('La prueba ya fue enviada en esta sesión del navegador.')
            return
        }

        window.sessionStorage.setItem(sentryTestKey, '1')
        Sentry.captureException(new Error(TEST_MARKER))
        void Sentry.flush(5000).then(() => {
            setStatus('Evento enviado. Confirma PEDILO_SENTRY_PRODUCTION_TEST en Sentry.')
        })
    }, [])

    return (
        <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center text-slate-900">
            <p>{status}</p>
        </main>
    )
}
