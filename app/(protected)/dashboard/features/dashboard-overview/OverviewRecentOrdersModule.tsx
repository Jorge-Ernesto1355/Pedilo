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
    const orders = useOrders({ page: 1, limit: 5 })
    if (orders.isPending)
        return <div className="min-h-64 animate-pulse rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6" role="status" aria-label="Cargando pedidos recientes" />
    if (orders.isError)
        return <DashboardCardError title="Pedidos recientes no disponibles" description="No pudimos cargar los pedidos recientes." onRetry={() => void orders.refetch()} />
    return <RecentOrdersTable data={toOrdersData(orders.data?.orders ?? [])} />
}
