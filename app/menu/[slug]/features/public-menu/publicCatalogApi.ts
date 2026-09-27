import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { publicApiClient } from '@/src/lib/api/publicClient'
import type { PublicCatalog } from './publicCatalog.types'

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
