import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AuthHydration } from '@/components/AuthHydration'
import { getSession } from '@/lib/auth/getSession'
import { getCurrentBusiness } from '@/lib/auth/getBusiness'
import type { CurrentBusiness } from '@/app/(protected)/create-menu/features/business-profile/useCurrentBusiness'
import { DashboardNav } from '@/app/(protected)/dashboard/DashboardNav'
import { RedirectedUrls } from '@/src/lib/RedirectUrls'
import React from 'react'
import { OrderEventsRuntime } from './dashboard/features/orders/OrderEventsRuntime'
import { GlobalNewOrderButton } from './GlobalNewOrderButton'
import { StockAlertsRuntime } from './dashboard/inventory/StockAlertsRuntime'

function toInitialBusiness(
    result: Awaited<ReturnType<typeof getCurrentBusiness>>,
): CurrentBusiness | null | undefined {
    // `undefined` = no se pudo resolver; el cliente hará su propia consulta.
    if (result.unavailable) return undefined
    if (!result.exists) return null
    const business = result.business
    return business && typeof business.id === 'string'
        ? (business as CurrentBusiness)
        : undefined
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
    // Este layout es compartido por todo el área protegida, así que solo se ejecuta
    // en cargas completas o al entrar desde fuera; la navegación interna lo reutiliza.
    // Sesión y negocio solo dependen de las cookies: se consultan en paralelo y el
    // negocio se reutiliza (cache()) en el layout de (business) del mismo request.
    const [{ user }, currentBusiness] = await Promise.all([getSession(), getCurrentBusiness()])

    // Esta verificación server-side es la protección real y funciona sin JavaScript.
    if (!user) {
        redirect(RedirectedUrls.login)
    }
    return (
        <AuthHydration user={user} initialBusiness={toInitialBusiness(currentBusiness)}>
            <div className="has-mobile-nav">
                <OrderEventsRuntime />
                <StockAlertsRuntime />
                <GlobalNewOrderButton />
                <div className="dashboard-shell min-h-screen">
                    <DashboardNav />
                    <div id="main-content" tabIndex={-1}>
                        {children}
                    </div>
                </div>
            </div>
        </AuthHydration>
    )
}
