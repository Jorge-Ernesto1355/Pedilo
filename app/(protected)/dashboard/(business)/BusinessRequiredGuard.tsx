'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentBusiness } from '@/app/(protected)/create-menu/features/business-profile/useCurrentBusiness'
import { RedirectedUrls } from '@/src/lib/RedirectUrls'

// Equivalente cliente de requireCurrentBusiness para navegaciones internas: lee el
// negocio ya sembrado en React Query (staleTime infinito), así que no hay petición.
export function BusinessRequiredGuard() {
    const router = useRouter()
    const { isSuccess, data } = useCurrentBusiness()
    const missing = isSuccess && data === null

    useEffect(() => {
        if (missing) router.replace(`${RedirectedUrls.createMenu}?notice=business-required`)
    }, [missing, router])

    return null
}
