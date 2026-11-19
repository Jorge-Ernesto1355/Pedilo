import { DashboardOverviewProgressive } from '@/app/(protected)/dashboard/features/dashboard-overview/DashboardOverviewProgressive'
import { getOverviewInitialData } from '@/app/(protected)/dashboard/features/dashboard-overview/getOverviewInitialData'
import { isClientNavigation } from '@/lib/navigation/isClientNavigation'

// La verificación del negocio vive en el layout de (business).
export default async function DashboardPage() {
    // Carga completa: los datos se piden aquí sin await y llegan por streaming en el
    // mismo HTML (React los resuelve con use()). Navegación interna: el cliente usa su
    // caché o los pide él mismo, así que no se llama al backend desde el servidor.
    const initialData = (await isClientNavigation()) ? undefined : getOverviewInitialData()
    return (
        <DashboardOverviewProgressive
            todayIso={new Date().toISOString()}
            initialData={initialData}
        />
    )
}
