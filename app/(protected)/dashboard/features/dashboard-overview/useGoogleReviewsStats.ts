'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getGoogleReviewsStats } from './googleReviewsStats'
import type { GoogleReviewsStatsPeriod } from './googleReviewsStats'

export function useGoogleReviewsStats(period: GoogleReviewsStatsPeriod) {
    const user = useAuthStore((state) => state.user)
    const businessId = user?.businessId

    return useQuery({
        queryKey: [
            'dashboard',
            'google-reviews-stats',
            user?.id ?? 'anonymous',
            businessId ?? 'none',
            period,
        ],
        queryFn: () => getGoogleReviewsStats(period),
        enabled: Boolean(user?.id && businessId),
        staleTime: 60 * 1000,
    })
}
