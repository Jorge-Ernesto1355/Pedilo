'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
    connectGooglePlace,
    disconnectGooglePlace,
    getGooglePlaceRating,
    searchGooglePlaces,
} from './googlePlacesApi'

function useGooglePlacesIdentity() {
    const user = useAuthStore((state) => state.user)
    return { userId: user?.id, businessId: user?.businessId }
}

function ratingQueryKey(userId?: string, businessId?: string) {
    return [
        'dashboard',
        'google-reviews-place-rating',
        userId ?? 'anonymous',
        businessId ?? 'none',
    ] as const
}

export function useGooglePlaceRating() {
    const { userId, businessId } = useGooglePlacesIdentity()
    return useQuery({
        queryKey: ratingQueryKey(userId ?? undefined, businessId ?? undefined),
        queryFn: getGooglePlaceRating,
        enabled: Boolean(userId && businessId),
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    })
}

export function useGooglePlaceSearch(query: string, location: string, enabled: boolean) {
    const { userId, businessId } = useGooglePlacesIdentity()
    return useQuery({
        queryKey: [
            'dashboard',
            'google-reviews-place-search',
            userId ?? 'anonymous',
            businessId ?? 'none',
            query,
            location,
        ],
        queryFn: () => searchGooglePlaces(query, location),
        enabled: Boolean(enabled && query && userId && businessId),
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    })
}

export function useConnectGooglePlace() {
    const queryClient = useQueryClient()
    const { userId, businessId } = useGooglePlacesIdentity()
    const queryKey = ratingQueryKey(userId ?? undefined, businessId ?? undefined)

    return useMutation({
        mutationFn: connectGooglePlace,
        onSuccess: async (response) => {
            if (businessId) {
                try {
                    localStorage.setItem(
                        `pedilo:google-place-name:${businessId}`,
                        JSON.stringify({
                            placeId: response.data.placeId,
                            name: response.data.name,
                        }),
                    )
                } catch {
                    // The rating endpoint remains usable when browser storage is unavailable.
                }
            }
            await queryClient.invalidateQueries({ queryKey })
        },
    })
}

export function useDisconnectGooglePlace() {
    const queryClient = useQueryClient()
    const { userId, businessId } = useGooglePlacesIdentity()
    const queryKey = ratingQueryKey(userId ?? undefined, businessId ?? undefined)

    return useMutation({
        mutationFn: disconnectGooglePlace,
        onSuccess: async () => {
            if (businessId) {
                try {
                    localStorage.removeItem(`pedilo:google-place-name:${businessId}`)
                } catch {
                    // The backend connection state is authoritative if browser storage is unavailable.
                }
            }
            await queryClient.invalidateQueries({ queryKey })
        },
    })
}
