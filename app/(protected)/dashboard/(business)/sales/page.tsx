import { getOverviewInitialData } from '../../features/dashboard-overview/getOverviewInitialData'
import { isClientNavigation } from '@/lib/navigation/isClientNavigation'
import { SalesPageClient } from './SalesPageClient'

export default async function SalesPage() {
    // Igual que el resumen: en carga completa las cifras de "Hoy" llegan en el HTML;
    // al navegar desde el resumen ya están en la caché del cliente.
    const initialData = (await isClientNavigation()) ? undefined : getOverviewInitialData()
    return <SalesPageClient initialData={initialData} />
}
