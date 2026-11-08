'use client'

import { useEffect, useRef, useState } from 'react'
import type { CurrentBusiness } from '../business-profile/useCurrentBusiness'
import { PaymentCardSettingsPanel, PaymentCardSettingsSkeleton } from './PaymentCardSettingsPanel'

export function DeferredPaymentCard({ business }: { business?: CurrentBusiness }) {
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

    return <div ref={containerRef}>{shouldRender ? <PaymentCardSettingsPanel business={business} /> : <PaymentCardSettingsSkeleton />}</div>
}
