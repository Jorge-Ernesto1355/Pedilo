import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from './client'
import { publicApiClient } from './publicClient'
import type {
    CreateOrderPayload,
    CreateRestaurantOrderPayload,
    Customer,
    CustomerPayload,
    CustomerOrdersResponse,
    CustomersResponse,
    Order,
    OrderPeriod,
    OrderStatus,
    OrderStatusUpdate,
    OrdersResponse,
} from './order-types'

const credentials = { withCredentials: true }
function query(params: Record<string, string | number | undefined>) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') search.set(key, String(value))
    })
    return search.toString()
}
async function request<T>(call: () => Promise<{ data: T }>) {
    try {
        return (await call()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export function createPublicOrder(businessId: string, payload: CreateOrderPayload) {
    return request(() =>
        publicApiClient.post<{ order: Order }>(`/businesses/${businessId}/orders`, payload),
    ).then((body) => body.order)
}
export function createRestaurantOrder(
    businessId: string,
    payload: CreateRestaurantOrderPayload,
    idempotencyKey?: string,
) {
    return request(() =>
        apiClient.post<{ order: Order }>(
            `/businesses/${businessId}/orders/restaurant`,
            payload,
            idempotencyKey
                ? { ...credentials, headers: { 'Idempotency-Key': idempotencyKey } }
                : credentials,
        ),
    ).then((body) => body.order)
}
export function getOrders(
    businessId: string,
    params: {
        page: number
        limit: number
        status?: OrderStatus
        search?: string
        period?: OrderPeriod
    },
) {
    return request(() =>
        apiClient.get<OrdersResponse>(
            `/businesses/${businessId}/orders?${query(params)}`,
            credentials,
        ),
    )
}
export function getOrder(orderId: string, signal?: AbortSignal) {
    return request(() =>
        apiClient.get<{ order: Order }>(`/businesses/orders/${orderId}`, {
            ...credentials,
            signal,
        }),
    ).then((body) => body.order)
}
export function updateOrderStatus(orderId: string, status: OrderStatus) {
    return request(() =>
        apiClient.patch<{ order: OrderStatusUpdate }>(
            `/businesses/orders/${orderId}/status`,
            { status },
            credentials,
        ),
    ).then((body) => body.order)
}
export function getCustomers(
    businessId: string,
    params: { page: number; limit: number; search?: string },
) {
    return request(() =>
        apiClient.get<CustomersResponse>(
            `/businesses/${businessId}/customers?${query(params)}`,
            credentials,
        ),
    )
}
export function getCustomer(customerId: string) {
    return request(() =>
        apiClient.get<{ customer: Customer }>(`/businesses/customers/${customerId}`, credentials),
    ).then((body) => body.customer)
}
export function createCustomer(businessId: string, payload: CustomerPayload) {
    return request(() =>
        apiClient.post<{ customer: Customer }>(
            `/businesses/${businessId}/customers`,
            payload,
            credentials,
        ),
    ).then((body) => body.customer)
}
export function updateCustomer(customerId: string, payload: CustomerPayload) {
    return request(() =>
        apiClient.patch<{ customer: Customer }>(
            `/businesses/customers/${customerId}`,
            payload,
            credentials,
        ),
    ).then((body) => body.customer)
}
export function setCustomerDisabled(customerId: string, disabled: boolean) {
    return request(() =>
        apiClient.patch<{ customer: Customer }>(
            `/businesses/customers/${customerId}/status`,
            { disabled },
            credentials,
        ),
    ).then((body) => body.customer)
}
export function deleteCustomer(customerId: string) {
    return request(() => apiClient.delete<void>(`/businesses/customers/${customerId}`, credentials))
}
export function getCustomerOrders(customerId: string, params: { page: number; limit: number }) {
    return request(() =>
        apiClient.get<CustomerOrdersResponse>(
            `/businesses/customers/${customerId}/orders?${query(params)}`,
            credentials,
        ),
    )
}
