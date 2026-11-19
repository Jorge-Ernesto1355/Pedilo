'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCurrentBusiness } from './create-menu/features/business-profile/useCurrentBusiness'
import { useBusinessSettings } from './create-menu/features/business-settings/useBusinessSettings'
import { LazyNewRestaurantOrderDrawer } from './dashboard/features/orders/LazyNewRestaurantOrderDrawer'

export function GlobalNewOrderButton() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const isCreateMenu = pathname === '/create-menu'
    const businessQuery = useCurrentBusiness()
    const hasBusiness = Boolean(businessQuery.data)
    const { settings } = useBusinessSettings(isCreateMenu && hasBusiness)
    const hasWhatsapp = Boolean(settings.data?.whatsapp)

    if (pathname === '/dashboard/orders') return null
    // En el onboarding no se puede crear una orden hasta tener negocio y WhatsApp.
    if (isCreateMenu && !(hasBusiness && hasWhatsapp)) return null

    return (
        <>
            <button
                type="button"
                data-cy="global-new-order-button"
                aria-label="Crear nueva orden"
                onClick={() => setOpen(true)}
                className="fixed bottom-[calc(var(--mobile-nav-h)+1rem)] right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-[#1D5BFF] px-4 text-sm font-bold text-white shadow-[0_8px_24px_rgb(29_91_255_/_0.24)] transition hover:bg-[#174BD4] hover:shadow-[0_10px_28px_rgb(29_91_255_/_0.3)] focus:outline-none focus:ring-4 focus:ring-[#1D5BFF]/20 sm:bottom-[calc(var(--mobile-nav-h)+1.5rem)] sm:right-6 sm:px-5"
            >
                <Plus className="size-4" aria-hidden="true" />
                <span>Nueva orden</span>
            </button>
            {open && <LazyNewRestaurantOrderDrawer open onClose={() => setOpen(false)} />}
        </>
    )
}
