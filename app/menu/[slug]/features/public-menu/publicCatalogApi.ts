import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { publicApiClient } from '@/src/lib/api/publicClient'
import type { PublicCatalog, PublicDiscountPrice } from './publicCatalog.types'

export async function getPublicBusinessCatalog(slug: string): Promise<PublicCatalog> {
    try {
        const response = await publicApiClient.get<PublicCatalog>(
            `/public/businesses/${encodeURIComponent(slug)}/catalog`,
        )
        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function getPublicBusinessDiscounts(slug: string): Promise<PublicDiscountPrice[]> {
    try {
        const response = await publicApiClient.get<{ discounts: PublicDiscountPrice[] }>(
            `/public/businesses/${encodeURIComponent(slug)}/discounts`,
        )
        return response.data.discounts
    } catch (error) {
        throw normalizeApiError(error)
    }
}
