export type SalesPeriod = 'today' | '7d' | '30d' | 'thisMonth'
export type DateRange = SalesPeriod

export type SalesPoint = {
    label: string
    start?: string
    sales: number
    orderCount: number
}

export type SalesGranularity = 'hour' | 'day'

export type SalesDashboardResponse = {
    period?: SalesPeriod
    granularity?: SalesGranularity
    timezone?: string
    total: number
    ordersCount: number
    trend: number
    averageTicket: number
    points: SalesPoint[]
}

export type SalesData = SalesDashboardResponse

export type OrderStatus = 'completed' | 'pending' | 'preparing'

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
