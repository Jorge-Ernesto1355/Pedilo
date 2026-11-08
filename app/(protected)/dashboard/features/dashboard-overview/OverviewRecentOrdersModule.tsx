'use client'

import { RecentOrdersTable } from '../dashboard-orders/RecentOrdersTable'
import { useOrders } from '../orders/useOrders'
import { DashboardCardError } from '../../components/DashboardCardError'
import type { OrderStatus } from '@/src/lib/api/order-types'
import type { OrdersData } from '../dashboard-data/dashboardData.types'

function toOrdersData(orders: Array<{ id: string; orderNumber: number; customerName: string | null; total: number; status: OrderStatus }>): OrdersData {
    return {
        total: orders.length,
        recent: orders.map((order) => ({
            id: `#${order.orderNumber}`,
            customer: order.customerName ?? 'Cliente sin nombre',
            amount: order.total,
            status: order.status === 'READY' ? 'ready' : order.status === 'CANCELLED' ? 'cancelled' : order.status === 'PENDING' ? 'pending' : 'preparing',
        })),
    }
}

export default function OverviewRecentOrdersModule() {
    const orders = useOrders({ page: 1, limit: 5, summary: true })
    if (orders.isPending)
        return <RecentOrdersSkeleton />
    if (orders.isError)
        return <DashboardCardError title="Pedidos recientes no disponibles" description="No pudimos cargar los pedidos recientes." onRetry={() => void orders.refetch()} />
    return <RecentOrdersTable data={toOrdersData(orders.data?.orders ?? [])} />
}

function RecentOrdersSkeleton() {
    return (
        <section className="min-h-64 animate-pulse rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6" role="status" aria-label="Cargando pedidos recientes">
            <div className="h-3 w-32 rounded bg-[#E8EEF6]" />
            <div className="mt-3 h-6 w-44 rounded bg-[#E8EEF6]" />
            <div className="mt-6 divide-y divide-[#EEF2F7]">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0 flex-1"><div className="h-3 w-1/2 rounded bg-[#E8EEF6]" /><div className="mt-2 h-2.5 w-1/3 rounded bg-[#F1F4F9]" /></div><div className="h-4 w-16 rounded bg-[#E8EEF6]" /></div>)}</div>
        </section>
    )
}
