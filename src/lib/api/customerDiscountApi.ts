import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from './client'
import { publicApiClient } from './publicClient'
import type { CustomerDiscount, CustomerDiscountType } from './order-types'

const credentials = { withCredentials: true }

async function request<T>(call: () => Promise<{ data: T }>) {
    try {
        return (await call()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export function getOrderCustomerDiscount(orderId: string) {
    return request(() =>
        apiClient.get<{ discount: CustomerDiscount | null }>(
            `/businesses/orders/${orderId}/discount`,
            credentials,
        ),
    ).then((body) => body.discount)
}

export function grantOrderCustomerDiscount(
    orderId: string,
    discount: { type: CustomerDiscountType; value: number },
) {
    return request(() =>
        apiClient.post<{ discount: CustomerDiscount }>(
            `/businesses/orders/${orderId}/discount`,
            discount,
            credentials,
        ),
    ).then((body) => body.discount)
}

export function getCheckoutCustomerDiscount(businessId: string, customerPhone: string) {
    return request(() =>
        publicApiClient.post<{ discount: CustomerDiscount | null }>(
            `/businesses/${businessId}/customer-discount/preview`,
            { customerPhone },
        ),
    ).then((body) => body.discount)
}

export function getCustomerDiscounts(customerId: string) {
    return request(() =>
        apiClient.get<{ discounts: CustomerDiscount[] }>(
            `/businesses/customers/${customerId}/discounts`,
            credentials,
        ),
    ).then((body) => body.discounts)
}

export function grantCustomerDiscount(
    customerId: string,
    discount: { type: CustomerDiscountType; value: number },
) {
    return request(() =>
        apiClient.post<{ discount: CustomerDiscount }>(
            `/businesses/customers/${customerId}/discounts`,
            discount,
            credentials,
        ),
    ).then((body) => body.discount)
}

export function revokeCustomerDiscount(customerId: string, discountId: string) {
    return request(() =>
        apiClient.delete<{ discount: CustomerDiscount }>(
            `/businesses/customers/${customerId}/discounts/${discountId}`,
            credentials,
        ),
    ).then((body) => body.discount)
}
