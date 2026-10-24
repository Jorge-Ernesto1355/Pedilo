export type SalesPeriod = 'today' | '7d' | '30d' | 'thisMonth'
export type DateRange = SalesPeriod
export type AverageTicketPeriod = 'today' | '7d' | '30d' | 'this_month'

export type SalesPoint = {
    label: string
    start?: string
    sales: number
    orderCount: number
}

export type SalesSeriesPoint = {
    label?: string
    start?: string
    end?: string
    date?: string
    timestamp?: string
    sales: number | string
    orders_count?: number
    orderCount?: number
}

export type SalesSeries = {
    current: SalesSeriesPoint[]
    previous: SalesSeriesPoint[]
}

export type SalesComparison = {
    status?: 'OK' | 'NO_BASELINE' | string
    percentage_change?: number | null
    difference?: number | string | null
    current_total?: number | string
    previous_total?: number | string
}

export type SalesTooltipPoint = {
    label?: string
    date?: string
    start?: string
    current?: {
        sales?: number | string
        orders_count?: number
        orderCount?: number
    }
    previous?: {
        sales?: number | string
        orders_count?: number
        orderCount?: number
    }
    current_sales?: number | string
    previous_sales?: number | string
    current_orders_count?: number
    previous_orders_count?: number
    difference?: number | string | null
    percentage_change?: number | null
}

export type SalesGranularity = 'hour' | 'day'

export type SalesDashboardResponse = {
    period?: SalesPeriod
    granularity?: SalesGranularity
    timezone?: string
    total: number
    previousTotal?: number
    historicalSales?: number
    historicalOrderCount?: number
    ordersCount: number
    trend: number
    averageTicket: number
    points: SalesPoint[]
    series?: SalesSeries
    comparison?: SalesComparison
    tooltip?: SalesTooltipPoint[]
}

export type SalesData = SalesDashboardResponse

export type HistoricalSalesResponse = {
    historicalSales: number
    historicalOrderCount: number
}

export type TrendPoint = {
    label: string
    start: string
    sales: number
    orderCount: number
}

export type TrendComparison = {
    current_total: number
    previous_total: number
    difference: number
    percentage_change: number | null
    status: 'OK' | 'NO_BASELINE'
}

export type TrendTooltipPoint = {
    timestamp: string
    label: string
    current_sales: number
    previous_sales: number
    difference: number
    percentage_change: number | null
    current_orders_count: number
    previous_orders_count: number
    status: 'OK' | 'NO_BASELINE'
}

export type TrendDashboardResponse = {
    period: SalesPeriod
    granularity: SalesGranularity
    timezone: string
    trend: number
    points: TrendPoint[]
    series: {
        current: TrendPoint[]
        previous: TrendPoint[]
    }
    comparison: TrendComparison
    tooltip: TrendTooltipPoint[]
}

export type AverageTicketPeriodMetrics = {
    total_sales?: string
    orders_count: number
    average_ticket: string | null
    start_at?: string
    end_at?: string
}

export type AverageTicketGlobalMetrics = {
    total_sales?: string
    orders_count: number
    average_ticket: string | null
}

export type AverageTicketResponse = {
    data: {
        metric: 'average_ticket'
        period: AverageTicketPeriod
        currency?: string
        current: AverageTicketPeriodMetrics
        previous: AverageTicketPeriodMetrics
        global?: AverageTicketGlobalMetrics
        comparison: {
            difference: string | null
            percentage_change: number | null
            direction: 'up' | 'down' | 'flat' | 'unchanged'
            has_previous_data: boolean
        }
        meta: {
            timezone: string
            generated_at: string
        }
    }
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'cancelled'

export type Order = {
    id: string
    customer: string
    amount: number
    status: OrderStatus
}

export type OrdersData = {
    total: number
    recent: Order[]
}

export type ProductPerformance = {
    totalActive: number
    bestSellers: { name: string; orders: number }[]
}

export type Insight = {
    label: string
    value: string
    detail: string
}
