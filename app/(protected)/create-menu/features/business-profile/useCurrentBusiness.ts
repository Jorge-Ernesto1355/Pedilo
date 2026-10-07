'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError, normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import { useAuthStore } from '@/store/authStore'

export type CurrentBusiness = {
    id: string
    name?: string
    slug?: string
    description?: string
    ubication?: string
    ubicationMaps?: unknown
    logoUrl?: string | null
    logoBlurUrl?: string | null
    coverUrl?: string | null
    coverBlurUrl?: string | null
    businessSchedule?:
        | {
              days?: unknown
              openTime?: unknown
              closeTime?: unknown
          }
        | Array<{ key?: unknown; label?: unknown; enabled?: unknown }>
        | null
    schedule?: {
        days?: unknown
        openTime?: unknown
        closeTime?: unknown
    } | null
}

type BusinessMineResponse = {
    business?: CurrentBusiness | null
    error?: { code?: unknown }
    result?: string
}

export const currentBusinessQueryKey = (userId: string) => ['business', 'mine', userId] as const

function isBusinessNotFound(error: unknown) {
    if (error instanceof ApiError) {
        return error.code === 'BUSINESS_NOT_FOUND' || error.status === 404
    }
    return false
}

async function fetchCurrentBusiness(): Promise<CurrentBusiness | null> {
    try {
        const { data } = await apiClient.get<BusinessMineResponse>('/businesses/mine', {
            withCredentials: true,
        })

        if (data.error?.code === 'BUSINESS_NOT_FOUND') return null
        if (data.result) {
            try {
                const result = JSON.parse(data.result) as BusinessMineResponse
                if (result.error?.code === 'BUSINESS_NOT_FOUND') return null
            } catch {
                // Ignore non-JSON result fields and use the response contract below.
            }
        }
        if (data.business && typeof data.business.id === 'string') return data.business
        if (data.business === null) return null

        throw new Error('La respuesta del negocio no tiene el formato esperado.')
    } catch (error) {
        const normalizedError = normalizeApiError(error)
        if (isBusinessNotFound(normalizedError)) return null
        throw normalizedError
    }
}

export function useCurrentBusiness() {
    const user = useAuthStore((state) => state.user)
    const setUser = useAuthStore((state) => state.setUser)
    const userId = user?.id
    const query = useQuery({
        queryKey: currentBusinessQueryKey(userId ?? 'anonymous'),
        queryFn: fetchCurrentBusiness,
        enabled: Boolean(userId),
        staleTime: 0,
        refetchOnMount: 'always',
    })

    useEffect(() => {
        if (!user || !query.isSuccess) return
        const businessId = query.data?.id ?? null
        if (user.businessId !== businessId) setUser({ ...user, businessId })
    }, [query.data, query.isSuccess, setUser, user])

    return query
}
