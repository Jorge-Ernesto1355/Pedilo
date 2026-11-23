export const ORDER_STATUSES = [
    'PENDING',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type OrderSource = 'PUBLIC' | 'RESTAURANT'
export type OrderFulfillmentType = 'DINE_IN' | 'PICKUP' | 'DELIVERY'
/** El pedido manual del restaurante y la edición no manejan domicilio. */
export type RestaurantFulfillmentType = Exclude<OrderFulfillmentType, 'DELIVERY'>
/** Snapshot de entrega de un pedido a domicilio (distancia y envío calculados por el servidor). */
export type OrderDeliverySnapshot = {
    address: string
    /** Null solo en pedidos creados antes de existir el campo. */
    neighborhood: string | null
    reference: string | null
    latitude: number
    longitude: number
    distanceKm: number
}
export type OrderPaymentMethod = 'CASH' | 'TRANSFER'
export type DeliveryDispatchStatus =
    'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED'
export type DeliveryFailureReason =
    'CUSTOMER_UNREACHABLE' | 'WRONG_ADDRESS' | 'CUSTOMER_REJECTED' | 'OTHER'
/** Entrega con repartidor. El restaurante solo ve al repartidor de SUS entregas. */
export type OrderDispatch = {
    status: DeliveryDispatchStatus
    /** Cuándo se publicó la oferta vigente (aviso de "sin tomar" en la comanda). */
    offerCreatedAt: string
    offerExpiresAt: string
    acceptedAt: string | null
    handedOffAt: string | null
    deliveredAt: string | null
    failedAt: string | null
    cancelledAt: string | null
    failureReason: DeliveryFailureReason | null
    foodTotal: number
    deliveryFee: number
    paymentMethod: OrderPaymentMethod
    /** Lo que el repartidor le paga al restaurante al recoger. */
    amountCourierAdvances: number
    amountCourierCollects: number
    courier: { name: string; phone: string } | null
}
export type TransferCardSnapshot = {
    clabe: string
    beneficiaryName: string
    bankCode: string
    bankName: string
    restaurantName: string
}
export type CustomerDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'
export type CustomerDiscountStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED' | 'CANCELLED'
export type CustomerDiscount = {
    id: string
    type: CustomerDiscountType
    value: number
    status: CustomerDiscountStatus
    expiresAt: string | null
    createdAt: string
    usedAt: string | null
    usedOrder?: { id: string; orderNumber: number } | null
}
export const ORDER_PERIODS = ['today', '7d', '30d', 'lastMonth'] as const
export type OrderPeriod = (typeof ORDER_PERIODS)[number]
export type OrderItem = {
    id?: string
    productId: string
    productName?: string
    name?: string
    quantity: number
    unitPrice?: number
    unitPriceOriginal?: number
    unitPriceFinal?: number
    discountAmount?: number
    discountId?: string | null
    discountLabel?: string | null
    subtotal?: number
    options?: Array<{
        id?: string
        optionId?: string
        groupName?: string | null
        name?: string
        price?: number
    }>
}
export type OrderStatusHistory = { id?: string; status: OrderStatus; createdAt: string }
export type Order = {
    id: string
    businessId?: string
    orderNumber: number
    status: OrderStatus
    source?: OrderSource
    customerId: string | null
    subtotal: number
    discountAmount?: number
    total: number
    customerName: string | null
    customerPhone: string | null
    notes: string | null
    fulfillmentType: OrderFulfillmentType
    paymentMethod?: OrderPaymentMethod
    transferCard?: TransferCardSnapshot
    /** Envío (solo a domicilio). `total` es solo la comida. */
    deliveryFee?: number
    delivery?: OrderDeliverySnapshot | null
    /** Solo transferencias: cuándo el restaurante marcó el pago como recibido. */
    transferConfirmedAt?: string | null
    /** Entrega con repartidor (null mientras no se busca repartidor). */
    dispatch?: OrderDispatch | null
    items: OrderItem[]
    statusHistory: OrderStatusHistory[]
    /** Monotonic version of persisted status changes; older events are ignored. */
    statusRevision?: number
    /** Client-only marker used to distinguish a pending optimistic write from server confirmation. */
    statusOptimistic?: boolean
    /** Client-only state for a restaurant order while the create request is unresolved. */
    creationState?: 'pending' | 'uncertain'
    createdAt?: string
    updatedAt?: string
    version?: number
}
export type OrderStatusUpdate = Pick<Order, 'id' | 'orderNumber' | 'status' | 'updatedAt'> & {
    statusRevision: number
}
export type OrdersResponse = { orders: Order[]; page: number; limit: number; total: number }
export type CreateOrderPayload = {
    customer: { name: string; phone: string }
    fulfillmentType: OrderFulfillmentType
    paymentMethod?: OrderPaymentMethod
    items: Array<{
        productId: string
        quantity: number
        optionIds: string[]
        comboChoiceIds?: string[]
        expectedUnitPrice?: number
    }>
    notes?: string
    ignoreCustomerDiscount?: boolean
    expectedSubtotal?: number
    acceptPriceChange?: boolean
    /** Solo pedidos a domicilio. Distancia y envío los calcula el servidor. */
    delivery?: {
        address: string
        neighborhood: string
        reference?: string
        latitude: number
        longitude: number
    }
    /** Envío que vio el cliente; si el del servidor difiere, el pedido no se crea. */
    expectedDeliveryFee?: number
}
export type RestaurantOrderItemPayload = {
    productId: string
    quantity: number
    optionIds?: string[]
    comboChoiceIds?: string[]
}
export type CreateRestaurantOrderPayload = {
    customerName?: string
    customerPhone?: string | null
    fulfillmentType?: RestaurantFulfillmentType
    notes?: string
    items: RestaurantOrderItemPayload[]
}
export type UpdateOrderPayload = {
    expectedVersion: number
    customerId?: string | null
    fulfillmentType?: RestaurantFulfillmentType
    paymentMethod?: OrderPaymentMethod
    items: Array<{
        id?: string
        productId: string
        quantity: number
        optionIds?: string[]
        comboChoiceIds?: string[]
    }>
}
export type Customer = {
    id: string
    businessId: string
    name: string
    phone: string
    isDisabled?: boolean
    orderCount: number
    totalSpent: number
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
export type CustomerOrderHistory = {
    id: string
    orderNumber: number
    status: OrderStatus
    total: number
    subtotal: number
    discountAmount: number
    notes: string | null
    fulfillmentType: OrderFulfillmentType
    createdAt: string
    items: Array<{
        id: string
        productName: string
        quantity: number
        unitPrice: number
        subtotal: number
        options: Array<{ name: string; groupName: string | null; price: number }>
    }>
}
export type CustomerOrdersResponse = {
    orders: CustomerOrderHistory[]
    page: number
    limit: number
    total: number
}
export type CustomersResponse = {
    customers: Customer[]
    page: number
    limit: number
    total: number
}
export type CustomerPayload = { name: string; phone: string }
