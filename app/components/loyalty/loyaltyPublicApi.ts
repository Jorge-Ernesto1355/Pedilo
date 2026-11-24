import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { publicApiClient } from '@/src/lib/api/publicClient'
import type { LoyaltyDesign } from './loyaltyDesign'

// Endpoints públicos de la tarjeta de lealtad: sin cuenta. El token viaja en la URL solo
// para leer la tarjeta (link privado); en la cotización va en el cuerpo.

export type LoyaltyRewardType = 'PERCENT' | 'FIXED' | 'FREE_PRODUCT'

export type PublicLoyaltyReward = {
    id: string
    type: LoyaltyRewardType
    label: string
    productName: string | null
    expiresAt: string | null
}

export type PublicLoyaltyCard =
    | {
          status: 'ACTIVE'
          card: {
              customerFirstName: string | null
              stampsCount: number
              stampsRequired: number
              cyclesCompleted: number
              rewards: PublicLoyaltyReward[]
              recentStamps: Array<{ createdAt: string }>
          }
          program: { rewardLabel: string; stampsRequired: number; minOrderAmount: number }
          design: LoyaltyDesign
          restaurant: { name: string; slug: string; logoUrl: string | null }
      }
    | { status: 'PAUSED'; restaurant: { name: string; slug: string; logoUrl: string | null } }

export type PublicLoyaltyProgram = {
    stampsRequired: number
    rewardType: LoyaltyRewardType
    rewardValue: number
    rewardLabel: string
    minOrderAmount: number
    design: LoyaltyDesign
    restaurant: { name: string; logoUrl: string | null }
}

export type LoyaltyRewardQuote = {
    programActive: boolean
    card: { stampsCount: number; stampsRequired: number }
    reward: {
        id: string
        type: LoyaltyRewardType
        value: number
        label: string
        productName: string | null
        expiresAt: string | null
    } | null
    discount: number
    freeProduct: { id: string; name: string; price: number } | null
    unavailableReason: 'PRODUCT_UNAVAILABLE' | null
}

/** Tarjeta inexistente, de otro restaurante o con token regenerado: misma respuesta. */
export function isLoyaltyCardNotFound(error: unknown) {
    const apiError = normalizeApiError(error)
    return apiError.code === 'LOYALTY_CARD_NOT_FOUND' || apiError.status === 404
}

export async function getPublicLoyaltyCard(token: string) {
    const { data } = await publicApiClient.get<PublicLoyaltyCard>(
        `/public/loyalty/${encodeURIComponent(token)}`,
    )
    return data
}

export async function getPublicLoyaltyProgram(slug: string) {
    const { data } = await publicApiClient.get<{ program: PublicLoyaltyProgram | null }>(
        `/public/businesses/${encodeURIComponent(slug)}/loyalty`,
    )
    return data.program
}

export async function quoteLoyaltyReward(slug: string, cardToken: string, subtotal: number) {
    const { data } = await publicApiClient.post<{ quote: LoyaltyRewardQuote }>(
        `/public/businesses/${encodeURIComponent(slug)}/loyalty/reward-quote`,
        { cardToken, subtotal },
    )
    return data.quote
}
