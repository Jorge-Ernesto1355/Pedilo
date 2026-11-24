'use client'

import { useEffect, useRef, useState } from 'react'
import type { DeliveryCoordinates } from './deliverySettingsApi'
import { DeliverySettingsPanel, DeliverySettingsSkeleton } from './DeliverySettingsPanel'

/** Igual que DeferredPaymentCard: el panel (y Leaflet) se monta al acercarse al viewport. */
export function DeferredDeliverySettings(props: {
    locationText?: string
    onOriginSaved?: (origin: DeliveryCoordinates) => void
}) {
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
        <div ref={containerRef}>
            {shouldRender ? <DeliverySettingsPanel {...props} /> : <DeliverySettingsSkeleton />}
        </div>
    )
}
