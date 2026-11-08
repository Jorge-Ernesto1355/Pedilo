'use client'

import { InsightsCard } from '../dashboard-insights/InsightsCard'
import { DashboardCardError } from '../../components/DashboardCardError'
import { useTrendData } from '../dashboard-sales/useTrendData'
import type { SalesPeriod } from '../dashboard-data/dashboardData.types'

export default function OverviewInsightsModule({ period, ordersCount }: { period: SalesPeriod; ordersCount: number }) {
    const trend = useTrendData(period)
    if (trend.isPending)
        return <div className="min-h-64 animate-pulse rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6" role="status" aria-label="Cargando insights del negocio" />
    if (trend.isError)
        return <DashboardCardError title="Insights no disponibles" description="No pudimos cargar los indicadores de tu negocio." onRetry={() => void trend.refetch()} />
    const data = trend.data
        ? [
              { label: 'Tendencia', value: `${trend.data.trend > 0 ? '+' : ''}${trend.data.trend}%`, detail: 'comparado con el periodo anterior' },
              { label: 'Órdenes', value: String(ordersCount), detail: 'en el periodo seleccionado' },
          ]
        : [{ label: 'Tendencia', value: 'No disponible', detail: 'No se pudo cargar este indicador' }]
    return <InsightsCard data={data} />
}
