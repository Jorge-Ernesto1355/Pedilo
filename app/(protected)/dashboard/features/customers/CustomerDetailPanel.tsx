'use client'

import { useState } from 'react'
import { Minus, Plus, RefreshCw, X } from 'lucide-react'
import type { Customer } from '@/src/lib/api/order-types'
import { useCustomerOrders, useCustomerDiscounts, useRevokeCustomerDiscount } from './useCustomerDetail'
import { CustomerDiscountPanel } from '../orders/CustomerDiscountPanel'

type Tab = 'orders' | 'discounts'
type DiscountTab = 'available' | 'used' | 'expired' | 'cancelled'
const money = (value: number) => `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

export function CustomerDetailPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
    const [tab, setTab] = useState<Tab>('orders')
    const [ordersPage, setOrdersPage] = useState(1)
    const [discountTab, setDiscountTab] = useState<DiscountTab>('available')
    const [adding, setAdding] = useState(false)
    const orders = useCustomerOrders(customer.id, ordersPage)
    const discounts = useCustomerDiscounts(customer.id)
    const revoke = useRevokeCustomerDiscount(customer.id)
    const allDiscounts = discounts.data ?? []
    const classified = (status: string) =>
        status === 'USED' ? 'used' : status === 'EXPIRED' ? 'expired' : status === 'CANCELLED' ? 'cancelled' : 'available'
    const visibleDiscounts = allDiscounts.filter((discount) => classified(discount.status) === discountTab)
    const counts = (key: DiscountTab) => allDiscounts.filter((discount) => classified(discount.status) === key).length

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#10224A]/25 p-4">
            <section role="dialog" aria-label="Detalle del cliente" className="max-h-[min(900px,calc(100svh-2rem))] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7">
                <header className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8996A9]">Cliente</p>
                        <h2 className="mt-1 truncate font-display text-2xl text-[#12234A]">{customer.name}</h2>
                        <p className="mt-1 text-sm text-[#65738A]">{customer.phone || 'Sin teléfono registrado'}</p>
                        <p className="mt-2 text-xs text-[#8996A9]">ID: {customer.id}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-[#F1F5FA]"><X /></button>
                </header>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-[#F7F9FD] p-3"><p className="text-xs text-[#8996A9]">Pedidos</p><p className="mt-1 font-bold text-[#12234A]">Pedidos: {customer.orderCount}</p></div>
                    <div className="rounded-xl bg-[#F0FDF7] p-3"><p className="text-xs text-[#6B8A78]">Gastado</p><p className="mt-1 font-bold text-[#17643A]">Total gastado: {money(customer.totalSpent)}</p></div>
                    <div className="col-span-2 rounded-xl bg-[#F7F9FD] p-3 sm:col-span-1"><p className="text-xs text-[#8996A9]">Registro</p><p className="mt-1 font-bold text-[#12234A]">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('es-MX') : 'No disponible'}</p></div>
                </div>
                <div className="mt-6 flex gap-2 border-b border-[#E8EEF6]">
                    <button type="button" onClick={() => setTab('orders')} className={`border-b-2 px-3 py-2 text-sm font-bold ${tab === 'orders' ? 'border-[#2451C5] text-[#2451C5]' : 'border-transparent text-[#65738A]'}`}>Ver pedidos · Cargar pedidos</button>
                    <button type="button" onClick={() => setTab('discounts')} className={`border-b-2 px-3 py-2 text-sm font-bold ${tab === 'discounts' ? 'border-[#2451C5] text-[#2451C5]' : 'border-transparent text-[#65738A]'}`}>Ver cupones</button>
                </div>
                {tab === 'orders' ? (
                    <section aria-label="Historial de pedidos" className="mt-5">
                        <div className="flex items-center justify-between"><h3 className="font-bold text-[#12234A]">Historial completo</h3><button type="button" onClick={() => void orders.refetch()} aria-label="Actualizar pedidos" className="rounded-lg p-2 text-[#2451C5] hover:bg-[#EEF3FF]"><RefreshCw className="size-4" /></button></div>
                        {orders.isLoading ? <div role="status" className="mt-4 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-[#F1F5FA]" />)}</div> : orders.isError ? <div role="alert" className="mt-4 rounded-xl bg-[#FFF5F4] p-4 text-sm text-[#B42318]">No pudimos cargar los pedidos. <button type="button" onClick={() => void orders.refetch()} className="font-bold underline">Intentar de nuevo</button></div> : orders.data?.orders.length === 0 ? <p className="mt-5 rounded-xl bg-[#F7F9FD] p-5 text-center text-sm text-[#65738A]">Este cliente todavía no tiene pedidos.</p> : <div className="mt-4 space-y-3">{orders.data?.orders.map((order) => <article key={order.id} className="rounded-xl border border-[#E8EEF6] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-[#12234A]">Pedido #{order.orderNumber}</p><p className="mt-1 text-xs text-[#8996A9]">{new Date(order.createdAt).toLocaleString('es-MX')} · {order.status}</p></div><p className="font-bold text-[#17643A]">{money(order.total)}</p></div><ul className="mt-3 space-y-1 text-sm text-[#53647D]">{order.items.map((item) => <li key={item.id}>{item.quantity} × {item.productName}</li>)}</ul>{order.notes && <p className="mt-2 text-xs text-[#65738A]">Nota: {order.notes}</p>}</article>)}</div>}
                        {orders.data && orders.data.total > 10 && <div className="mt-4 flex items-center justify-between text-xs text-[#65738A]"><span>Página {ordersPage} de {Math.ceil(orders.data.total / 10)}</span><div className="flex gap-2"><button type="button" disabled={ordersPage <= 1} onClick={() => setOrdersPage((page) => page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button><button type="button" disabled={ordersPage >= Math.ceil(orders.data.total / 10)} onClick={() => setOrdersPage((page) => page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Siguiente</button></div></div>}
                    </section>
                ) : (
                    <section aria-label="Cupones del cliente" className="mt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-[#12234A]">Cupones del cliente</h3><button type="button" onClick={() => setAdding((open) => !open)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E40AF] px-3 py-2 text-sm font-bold text-white"><Plus className="size-4" />Agregar cupón</button></div>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{(['available', 'used', 'expired', 'cancelled'] as DiscountTab[]).map((key) => <button type="button" key={key} onClick={() => setDiscountTab(key)} className={`rounded-lg border px-2 py-2 text-xs font-bold ${discountTab === key ? 'border-[#2451C5] bg-[#EEF3FF] text-[#2451C5]' : 'border-[#E8EEF6] text-[#65738A]'}`}>{key === 'available' ? 'Disponibles' : key === 'used' ? 'Canjeados' : key === 'expired' ? 'Vencidos' : 'Cancelados'} ({counts(key)})</button>)}</div>
                        {adding && <CustomerDiscountPanel customerId={customer.id} currency="MXN" onCancel={() => setAdding(false)} />}
                        {discounts.isLoading ? <div role="status" className="mt-4 space-y-3">{[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-[#F1F5FA]" />)}</div> : discounts.isError ? <div role="alert" className="mt-4 rounded-xl bg-[#FFF5F4] p-4 text-sm text-[#B42318]">No pudimos cargar los cupones. <button type="button" onClick={() => void discounts.refetch()} className="font-bold underline">Intentar de nuevo</button></div> : visibleDiscounts.length === 0 ? <p className="mt-5 rounded-xl bg-[#F7F9FD] p-5 text-center text-sm text-[#65738A]">No hay cupones en este estado.</p> : <div className="mt-4 space-y-3">{visibleDiscounts.map((discount) => <article key={discount.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#E8EEF6] p-4"><div><p className="font-bold text-[#12234A]">Cupón personal</p><p className="mt-1 text-sm text-[#53647D]">{discount.type === 'PERCENTAGE' ? `${discount.value}% de descuento` : `${money(discount.value)} de descuento`}</p><p className="mt-1 text-xs text-[#8996A9]">{discount.expiresAt ? `Vence el ${new Date(discount.expiresAt).toLocaleDateString('es-MX')}` : 'Sin vencimiento'}{discount.usedAt ? ` · Canjeado el ${new Date(discount.usedAt).toLocaleDateString('es-MX')}` : ''}</p>{discount.usedOrder && <p className="mt-1 text-xs text-[#8996A9]">Pedido #{discount.usedOrder.orderNumber}</p>}</div>{discountTab === 'available' && <button type="button" aria-label="Revocar cupón" disabled={revoke.isPending} onClick={() => { if (window.confirm('¿Revocar este cupón?')) void revoke.mutateAsync(discount.id) }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#B42318] hover:bg-[#FFF5F4] disabled:opacity-50"><Minus className="size-3" />Revocar</button>}</article>)}</div>}
                    </section>
                )}
            </section>
        </div>
    )
}
