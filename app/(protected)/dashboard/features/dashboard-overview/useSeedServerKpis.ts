'use client'

import { use } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useAuthenticatedUserId } from '@/components/AuthHydration'
import { salesQueryKey } from '../dashboard-sales/useSalesData'
import { averageTicketQueryKey } from '../dashboard-sales/useAverageTicketData'
import { historicalSalesQueryKey } from '../dashboard-sales/useHistoricalSalesData'
import type { DateRange } from '../dashboard-data/dashboardData.types'
import type { OverviewInitialData } from './getOverviewInitialData'

// Compartido por Resumen y Ventas: ambas usan las mismas query keys, así que lo que
// una página carga (o siembra desde el servidor) la otra lo muestra al instante.
/**
 * Siembra la caché de React Query con los datos que el servidor obtuvo para "Hoy".
 * - Solo se espera la promesa del servidor si la caché aún no tiene ventas de hoy
 *   (al volver al resumen con datos en caché no se espera al servidor).
 * - Sembrar durante el render hace que el HTML del servidor ya incluya las cifras y
 *   que, al hidratar, useQuery encuentre los datos y no repita la petición.
 * - Un dato nulo (error o timeout en el servidor) no se siembra: el cliente lo pide.
 */
export function useSeedServerKpis(range: DateRange, initialData?: Promise<OverviewInitialData>) {
    const queryClient = useQueryClient()
    // Id real del request (seguro en SSR) y el que usan ahora los hooks: durante SSR e
    // hidratación el store aún devuelve su estado inicial y las keys usan 'anonymous'.
    const userId = useAuthenticatedUserId()
    const hookUserId = useAuthStore((state) => state.user?.id) ?? 'anonymous'
    const shouldUseServerData =
        range === 'today' &&
        initialData !== undefined &&
        userId !== null &&
        queryClient.getQueryData(salesQueryKey(userId, 'today')) === undefined
    const serverData = shouldUseServerData ? use(initialData) : null
    if (!serverData || !userId) return

    const seed = (key: readonly unknown[], data: unknown) => {
        if (data !== null && queryClient.getQueryData(key) === undefined) {
            queryClient.setQueryData(key, data)
        }
    }
    for (const id of new Set([userId, hookUserId])) {
        seed(salesQueryKey(id, 'today'), serverData.sales)
        seed(averageTicketQueryKey(id, 'today'), serverData.averageTicket)
        seed(historicalSalesQueryKey(id), serverData.historicalSales)
    }
}
