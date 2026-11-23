import { ApiError, normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { LoyaltyDesign } from './loyaltyDesign'
import type { LoyaltyRewardType } from './loyaltyPublicApi'

// Endpoints del dueño (con sesión). El restaurante sale siempre de la sesión en el servidor.

export type LoyaltyStampMode = 'MANUAL' | 'AUTO'
export type LoyaltyRewardStatus = 'AVAILABLE' | 'REDEEMED' | 'EXPIRED' | 'VOID'
export type LoyaltyStampSource = 'ORDER_MANUAL' | 'ORDER_AUTO' | 'WALK_IN'

export type LoyaltyProgramInput = {
    enabled: boolean
    stampsRequired: number
    stampMode: LoyaltyStampMode
    minOrderAmount: number
    rewardType: LoyaltyRewardType
    rewardValue: number
    rewardProductId: string | null
    rewardLabel: string | null
    rewardExpiresDays: number | null
    walkInDailyLimit: number
    design: LoyaltyDesign
}

export type LoyaltyProgram = LoyaltyProgramInput & {
    exists: boolean
    rewardLabel: string
    designVersion: number
    rewardProduct: { id: string; name: string; price: number; isAvailable: boolean } | null
    updatedAt: string | null
}

export type LoyaltyCardSummary = {
    id: string
    customerId: string
    stampsCount: number
    cyclesCompleted: number
    stampsRequired: number
}

export type LoyaltyReward = {
    id: string
    status: LoyaltyRewardStatus
    type: LoyaltyRewardType
    value: number
    label: string
    productId: string | null
    productName: string | null
    expiresAt: string | null
    createdAt: string
}

export type LoyaltyStampResult = {
    stamp: {
        id: string
        cycle: number
        position: number
        source: LoyaltyStampSource
        createdAt: string
    }
    card: LoyaltyCardSummary
    reward: LoyaltyReward | null
    customerFirstName: string | null
    alreadyStamped?: boolean
}

export type LoyaltyCardListItem = {
    id: string
    customer: { id: string; name: string | null; phone: string }
    stampsCount: number
    cyclesCompleted: number
    availableRewards: number
    lastStampAt: string | null
}

export type LoyaltyCardFilter = 'all' | 'near' | 'reward'

export type LoyaltyCardList = {
    cards: LoyaltyCardListItem[]
    total: number
    stampsRequired: number
    page: number
    limit: number
}

export type LoyaltySummary = { activeCards: number; stampsThisWeek: number; pendingRewards: number }

export type LoyaltyHistoryStamp = {
    id: string
    cycle: number
    position: number
    source: LoyaltyStampSource
    createdAt: string
    orderId: string | null
    orderNumber: number | null
    note: string | null
    createdBy: string | null
    voidedAt: string | null
    voidedReason: string | null
    voidedBy: string | null
}

export type LoyaltyHistoryReward = LoyaltyReward & {
    redeemedAt: string | null
    redeemedOrderNumber: number | null
    voidedAt: string | null
}

export type LoyaltyCardDetail = {
    card: LoyaltyCardSummary & {
        customer: { id: string; name: string | null; phone: string }
        cardToken: string
        createdAt: string
    }
    stamps: LoyaltyHistoryStamp[]
    rewards: LoyaltyHistoryReward[]
    walkInStampsToday: number
}

export type LoyaltyVoidResult = {
    stampId: string
    orderId: string | null
    card: LoyaltyCardSummary
    voidedRewardId: string | null
}

const credentials = { withCredentials: true }

async function request<T>(call: () => Promise<{ data: T }>) {
    try {
        return (await call()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export const loyaltyQueryKeys = {
    program: ['loyalty', 'program'] as const,
    summary: ['loyalty', 'summary'] as const,
    cards: (params: Record<string, unknown>) => ['loyalty', 'cards', params] as const,
    card: (customerId: string) => ['loyalty', 'card', customerId] as const,
}

export function getLoyaltyProgram() {
    return request(() =>
        apiClient.get<{ program: LoyaltyProgram }>('/businesses/loyalty/program', credentials),
    ).then((data) => data.program)
}

export function saveLoyaltyProgram(input: LoyaltyProgramInput) {
    return request(() =>
        apiClient.put<{ program: LoyaltyProgram }>(
            '/businesses/loyalty/program',
            input,
            credentials,
        ),
    ).then((data) => data.program)
}

export function getLoyaltySummary() {
    return request(() =>
        apiClient.get<{ summary: LoyaltySummary }>('/businesses/loyalty/summary', credentials),
    ).then((data) => data.summary)
}

export function listLoyaltyCards(params: {
    filter?: LoyaltyCardFilter
    search?: string
    customerIds?: string[]
    page?: number
    limit?: number
}) {
    return request(() =>
        apiClient.get<LoyaltyCardList>('/businesses/loyalty/cards', {
            ...credentials,
            params: {
                filter: params.filter ?? 'all',
                ...(params.search ? { search: params.search } : {}),
                ...(params.customerIds?.length
                    ? { customerIds: params.customerIds.join(',') }
                    : {}),
                page: params.page ?? 1,
                limit: params.limit ?? 20,
            },
        }),
    )
}

export function getLoyaltyCard(customerId: string) {
    return request(() =>
        apiClient.get<LoyaltyCardDetail>(
            `/businesses/loyalty/cards/${encodeURIComponent(customerId)}`,
            credentials,
        ),
    )
}

export function rotateLoyaltyCardToken(customerId: string) {
    return request(() =>
        apiClient.post<{ cardToken: string }>(
            `/businesses/loyalty/cards/${encodeURIComponent(customerId)}/rotate-token`,
            {},
            credentials,
        ),
    )
}

export function giveWalkInStamp(customerId: string, note: string | null) {
    return request(() =>
        apiClient.post<LoyaltyStampResult>(
            `/businesses/loyalty/customers/${encodeURIComponent(customerId)}/stamps`,
            note ? { note } : {},
            credentials,
        ),
    )
}

export function stampLoyaltyOrder(orderId: string, customer?: { name: string; phone: string }) {
    return request(() =>
        apiClient.post<LoyaltyStampResult>(
            `/businesses/orders/${encodeURIComponent(orderId)}/stamp`,
            customer ? { customer } : {},
            credentials,
        ),
    )
}

export function voidLoyaltyOrderStamp(orderId: string, reason: string) {
    return request(() =>
        apiClient.delete<LoyaltyVoidResult>(
            `/businesses/orders/${encodeURIComponent(orderId)}/stamp`,
            {
                ...credentials,
                data: { reason },
            },
        ),
    )
}

export function voidLoyaltyStamp(stampId: string, reason: string) {
    return request(() =>
        apiClient.post<LoyaltyVoidResult>(
            `/businesses/loyalty/stamps/${encodeURIComponent(stampId)}/void`,
            { reason },
            credentials,
        ),
    )
}

export function redeemLoyaltyReward(rewardId: string, orderId: string | null = null) {
    return request(() =>
        apiClient.post<{
            reward: LoyaltyReward
            order: { id: string; total: number; loyaltyDiscountAmount: number } | null
        }>(
            `/businesses/loyalty/rewards/${encodeURIComponent(rewardId)}/redeem`,
            orderId ? { orderId } : {},
            credentials,
        ),
    )
}

/** Mensajes breves en español para los errores conocidos (el backend ya responde en español). */
export function loyaltyErrorMessage(
    error: unknown,
    fallback = 'No pudimos completar la acción. Intenta de nuevo.',
) {
    // Las funciones de este módulo ya lanzan ApiError; normalizarlo otra vez perdería el mensaje.
    const apiError = error instanceof ApiError ? error : normalizeApiError(error)
    if (apiError.code === 'VALIDATION_ERROR') return 'Revisa los datos e intenta de nuevo.'
    if (apiError.code && apiError.code.startsWith('LOYALTY_') && apiError.message)
        return apiError.message
    if (apiError.code === 'CUSTOMER_NOT_FOUND') return 'No encontramos a este cliente.'
    if (apiError.code === 'ORDER_NOT_FOUND') return 'No encontramos este pedido.'
    if (apiError.code === 'RATE_LIMITED')
        return 'Demasiadas solicitudes. Intenta de nuevo en un momento.'
    return fallback
}
