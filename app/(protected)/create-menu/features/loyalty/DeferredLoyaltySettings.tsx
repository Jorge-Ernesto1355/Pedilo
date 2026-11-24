'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { CurrentBusiness } from '../business-profile/useCurrentBusiness'
import { LoyaltySettingsSkeleton } from './LoyaltySettingsSkeleton'

// El editor de la tarjeta se descarga como un bloque aparte y solo cuando la sección se
// acerca a la pantalla, para no engordar la carga inicial de Ajustes.
const LoyaltySettingsPanel = dynamic(
    () => import('./LoyaltySettingsPanel').then((module) => module.LoyaltySettingsPanel),
    { ssr: false, loading: () => <LoyaltySettingsSkeleton /> },
)

export function DeferredLoyaltySettings({ business }: { business?: CurrentBusiness }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [shouldRender, setShouldRender] = useState(false)

    useEffect(() => {
        if (shouldRender) return
        const element = containerRef.current
        if (!element) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return
                setShouldRender(true)
                observer.disconnect()
            },
            { rootMargin: '200px 0px', threshold: 0 },
        )
        observer.observe(element)
        return () => observer.disconnect()
    }, [shouldRender])

    return (
        <div ref={containerRef} id="tarjeta-de-lealtad">
            {shouldRender ? (
                <LoyaltySettingsPanel business={business} />
            ) : (
                <LoyaltySettingsSkeleton />
            )}
        </div>
    )
}
