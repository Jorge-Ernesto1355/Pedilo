export type DateRange = 'today' | 'seven-days' | 'thirty-days' | 'month'

export type SalesPoint = {
    label: string
    sales: number
}

export type SalesData = {
    total: number
    trend: number
    averageTicket: number
    points: SalesPoint[]
}

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
