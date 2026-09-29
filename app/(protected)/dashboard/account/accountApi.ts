import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'

export type AccountStats = {
    customers: number
    orders: number
    generated: number
}

export type AccountData = {
    name: string
    email: string
    emailVerified: boolean
    createdAt: string
    stats: AccountStats
}

export type AccountResponse = {
    success?: boolean
    data?: unknown
    message?: string
}

function objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function numberValue(...values: unknown[]) {
    const value = values.find((candidate) => typeof candidate === 'number' || typeof candidate === 'string')
    const parsed = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

export function unwrapAccount(response: AccountResponse): AccountData {
    const root = objectValue(response.data)
    const stats = objectValue(root.stats)
    return {
        name: typeof root.name === 'string' ? root.name : '',
        email: typeof root.email === 'string' ? root.email : '',
        emailVerified: root.emailVerified === true,
        createdAt: typeof root.createdAt === 'string' ? root.createdAt : '',
        stats: {
            customers: numberValue(stats.customers, stats.customersCount, root.customers, root.customersCount, root.totalCustomers),
            orders: numberValue(stats.orders, stats.ordersCount, root.orders, root.ordersCount, root.totalOrders),
            generated: numberValue(
                stats.generated,
                stats.totalGenerated,
                stats.totalRevenue,
                root.generated,
                root.totalGenerated,
                root.totalRevenue,
            ),
        },
    }
}

async function request<T>(operation: () => Promise<{ data: T }>) {
    try {
        const response = await operation()
        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function getAccount() {
    const response = await request(() => apiClient.get<AccountResponse>('/account', { withCredentials: true }))
    return unwrapAccount(response)
}

export async function updateAccountName(name: string) {
    return request(() =>
        apiClient.patch<AccountResponse>('/account', { name }, { withCredentials: true }),
    )
}

export async function requestEmailVerification() {
    return request(() =>
        apiClient.post<AccountResponse>('/account/email-verification', undefined, { withCredentials: true }),
    )
}

export async function resendEmailVerification() {
    return request(() =>
        apiClient.post<AccountResponse>('/account/email-verification/resend', undefined, { withCredentials: true }),
    )
}

export async function verifyEmail(token: string) {
    return request(() => apiClient.post<AccountResponse>('/auth/verify-email', { token }))
}

export async function changeAccountPassword(input: { currentPassword: string; newPassword: string }) {
    return request(() =>
        apiClient.post<AccountResponse>('/account/change-password', input, { withCredentials: true }),
    )
}

export async function deleteAccount() {
    return request(() => apiClient.delete('/auth/account', { withCredentials: true }))
}
