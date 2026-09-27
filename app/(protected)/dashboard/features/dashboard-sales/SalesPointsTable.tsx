'use client'

import type { SalesData } from '../dashboard-data/dashboardData.types'

const money = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
})

export function SalesPointsTable({ data }: { data: SalesData }) {
    return (
        <div className="mt-6 overflow-x-auto border-t border-[#EDF2F9] pt-5">
            <table className="w-full min-w-[360px] text-left text-sm">
                <caption className="sr-only">Ventas y órdenes por periodo</caption>
                <thead className="text-xs text-[#8996A9]">
                    <tr>
                        <th className="pb-3 font-medium">Periodo</th>
                        <th className="pb-3 text-right font-medium">Ventas</th>
                        <th className="pb-3 text-right font-medium">Órdenes</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2F9]">
                    {data.points.map((point) => (
                        <tr key={point.label}>
                            <td className="py-3 font-medium text-[#243556]">{point.label}</td>
                            <td className="py-3 text-right text-[#243556]">
                                {money.format(point.sales)}
                            </td>
                            <td className="py-3 text-right text-[#65738A]">{point.orderCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
