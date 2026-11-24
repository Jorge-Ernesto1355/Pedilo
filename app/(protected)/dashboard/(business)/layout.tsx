import type { ReactNode } from 'react'
import { requireCurrentBusiness } from '@/lib/auth/getBusiness'
import { isClientNavigation } from '@/lib/navigation/isClientNavigation'
import { BusinessRequiredGuard } from './BusinessRequiredGuard'

// En carga completa, el negocio ya lo consultó (una sola vez) el layout de
// (protected) y requireCurrentBusiness reutiliza ese resultado (cache()). En una
// navegación interna, p. ej. desde create-menu o account, el servidor no vuelve a pedir
// /businesses/mine: el guard cliente usa el negocio ya cacheado en React Query.
// /dashboard/account queda fuera del grupo porque funciona sin negocio.
export default async function BusinessRequiredLayout({ children }: { children: ReactNode }) {
    if (await isClientNavigation()) {
        return (
            <>
                <BusinessRequiredGuard />
                {children}
            </>
        )
    }

    await requireCurrentBusiness()
    return children
}
