export const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY', 'CANCELLED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export const ORDER_PERIODS = ['today', '7d', '30d', 'lastMonth'] as const
export type OrderPeriod = (typeof ORDER_PERIODS)[number]
export type OrderItem = {
    id?: string
    productId: string
    productName?: string
    name?: string
    quantity: number
    unitPrice?: number
    subtotal?: number
    options?: Array<{ id?: string; optionId?: string; name?: string; price?: number }>
}
export type OrderStatusHistory = { id?: string; status: OrderStatus; createdAt: string }
export type Order = {
    id: string
    orderNumber: number
    status: OrderStatus
    customerId: string | null
    subtotal: number
    total: number
    customerName: string | null
    customerPhone: string | null
    notes: string | null
    items: OrderItem[]
    statusHistory: OrderStatusHistory[]
    createdAt?: string
    updatedAt?: string
}
export type OrdersResponse = { orders: Order[]; page: number; limit: number; total: number }
export type CreateOrderPayload = {
    customer: { name: string; phone: string }
    items: Array<{ productId: string; quantity: number; optionIds: string[] }>
    notes?: string
}
export type RestaurantOrderItemPayload = {
    productId: string
    quantity: number
    optionIds?: string[]
}
export type CreateRestaurantOrderPayload = {
    customerName?: string
    customerPhone?: string | null
    notes?: string
    items: RestaurantOrderItemPayload[]
}
export type Customer = {
    id: string
    businessId: string
    name: string
    phone: string
    orderCount: number
    createdAt?: string
    updatedAt?: string
    orders?: Array<{
        id: string
        orderNumber: number
        status: OrderStatus
        total: number
        createdAt?: string
    }>
}
export type CustomersResponse = {
    customers: Customer[]
    page: number
    limit: number
    total: number
}
export type CustomerPayload = { name: string; phone: string }
