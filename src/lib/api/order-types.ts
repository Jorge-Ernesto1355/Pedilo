export const ORDER_STATUSES = [
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
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
    customerId: string
    subtotal: number
    total: number
    customerName: string
    customerPhone: string
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
