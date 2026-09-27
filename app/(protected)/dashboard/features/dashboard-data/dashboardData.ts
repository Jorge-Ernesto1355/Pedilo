import type {
    DateRange,
    Insight,
    OrdersData,
    ProductPerformance,
    SalesData,
} from './dashboardData.types'

type DashboardData = {
    sales: SalesData
    orders: OrdersData
    products: ProductPerformance
    insights: Insight[]
}

const rangeMultiplier: Record<DateRange, number> = {
    today: 0.24,
    '7d': 0.72,
    '30d': 1.12,
    thisMonth: 1.28,
}

const trendByRange: Record<DateRange, number> = {
    today: 8,
    '7d': 18,
    '30d': 14,
    thisMonth: 22,
}

const labelsByRange: Record<DateRange, string[]> = {
    today: ['9 am', '12 pm', '3 pm', '6 pm', '9 pm'],
    '7d': ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    '30d': ['1', '6', '11', '16', '21', '26', '30'],
    thisMonth: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
}

const baseSales = [260, 430, 350, 620, 540, 780, 690]

export function getDashboardData(range: DateRange): DashboardData {
    const multiplier = rangeMultiplier[range]
    const labels = labelsByRange[range]
    const points = labels.map((label, index) => ({
        label,
        sales: Math.round((baseSales[index % baseSales.length] + index * 24) * multiplier),
        orderCount: 0,
    }))
    const total = points.reduce((sum, point) => sum + point.sales, 0)
    const orderCount = Math.max(8, Math.round(total / 178))
    const averageTicket = Math.round(total / orderCount)

    return {
        sales: {
            total,
            ordersCount: orderCount,
            trend: trendByRange[range],
            averageTicket,
            points,
        },
        orders: {
            total: orderCount,
            recent: [
                { id: '#1048', customer: 'Jorge Ramírez', amount: 307, status: 'completed' },
                { id: '#1047', customer: 'Mariana López', amount: 189, status: 'preparing' },
                { id: '#1046', customer: 'Carlos Vega', amount: 425, status: 'pending' },
                { id: '#1045', customer: 'Ana Torres', amount: 248, status: 'completed' },
                { id: '#1044', customer: 'Luis Pérez', amount: 156, status: 'completed' },
            ],
        },
        products: {
            totalActive: 18,
            bestSellers: [
                { name: 'Combo Clásico', orders: 42 },
                { name: 'Hamburguesa BBQ', orders: 31 },
                { name: 'Papas sazonadas', orders: 27 },
                { name: '6 Wings', orders: 19 },
            ],
        },
        insights: [
            {
                label: 'Ventas',
                value: `+${trendByRange[range]}%`,
                detail: 'comparado con el periodo anterior',
            },
            {
                label: 'Mejor día',
                value: range === 'today' ? 'Hoy' : 'Viernes',
                detail: 'es cuando más pedidos recibes',
            },
        ],
    }
}
