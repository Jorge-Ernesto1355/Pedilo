'use client'

import { useQuery } from '@tanstack/react-query'
import { getPublicBusinessCatalog } from './publicCatalogApi'

export function useBusinessMenu(slug: string) {
    return useQuery({
        queryKey: ['public-business-catalog', slug],
        queryFn: () => getPublicBusinessCatalog(slug),
        enabled: Boolean(slug),
        retry: 1,
        staleTime: 5 * 60 * 1000,
    })
}
