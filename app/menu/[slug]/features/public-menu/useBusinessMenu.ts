'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPublicBusinessCatalog, getPublicBusinessDiscounts } from './publicCatalogApi'
import type { PublicCatalog } from './publicCatalog.types'

export function useBusinessMenu(slug: string) {
    const client = useQueryClient()
    const catalogQuery = useQuery({
        queryKey: ['public-business-catalog', slug],
        queryFn: () => getPublicBusinessCatalog(slug),
        enabled: Boolean(slug),
        retry: 1,
        staleTime: 5 * 60 * 1000,
    })
    const hasEmbeddedDiscounts = Boolean(catalogQuery.data?.menus.some((menu) => menu.categories.some((category) => category.products.some((product) => product.discount))))
    const discountsQuery = useQuery({
        queryKey: ['public-business-discounts', slug],
        queryFn: () => getPublicBusinessDiscounts(slug),
        enabled: Boolean(catalogQuery.data?.business.id) && !hasEmbeddedDiscounts,
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
        staleTime: 60 * 1000,
    })
    const data = useMemo<PublicCatalog | undefined>(() => {
        const catalog = catalogQuery.data
        if (!catalog || !discountsQuery.data?.length) return catalog
        const prices = new Map(discountsQuery.data.map((item) => [item.productId, item]))
        return {
            ...catalog,
            menus: catalog.menus.map((menu) => ({
                ...menu,
                categories: menu.categories.map((category) => ({
                    ...category,
                    products: category.products.map((product) => ({ ...product, ...(prices.get(product.id) ?? {}) })),
                })),
            })),
        }
    }, [catalogQuery.data, discountsQuery.data])
    function clearPublicDiscounts() {
        client.setQueryData(['public-business-discounts', slug], [])
    }

    return { ...catalogQuery, data, discountsQuery, clearPublicDiscounts }
}
