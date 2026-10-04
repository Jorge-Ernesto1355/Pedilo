import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from './client'
import { publicApiClient } from './publicClient'
import type {
    CreateOrderPayload,
    Customer,
    CustomerPayload,
    CustomersResponse,
    Order,
    OrderStatus,
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
export function getOrders(
    businessId: string,
    params: { page: number; limit: number; status?: OrderStatus; search?: string },
) {
    return request(() =>
        apiClient.get<OrdersResponse>(
            `/businesses/${businessId}/orders?${query(params)}`,
            credentials,
        ),
    )
}
export function getOrder(orderId: string) {
    return request(() =>
        apiClient.get<{ order: Order }>(`/businesses/orders/${orderId}`, credentials),
    ).then((body) => body.order)
}
export function updateOrderStatus(orderId: string, status: OrderStatus) {
    return request(() =>
        apiClient.patch<{ order: Order }>(
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
export function deleteCustomer(customerId: string) {
    return request(() => apiClient.delete<void>(`/businesses/customers/${customerId}`, credentials))
}
