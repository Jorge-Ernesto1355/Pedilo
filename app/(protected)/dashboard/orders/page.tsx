'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
    ArrowRight,
    BellRing,
    ChefHat,
    CircleCheck,
    CircleX,
    LoaderCircle,
    RefreshCw,
    Search,
    ShoppingBag,
    X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import {
    ORDER_PERIODS,
    ORDER_STATUSES,
    type Order,
    type OrderPeriod,
    type OrderStatus,
} from '@/src/lib/api/order-types'
import { useOrder, useOrders, useOrderStatusMutation } from '../features/orders/useOrders'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { OrdersSkeleton } from '../components/DashboardSkeletons'
import { EmptyState } from '../components/EmptyState'
import { useBusinessSettings } from '../../create-menu/features/business-settings/useBusinessSettings'
import {
    formatBusinessDate,
    formatBusinessTime,
    formatMoney,
} from '../features/dashboard-data/formatters'

const NewRestaurantOrderDrawer = dynamic(
    () =>
        import('../features/orders/NewRestaurantOrderDrawer').then(
            (module) => module.NewRestaurantOrderDrawer,
        ),
    { ssr: false },
)

type StatusMeta = {
    label: string
    description: string
    actionLabel?: string
    icon: LucideIcon
    badge: string
    dot: string
    panel: string
    button: string
}

const statusMeta: Record<OrderStatus, StatusMeta> = {
    PENDING: {
        label: 'Nueva',
        description: 'Orden recibida',
        actionLabel: 'Empezar a preparar',
        icon: BellRing,
        badge: 'border-[#F4D99B] bg-[#FFF8E8] text-[#9A6500]',
        dot: 'bg-[#D59A21]',
        panel: 'border-[#F4D99B] bg-[#FFFCF4]',
        button: 'bg-[#C88713] text-white hover:bg-[#AE7008]',
    },
    PREPARING: {
        label: 'Preparando',
        description: 'El restaurante está preparando la orden',
        actionLabel: 'Marcar como lista',
        icon: ChefHat,
        badge: 'border-[#B9CDFD] bg-[#EEF3FF] text-[#2451C5]',
        dot: 'bg-[#315FE8]',
        panel: 'border-[#C8D8FF] bg-[#F7F9FF]',
        button: 'bg-[#2451C5] text-white hover:bg-[#1E40AF]',
    },
    READY: {
        label: '¡Lista!',
        description: 'La orden está lista para entregar',
        icon: CircleCheck,
        badge: 'border-[#B8E2C8] bg-[#EEF8F2] text-[#23794A]',
        dot: 'bg-[#39A86B]',
        panel: 'border-[#B8E2C8] bg-[#F7FCF8]',
        button: 'bg-[#23814C] text-white hover:bg-[#1D6B3F]',
    },
    CANCELLED: {
        label: 'Cancelada',
        description: 'La orden fue cancelada',
        icon: CircleX,
        badge: 'border-[#F3C2BD] bg-[#FFF3F1] text-[#B42318]',
        dot: 'bg-[#C94B4B]',
        panel: 'border-[#F3C2BD] bg-[#FFF9F8]',
        button: 'bg-[#B42318] text-white hover:bg-[#921C14]',
    },
}

const periodLabels: Record<OrderPeriod, string> = {
    today: 'Hoy',
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    lastMonth: 'Último mes',
}

function nextStatus(status: OrderStatus): OrderStatus | null {
    if (status === 'PENDING') return 'PREPARING'
    if (status === 'PREPARING') return 'READY'
    return null
}

function canCancel(status: OrderStatus) {
    return status !== 'CANCELLED'
}

function statusErrorMessage(error: unknown) {
    if (error instanceof ApiError && error.code === 'ORDER_INVALID_STATUS_TRANSITION')
        return 'La orden cambió en otra sesión. Actualiza la lista e inténtalo de nuevo.'
    if (error instanceof ApiError && error.code === 'ORDER_NOT_FOUND')
        return 'La orden ya no existe o no está disponible.'
    return 'No pudimos actualizar el estado. Inténtalo nuevamente.'
}

export default function OrdersPage() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<OrderStatus | undefined>()
    const [period, setPeriod] = useState<OrderPeriod | undefined>()
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [newOrderOpen, setNewOrderOpen] = useState(false)
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
    const [mutationErrorOrderId, setMutationErrorOrderId] = useState<string | null>(null)
    const [limit] = useState(20)
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1)
            setDebouncedSearch(search.trim())
        }, 350)

        return () => window.clearTimeout(timer)
    }, [search])
    const query = useOrders({
        page,
        limit,
        status,
        search: debouncedSearch || undefined,
        period,
    })
    const detail = useOrder(selectedId)
    const mutation = useOrderStatusMutation()
    const settings = useBusinessSettings(true)
    const currency = settings.settings.data?.currency ?? 'MXN'
    const timezone = settings.settings.data?.timezone ?? 'America/Mazatlan'
    const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / limit)) : 1
    const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
        (value) =>
            totalPages <= 7 || value === 1 || value === totalPages || Math.abs(value - page) <= 1,
    )

    function changeStatus(orderId: string, next: OrderStatus) {
        if (mutation.isPending) return
        setUpdatingOrderId(orderId)
        setMutationErrorOrderId(null)
        mutation.mutate(
            { orderId, status: next },
            {
                onError: () => setMutationErrorOrderId(orderId),
                onSuccess: () => setMutationErrorOrderId(null),
                onSettled: () => setUpdatingOrderId(null),
            },
        )
    }

    function clearSearch() {
        setSearch('')
        setDebouncedSearch('')
        setPage(1)
    }

    if (query.isLoading) return <OrdersSkeleton />

    return (
        <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm text-[#65738A]">Operación diaria</p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">
                        Pedidos
                    </h1>
                    <p className="mt-2 max-w-xl text-sm text-[#65738A]">
                        Avanza cada orden desde aquí mientras la preparas.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setNewOrderOpen(true)}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2451C5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1E40AF] focus:outline-none focus:ring-4 focus:ring-[#2451C5]/15"
                    >
                        + Nueva orden
                    </button>
                    <select
                        value={period ?? ''}
                        onChange={(event) => {
                            setPage(1)
                            setPeriod((event.target.value || undefined) as OrderPeriod | undefined)
                        }}
                        className="rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-2 focus:ring-[#2451C5]/15"
                        aria-label="Filtrar pedidos por periodo"
                    >
                        <option value="">Todos los periodos</option>
                        {ORDER_PERIODS.map((item) => (
                            <option key={item} value={item}>
                                {periodLabels[item]}
                            </option>
                        ))}
                    </select>
                    <select
                        value={status ?? ''}
                        onChange={(event) => {
                            setPage(1)
                            setStatus((event.target.value || undefined) as OrderStatus | undefined)
                        }}
                        className="rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-2 focus:ring-[#2451C5]/15"
                        aria-label="Filtrar pedidos por estado"
                    >
                        <option value="">Todos los estados</option>
                        {ORDER_STATUSES.map((item) => (
                            <option key={item} value={item}>
                                {statusMeta[item].label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="grid size-11 place-items-center rounded-xl border border-[#D7E1EF] bg-white text-[#65738A] transition hover:border-[#B9CDFD] hover:text-[#2451C5] focus:outline-none focus:ring-2 focus:ring-[#2451C5]/15"
                        aria-label="Actualizar pedidos"
                    >
                        <RefreshCw className={`size-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative block min-w-0 flex-1 sm:max-w-[520px]">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar pedido, nombre o teléfono…"
                        aria-label="Buscar pedidos por número, nombre o teléfono"
                        className="h-11 w-full rounded-xl border border-[#D7E1EF] bg-white py-2.5 pl-10 pr-10 text-sm text-[#243556] outline-none transition placeholder:text-[#8996A9] focus:border-[#2451C5] focus:ring-2 focus:ring-[#2451C5]/15"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#F2F5FA] hover:text-[#243556] focus:outline-none focus:ring-2 focus:ring-[#2451C5]/20 sm:right-2 sm:size-7"
                            aria-label="Limpiar búsqueda"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </label>
                {query.isFetching && debouncedSearch && (
                    <span
                        className="inline-flex items-center gap-2 px-1 text-xs text-[#8996A9]"
                        role="status"
                    >
                        <LoaderCircle className="size-3.5 animate-spin" />
                        Buscando…
                    </span>
                )}
            </div>
            {query.isError ? (
                <DashboardErrorState
                    title="No pudimos cargar tus pedidos"
                    description="No logramos consultar los pedidos de tu negocio. Inténtalo nuevamente para actualizar la operación diaria."
                    onRetry={() => void query.refetch()}
                />
            ) : query.data?.orders.length === 0 ? (
                <EmptyState
                    icon={ShoppingBag}
                    title={debouncedSearch ? 'No encontramos pedidos' : 'Aún no tienes pedidos'}
                    description={
                        debouncedSearch
                            ? 'Prueba con otro número, nombre o teléfono.'
                            : 'Cuando tus clientes realicen un pedido, aparecerá aquí.'
                    }
                />
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#8996A9]">
                            Cola de trabajo
                        </p>
                        <p className="text-xs text-[#8996A9]">
                            {query.data?.total ?? 0} {query.data?.total === 1 ? 'orden' : 'órdenes'}
                        </p>
                    </div>
                    {query.data?.orders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            currency={currency}
                            timezone={timezone}
                            isUpdating={updatingOrderId === order.id}
                            hasMutationError={mutationErrorOrderId === order.id}
                            errorMessage={
                                mutation.error ? statusErrorMessage(mutation.error) : undefined
                            }
                            onOpen={() => setSelectedId(order.id)}
                            onStatusChange={changeStatus}
                        />
                    ))}
                </div>
            )}
            {query.data && totalPages > 1 && (
                <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-[#8996A9]">
                        Página {page} de {totalPages}
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((value) => value - 1)}
                            className="rounded-lg border border-[#D7E1EF] px-3 py-2 text-sm text-[#243556] transition hover:border-[#B9CDFD] disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        {visiblePages.map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-current={value === page ? 'page' : undefined}
                                onClick={() => setPage(value)}
                                className={`min-w-9 rounded-lg border px-3 py-2 text-sm transition ${value === page ? 'border-[#2451C5] bg-[#2451C5] font-bold text-white' : 'border-[#D7E1EF] text-[#243556] hover:border-[#B9CDFD]'}`}
                            >
                                {value}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((value) => value + 1)}
                            className="rounded-lg border border-[#D7E1EF] px-3 py-2 text-sm text-[#243556] transition hover:border-[#B9CDFD] disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
            {selectedId && (
                <OrderDetailModal
                    order={detail.data}
                    isLoading={detail.isLoading}
                    currency={currency}
                    timezone={timezone}
                    isUpdating={updatingOrderId === selectedId}
                    hasMutationError={mutationErrorOrderId === selectedId}
                    errorMessage={mutation.error ? statusErrorMessage(mutation.error) : undefined}
                    onClose={() => setSelectedId(null)}
                    onStatusChange={changeStatus}
                />
            )}
            <NewRestaurantOrderDrawer
                open={newOrderOpen}
                onClose={() => setNewOrderOpen(false)}
                onViewOrder={(order) => {
                    setNewOrderOpen(false)
                    setSelectedId(order.id)
                }}
            />
        </main>
    )
}

function OrderCard({
    order,
    currency,
    timezone,
    isUpdating,
    hasMutationError,
    errorMessage,
    onOpen,
    onStatusChange,
}: {
    order: Order
    currency: string
    timezone: string
    isUpdating: boolean
    hasMutationError: boolean
    errorMessage?: string
    onOpen: () => void
    onStatusChange: (orderId: string, status: OrderStatus) => void
}) {
    const meta = statusMeta[order.status]
    const Icon = meta.icon
    const next = nextStatus(order.status)

    return (
        <article
            className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_22px_rgb(20_48_105_/_0.045)] transition hover:shadow-[0_12px_30px_rgb(20_48_105_/_0.08)] ${isUpdating ? 'border-[#B9CDFD]' : 'border-[#DCE5F3]'}`}
        >
            <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] sm:items-center sm:p-5">
                <button
                    type="button"
                    onClick={onOpen}
                    className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#2451C5] focus-visible:ring-offset-2"
                >
                    <span className="flex items-start gap-3">
                        <span
                            className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${meta.badge}`}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-display text-lg tracking-[-.03em] text-[#12234A]">
                                    Pedido #{order.orderNumber}
                                </span>
                                <span className="text-xs text-[#8996A9]">
                                    {formatBusinessTime(order.createdAt ?? '', timezone)}
                                </span>
                            </span>
                            <span className="mt-1 block truncate text-sm font-semibold text-[#243556]">
                                {order.customerName}
                            </span>
                            <span className="mt-1 block text-xs text-[#65738A]">
                                {order.items.length}{' '}
                                {order.items.length === 1 ? 'producto' : 'productos'} ·{' '}
                                {formatMoney(order.total, currency)}
                            </span>
                        </span>
                    </span>
                </button>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#EDF2F9] bg-[#FBFCFE] p-3 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
                    <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold motion-safe:transition-all ${meta.badge} ${isUpdating ? 'scale-[.98] opacity-70' : ''}`}
                    >
                        <span className={`size-2 rounded-full ${meta.dot}`} />
                        {meta.label}
                    </div>
                    <div className="flex items-center gap-2">
                        {next && (
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => onStatusChange(order.id, next)}
                                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#2451C5]/30 disabled:cursor-wait disabled:opacity-60 ${meta.button}`}
                            >
                                {isUpdating ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="size-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {isUpdating ? 'Actualizando…' : meta.actionLabel}
                                </span>
                                <span className="sm:hidden">{isUpdating ? '…' : 'Avanzar'}</span>
                            </button>
                        )}
                        {canCancel(order.status) && (
                            <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => onStatusChange(order.id, 'CANCELLED')}
                                className="grid size-10 place-items-center rounded-xl border border-[#F3C2BD] text-[#B42318] transition hover:bg-[#FFF3F1] focus:outline-none focus:ring-2 focus:ring-[#B42318]/20 disabled:cursor-wait disabled:opacity-50"
                                aria-label={`Cancelar pedido #${order.orderNumber}`}
                                title="Cancelar pedido"
                            >
                                <CircleX className="size-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {hasMutationError && errorMessage && (
                <p
                    role="alert"
                    className="border-t border-[#F3C2BD] bg-[#FFF9F8] px-4 py-2.5 text-xs font-medium text-[#B42318] sm:px-5"
                >
                    {errorMessage}
                </p>
            )}
        </article>
    )
}

function OrderDetailModal({
    order,
    isLoading,
    currency,
    timezone,
    isUpdating,
    hasMutationError,
    errorMessage,
    onClose,
    onStatusChange,
}: {
    order?: Order
    isLoading: boolean
    currency: string
    timezone: string
    isUpdating: boolean
    hasMutationError: boolean
    errorMessage?: string
    onClose: () => void
    onStatusChange: (orderId: string, status: OrderStatus) => void
}) {
    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#10224A]/35 p-4 backdrop-blur-[2px]">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-detail-title"
                className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#DCE5F3] bg-white p-5 shadow-[0_25px_80px_rgb(16_34_74_/_0.2)] sm:p-7"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                            Detalle de orden
                        </p>
                        <h2
                            id="order-detail-title"
                            className="mt-1 font-display text-2xl tracking-[-.05em] text-[#12234A]"
                        >
                            Pedido #{order?.orderNumber ?? '…'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar detalle"
                        className="grid size-10 place-items-center rounded-xl text-[#65738A] transition hover:bg-[#F2F5FA] hover:text-[#12234A] focus:outline-none focus:ring-2 focus:ring-[#2451C5]/20"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                {isLoading ? (
                    <div className="mt-8 grid place-items-center py-12 text-sm text-[#65738A]">
                        <span className="mb-3">
                            <RefreshCw className="size-6 animate-spin text-[#2451C5]" />
                        </span>
                        Cargando detalle…
                    </div>
                ) : order ? (
                    <div className="mt-6 space-y-6">
                        <div
                            className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${statusMeta[order.status].panel}`}
                        >
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#65738A]">
                                    Estado actual
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold ${statusMeta[order.status].badge}`}
                                    >
                                        <span
                                            className={`size-2 rounded-full ${statusMeta[order.status].dot}`}
                                        />
                                        {statusMeta[order.status].label}
                                    </span>
                                    <span className="text-sm text-[#65738A]">
                                        {statusMeta[order.status].description}
                                    </span>
                                </div>
                            </div>
                            <p className="font-display text-2xl text-[#12234A]">
                                {formatMoney(order.total, currency)}
                            </p>
                        </div>
                        <div className="grid gap-3 rounded-2xl bg-[#F8FAFE] p-4 text-sm sm:grid-cols-2">
                            <div>
                                <p className="text-xs text-[#8996A9]">Cliente</p>
                                <p className="mt-1 font-bold text-[#243556]">
                                    {order.customerName}
                                </p>
                                <p className="mt-1 text-[#65738A]">{order.customerPhone}</p>
                            </div>
                            <div className="sm:text-right">
                                <p className="text-xs text-[#8996A9]">Recibida</p>
                                <p className="mt-1 font-semibold text-[#243556]">
                                    {formatBusinessDate(order.createdAt, timezone)}
                                </p>
                                {order.notes && (
                                    <p className="mt-2 text-[#65738A] sm:ml-auto sm:max-w-xs">
                                        {order.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-display text-lg text-[#12234A]">Productos</h3>
                                <span className="text-sm text-[#65738A]">
                                    {formatMoney(order.subtotal, currency)}
                                </span>
                            </div>
                            <div className="divide-y divide-[#E8EEF6] rounded-2xl border border-[#E8EEF6] px-4">
                                {order.items.map((item, index) => (
                                    <div
                                        key={item.id ?? `${item.productId}-${index}`}
                                        className="flex justify-between gap-4 py-3 text-sm"
                                    >
                                        <span className="text-[#243556]">
                                            {item.quantity} ×{' '}
                                            {item.productName ?? item.name ?? item.productId}
                                        </span>
                                        <span className="shrink-0 font-semibold text-[#243556]">
                                            {formatMoney(
                                                item.subtotal ??
                                                    (item.unitPrice ?? 0) * item.quantity,
                                                currency,
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <OrderTimeline
                            history={order.statusHistory}
                            timezone={timezone}
                            currentStatus={order.status}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EEF6] pt-5">
                            <div className="flex flex-wrap gap-2">
                                {nextStatus(order.status) && (
                                    <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() =>
                                            onStatusChange(order.id, nextStatus(order.status)!)
                                        }
                                        className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${statusMeta[order.status].button}`}
                                    >
                                        {isUpdating ? (
                                            <LoaderCircle className="size-4 animate-spin" />
                                        ) : (
                                            <ArrowRight className="size-4" />
                                        )}
                                        {isUpdating
                                            ? 'Actualizando…'
                                            : statusMeta[order.status].actionLabel}
                                    </button>
                                )}
                                {canCancel(order.status) && (
                                    <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => onStatusChange(order.id, 'CANCELLED')}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#F3C2BD] px-4 text-sm font-bold text-[#B42318] transition hover:bg-[#FFF3F1] disabled:opacity-50"
                                    >
                                        <CircleX className="size-4" />
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            {hasMutationError && errorMessage && (
                                <p role="alert" className="text-xs font-medium text-[#B42318]">
                                    {errorMessage}
                                </p>
                            )}
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    )
}

function OrderTimeline({
    history,
    timezone,
    currentStatus,
}: {
    history: Order['statusHistory']
    timezone: string
    currentStatus: OrderStatus
}) {
    const entries = [...(history ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    return (
        <section aria-labelledby="order-history-title">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2451C5]">
                        Trazabilidad
                    </p>
                    <h3
                        id="order-history-title"
                        className="mt-1 font-display text-lg text-[#12234A]"
                    >
                        Historial de la orden
                    </h3>
                </div>
                <span className="text-xs text-[#8996A9]">Datos del pedido</span>
            </div>
            {entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D7E1EF] p-4 text-sm text-[#65738A]">
                    El backend no devolvió cambios de estado para esta orden.
                </div>
            ) : (
                <ol className="relative ml-3 border-l border-[#D7E1EF] pl-7">
                    {entries.map((entry, index) => {
                        const meta = statusMeta[entry.status]
                        const Icon = meta.icon
                        const isCurrent =
                            entry.status === currentStatus && index === entries.length - 1
                        return (
                            <li
                                key={entry.id ?? `${entry.status}-${entry.createdAt}-${index}`}
                                className="relative pb-6 last:pb-0"
                            >
                                <span
                                    className={`absolute -left-[2.05rem] grid size-8 place-items-center rounded-full border-4 border-white ${meta.badge} ${isCurrent ? 'ring-2 ring-[#2451C5]/15' : ''}`}
                                >
                                    <Icon className="size-3.5" />
                                </span>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p
                                        className={`text-sm font-bold ${isCurrent ? 'text-[#12234A]' : 'text-[#243556]'}`}
                                    >
                                        {meta.label}
                                        {isCurrent && (
                                            <span className="ml-2 rounded-full bg-[#E8F0FF] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#2451C5]">
                                                Actual
                                            </span>
                                        )}
                                    </p>
                                    <time
                                        dateTime={entry.createdAt}
                                        className="text-xs font-medium text-[#8996A9]"
                                    >
                                        {formatBusinessTime(entry.createdAt, timezone)}
                                    </time>
                                </div>
                                <p className="mt-1 text-xs text-[#65738A]">{meta.description}</p>
                            </li>
                        )
                    })}
                </ol>
            )}
        </section>
    )
}
