'use client'

import { useMutation } from '@tanstack/react-query'
import { sileo } from 'sileo'
import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { useAuthStore } from '@/store/authStore'
import type { BusinessProfileValues } from './businessProfile.schema'

type BusinessResponse = {
    business?: {
        id?: string
        name?: string
        slug?: string
        description?: string
    }
}

function toBusinessPayload(values: BusinessProfileValues) {
    const dayKeys = {
        mon: 'monday',
        tue: 'tuesday',
        wed: 'wednesday',
        thu: 'thursday',
        fri: 'friday',
        sat: 'saturday',
        sun: 'sunday',
    } as const

    return {
        name: values.businessName,
        slug: values.slug,
        description: values.description,
        ubication: values.location,
        ubicationMaps: values.coordinates,
        businessSchedule: {
            days: values.businessHours.days.map((day) => ({
                key: dayKeys[day.key],
                label: day.label,
                enabled: day.enabled,
            })),
            openTime: values.businessHours.openTime,
            closeTime: values.businessHours.closeTime,
        },
    }
}

export function useSaveBusinessProfile() {
    return useMutation({
        mutationFn: async (values: BusinessProfileValues): Promise<BusinessResponse> => {
            const businessId = useAuthStore.getState().user?.businessId
            const payload = toBusinessPayload(values)

            try {
                const response = businessId
                    ? await apiClient.patch<BusinessResponse>(`/businesses/${businessId}`, payload, { withCredentials: true })
                    : await apiClient.post<BusinessResponse>('/businesses', payload, { withCredentials: true })

                let business = response.data.business
                if (!businessId) {
                    try {
                        const mineResponse = await apiClient.get<BusinessResponse>('/businesses/mine', { withCredentials: true })
                        business = mineResponse.data.business ?? business
                    } catch {
                        // The creation succeeded; keep the ID returned by POST if the sync request fails.
                    }
                }

                const createdBusinessId = business?.id
                const currentUser = useAuthStore.getState().user
                if (createdBusinessId && currentUser && !currentUser.businessId) {
                    useAuthStore.getState().setUser({ ...currentUser, businessId: createdBusinessId })
                }

                if (!businessId) {
                    sileo.success({
                        title: '¡Tu negocio fue creado! 🎉',
                        description: 'Ya puedes comenzar a personalizar tu menú.',
                        duration: 5000,
                        roundness: 24, // pill más suave, se ve más premium
                        fill: 'black', // fondo oscuro contrasta fuerte contra tu app blanca
                        styles: {
                            title: 'font-semibold text-white',
                            description: 'text-white/75',
                            badge: 'bg-emerald-400/20', // el ícono de éxito con un halo verde
                        },

                    })
                }

                return { ...response.data, business }
            } catch (error) {
                throw normalizeApiError(error)
            }
        },
    })
}
