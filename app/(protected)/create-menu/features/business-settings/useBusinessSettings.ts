'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    createBusinessSettings,
    getBusinessSettings,
    updateBusinessSettings,
} from './businessSettingsApi'
import type { BusinessSettingsInput } from './businessSettings.types'
import { useAuthStore } from '@/store/authStore'

export function useBusinessSettings(enabled: boolean) {
    const queryClient = useQueryClient()
    const businessId = useAuthStore((state) => state.user?.businessId)
    const queryKey = ['business-settings', businessId] as const
    const settings = useQuery({
        queryKey,
        queryFn: getBusinessSettings,
        enabled,
        staleTime: 10 * 60 * 1000,
    })

    const create = useMutation({
        mutationFn: (input: BusinessSettingsInput) => createBusinessSettings(input),
        onSuccess: (data) => {
            queryClient.setQueryData(queryKey, data)
            void queryClient.invalidateQueries({ queryKey })
        },
    })

    const update = useMutation({
        mutationFn: (input: BusinessSettingsInput) => updateBusinessSettings(input),
        onSuccess: (data) => {
            queryClient.setQueryData(queryKey, data)
            void queryClient.invalidateQueries({ queryKey })
        },
    })

    return { settings, create, update }
}
