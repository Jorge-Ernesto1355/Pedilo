'use client'

import { useState } from 'react'
import { RefreshCw, ShoppingBag, X } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { ORDER_STATUSES, type OrderStatus } from '@/src/lib/api/order-types'
import { useOrder, useOrders, useOrderStatusMutation } from '../features/orders/useOrders'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { OrdersSkeleton } from '../components/DashboardSkeletons'
import { EmptyState } from '../components/EmptyState'

const labels: Record<OrderStatus, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    PREPARING: 'Preparando',
    READY: 'Listo',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado',
}
const next: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
}
const badge = (status: OrderStatus) =>
    `inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === 'CANCELLED' ? 'bg-[#FFF0EF] text-[#B42318]' : status === 'COMPLETED' ? 'bg-[#EEF8F2] text-[#23814C]' : 'bg-[#EEF3FF] text-[#2451C5]'}`

export default function OrdersPage() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<OrderStatus | undefined>()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [limit] = useState(20)
    const query = useOrders({ page, limit, status })
    const detail = useOrder(selectedId)
    const mutation = useOrderStatusMutation()
    const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / limit)) : 1

    if (query.isLoading) return <OrdersSkeleton />

    return (
        <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm text-[#65738A]">Operación diaria</p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">
                        Pedidos
                    </h1>
                </div>
                <div className="flex gap-2">
                    <select
                        value={status ?? ''}
                        onChange={(event) => {
                            setPage(1)
                            setStatus((event.target.value || undefined) as OrderStatus | undefined)
                        }}
                        className="rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm"
                    >
                        <option value="">Todos los estados</option>
                        {ORDER_STATUSES.map((item) => (
                            <option key={item} value={item}>
                                {labels[item]}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="grid size-11 place-items-center rounded-xl border border-[#D7E1EF] bg-white text-[#65738A]"
                        aria-label="Actualizar pedidos"
                    >
                        <RefreshCw className="size-4" />
                    </button>
                </div>
            </header>
            {query.isError ? (
                <DashboardErrorState
                    title="No pudimos cargar tus pedidos"
                    description="No logramos consultar los pedidos de tu negocio. Inténtalo nuevamente para actualizar la operación diaria."
                    onRetry={() => void query.refetch()}
                />
            ) : query.data?.orders.length === 0 ? (
                <EmptyState
                    icon={ShoppingBag}
                    title="Aún no tienes pedidos"
                    description="Cuando tus clientes realicen un pedido, aparecerá aquí."
                />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#DCE5F3] bg-white">
                    <div className="divide-y divide-[#E8EEF6]">
                        {query.data?.orders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => setSelectedId(order.id)}
                                className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-[#F8FAFE] sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-center"
                            >
                                <div>
                                    <p className="font-bold text-[#12234A]">
                                        Pedido #{order.orderNumber}
                                    </p>
                                    <p className="mt-1 text-xs text-[#8996A9]">
                                        {order.createdAt
                                            ? new Date(order.createdAt).toLocaleString('es-MX')
                                            : 'Fecha no disponible'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#243556]">
                                        {order.customerName}
                                    </p>
                                    <p className="text-xs text-[#65738A]">{order.customerPhone}</p>
                                </div>
                                <p className="text-sm font-bold text-[#1E40AF]">
                                    $
                                    {order.total.toLocaleString('es-MX', {
                                        minimumFractionDigits: 2,
                                    })}
                                </p>
                                <span className={badge(order.status)}>{labels[order.status]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {query.data && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-[#8996A9]">
                        Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((value) => value - 1)}
                            className="rounded-lg border border-[#D7E1EF] px-3 py-2 text-sm disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((value) => value + 1)}
                            className="rounded-lg border border-[#D7E1EF] px-3 py-2 text-sm disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
            {selectedId && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#10224A]/25 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"
                    >
                        <div className="flex justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                                    Detalle
                                </p>
                                <h2 className="mt-1 font-display text-2xl text-[#12234A]">
                                    Pedido #{detail.data?.orderNumber ?? '…'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                aria-label="Cerrar"
                            >
                                <X />
                            </button>
                        </div>
                        {detail.isLoading ? (
                            <p className="mt-6 text-sm text-[#65738A]">Cargando detalle…</p>
                        ) : (
                            detail.data && (
                                <div className="mt-6 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <span className={badge(detail.data.status)}>
                                            {labels[detail.data.status]}
                                        </span>
                                        <span className="font-display text-xl text-[#12234A]">
                                            $
                                            {detail.data.total.toLocaleString('es-MX', {
                                                minimumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    <div className="rounded-xl bg-[#F8FAFE] p-4 text-sm">
                                        <p className="font-bold text-[#243556]">
                                            {detail.data.customerName}
                                        </p>
                                        <p className="mt-1 text-[#65738A]">
                                            {detail.data.customerPhone}
                                        </p>
                                        {detail.data.notes && (
                                            <p className="mt-3 border-t border-[#E8EEF6] pt-3 text-[#65738A]">
                                                {detail.data.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {detail.data.items.map((item, index) => (
                                            <div
                                                key={item.id ?? `${item.productId}-${index}`}
                                                className="flex justify-between gap-4 border-b border-[#E8EEF6] pb-3 text-sm"
                                            >
                                                <span>
                                                    {item.quantity} ×{' '}
                                                    {item.productName ??
                                                        item.name ??
                                                        item.productId}
                                                </span>
                                                <span className="font-semibold">
                                                    $
                                                    {(
                                                        item.subtotal ??
                                                        item.unitPrice ??
                                                        0
                                                    ).toLocaleString('es-MX', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <p className="mb-3 text-sm font-bold text-[#243556]">
                                            Historial
                                        </p>
                                        <div className="space-y-2 text-xs text-[#65738A]">
                                            {detail.data.statusHistory.map((entry) => (
                                                <p key={`${entry.status}-${entry.createdAt}`}>
                                                    <strong>{labels[entry.status]}</strong> ·{' '}
                                                    {new Date(entry.createdAt).toLocaleString(
                                                        'es-MX',
                                                    )}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    {next[detail.data.status].length > 0 && (
                                        <div className="flex flex-wrap gap-2 border-t border-[#E8EEF6] pt-4">
                                            {next[detail.data.status].map((nextStatus) => (
                                                <button
                                                    key={nextStatus}
                                                    type="button"
                                                    disabled={mutation.isPending}
                                                    onClick={() =>
                                                        mutation.mutate({
                                                            orderId: detail.data!.id,
                                                            status: nextStatus,
                                                        })
                                                    }
                                                    className="rounded-xl bg-[#1E40AF] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                                                >
                                                    {labels[nextStatus]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {mutation.isError && (
                                        <p role="alert" className="text-sm text-[#B42318]">
                                            {mutation.error instanceof ApiError &&
                                            mutation.error.code
                                                ? 'No se puede realizar esa transición.'
                                                : 'No pudimos actualizar el estado.'}
                                        </p>
                                    )}
                                </div>
                            )
                        )}
                    </section>
                </div>
            )}
        </main>
    )
}
