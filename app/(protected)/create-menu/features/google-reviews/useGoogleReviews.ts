'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { getGoogleReviews, saveGoogleReviewUrl } from './googleReviewsApi'
import type { GoogleReviewsResponse } from './googleReviews.types'

export function useGoogleReviews(enabled: boolean) {
    const queryClient = useQueryClient()
    const businessId = useAuthStore((state) => state.user?.businessId)
    const queryKey = ['google-reviews', businessId] as const
    const settings = useQuery({
        queryKey,
        queryFn: getGoogleReviews,
        enabled,
        staleTime: 10 * 60 * 1000,
    })

    const save = useMutation({
        mutationFn: (url: string) => saveGoogleReviewUrl(url),
        onSuccess: (data) => {
            const current = queryClient.getQueryData<GoogleReviewsResponse>(queryKey)
            queryClient.setQueryData(queryKey, {
                ...data,
                business: data.business ?? current?.business ?? null,
            })
        },
    })

    return { settings, save }
}
