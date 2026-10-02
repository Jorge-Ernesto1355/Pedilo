'use client'

import type { SalesData } from '../dashboard-data/dashboardData.types'
import { formatMoney } from '../dashboard-data/formatters'

export function SalesPointsTable({ data, currency = 'MXN' }: { data: SalesData; currency?: string }) {
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
                                {formatMoney(point.sales, currency)}
                            </td>
                            <td className="py-3 text-right text-[#65738A]">{point.orderCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
