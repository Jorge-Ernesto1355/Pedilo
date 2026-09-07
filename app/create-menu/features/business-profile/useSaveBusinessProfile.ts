'use client'

import { useMutation } from '@tanstack/react-query'
import type { BusinessProfileValues } from './businessProfile.schema'

export const BUSINESS_PROFILE_STORAGE_KEY = 'menuly_business_profile'

export function useSaveBusinessProfile() {
    return useMutation({
        // This is the integration boundary for the future business profile API.
        mutationFn: async (values: BusinessProfileValues) => {
            if (typeof window !== 'undefined') window.localStorage.setItem(BUSINESS_PROFILE_STORAGE_KEY, JSON.stringify(values))
            return values
        },
    })
}
