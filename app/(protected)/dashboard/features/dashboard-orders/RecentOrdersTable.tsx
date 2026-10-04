'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Order, OrdersData } from '../dashboard-data/dashboardData.types'

const money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
})
const statusCopy: Record<Order['status'], { label: string; color: string }> = {
    ready: { label: '¡Lista!', color: 'bg-[#39A86B]' },
    pending: { label: 'Nueva', color: 'bg-[#D59A21]' },
    preparing: { label: 'Preparando', color: 'bg-[#315FE8]' },
    cancelled: { label: 'Cancelada', color: 'bg-[#C94B4B]' },
}

export function RecentOrdersTable({ data }: { data: OrdersData }) {
    return (
        <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2451C5]">
                        Actividad
                    </p>
                    <h2 className="mt-1 font-display text-lg tracking-[-.03em] text-[#12234A]">
                        Pedidos recientes
                    </h2>
                </div>
                <Link
                    href="/dashboard/orders"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2451C5] hover:text-[#1E40AF]"
                >
                    Ver todos <ArrowUpRight className="size-3.5" />
                </Link>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs text-[#8996A9]">
                        <tr>
                            <th className="pb-3 font-medium">Pedido</th>
                            <th className="pb-3 font-medium">Cliente</th>
                            <th className="pb-3 font-medium">Total</th>
                            <th className="pb-3 font-medium">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF2F9]">
                        {data.recent.map((order) => {
                            const status = statusCopy[order.status]
                            return (
                                <tr key={order.id}>
                                    <td className="py-3.5 font-semibold text-[#243556]">
                                        {order.id}
                                    </td>
                                    <td className="py-3.5 text-[#65738A]">{order.customer}</td>
                                    <td className="py-3.5 text-[#243556]">
                                        {money.format(order.amount)}
                                    </td>
                                    <td className="py-3.5">
                                        <span className="inline-flex items-center gap-2 text-xs text-[#65738A]">
                                            <span
                                                className={`size-2 rounded-full ${status.color}`}
                                            />
                                            {status.label}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    )
}
