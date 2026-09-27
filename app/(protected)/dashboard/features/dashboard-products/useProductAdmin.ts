'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getMenus } from '@/app/(protected)/create-menu/features/category-management/menuApi'
import {
    getBestSellingProducts,
    getMostRequestedProducts,
    getProductStats,
    getProductSummary,
    getProductsPaged,
} from '../../products/services/productService'
import type {
    ProductAnalyticsParams,
    ProductListParams,
} from '@/app/(protected)/create-menu/features/product-management/productApi'

export function useProductCatalog(params: ProductListParams) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['product-catalog', businessId, params],
        queryFn: () => getProductsPaged(businessId as string, params),
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
    })
}

export function useProductStats() {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['product-stats', businessId],
        queryFn: () => getProductStats(businessId as string),
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
    })
}

export function useProductCategories() {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['product-categories', businessId],
        queryFn: getMenus,
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
    })
}

export function useProductAnalytics(params: ProductAnalyticsParams) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const enabled = Boolean(businessId)
    const bestSelling = useQuery({
        queryKey: ['product-analytics', 'best-selling', businessId, params],
        queryFn: () => getBestSellingProducts(businessId as string, params),
        enabled,
        staleTime: 5 * 60 * 1000,
    })
    const mostRequested = useQuery({
        queryKey: ['product-analytics', 'most-requested', businessId, params],
        queryFn: () => getMostRequestedProducts(businessId as string, params),
        enabled,
        staleTime: 5 * 60 * 1000,
    })
    const summary = useQuery({
        queryKey: ['product-analytics', 'summary', businessId, params],
        queryFn: () => getProductSummary(businessId as string, params),
        enabled,
        staleTime: 5 * 60 * 1000,
    })
    return { bestSelling, mostRequested, summary }
}
