'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
        logoUrl?: string | null
        coverUrl?: string | null
    }
}

function toBusinessFormData(
    values: BusinessProfileValues,
    logoFile?: File | null,
    coverFile?: File | null,
) {
    const dayKeys = {
        mon: 'monday',
        tue: 'tuesday',
        wed: 'wednesday',
        thu: 'thursday',
        fri: 'friday',
        sat: 'saturday',
        sun: 'sunday',
    } as const

    const formData = new FormData()
    formData.append('name', values.businessName)
    formData.append('slug', values.slug)
    formData.append('description', values.description)
    formData.append('ubication', values.location)
    if (values.coordinates) formData.append('ubicationMaps', JSON.stringify(values.coordinates))
    formData.append(
        'businessSchedule',
        JSON.stringify({
            days: values.businessHours.days.map((day) => ({
                key: dayKeys[day.key],
                label: day.label,
                enabled: day.enabled,
            })),
            openTime: values.businessHours.openTime,
            closeTime: values.businessHours.closeTime,
        }),
    )
    if (logoFile) formData.append('logo', logoFile)
    if (coverFile) formData.append('cover', coverFile)
    return formData
}

export function useSaveBusinessProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            values,
            logoFile,
            coverFile,
        }: {
            values: BusinessProfileValues
            logoFile?: File | null
            coverFile?: File | null
        }): Promise<BusinessResponse> => {
            const businessId = useAuthStore.getState().user?.businessId
            const formData = toBusinessFormData(values, logoFile, coverFile)

            try {
                const response = businessId
                    ? await apiClient.patch<BusinessResponse>(
                          `/businesses/${businessId}`,
                          formData,
                          { withCredentials: true },
                      )
                    : await apiClient.post<BusinessResponse>('/businesses', formData, {
                          withCredentials: true,
                      })

                let business = response.data.business
                if (!businessId) {
                    try {
                        const mineResponse = await apiClient.get<BusinessResponse>(
                            '/businesses/mine',
                            { withCredentials: true },
                        )
                        business = mineResponse.data.business ?? business
                    } catch {
                        // The creation succeeded; keep the ID returned by POST if the sync request fails.
                    }
                }

                const createdBusinessId = business?.id
                const currentUser = useAuthStore.getState().user
                if (createdBusinessId && currentUser && !currentUser.businessId) {
                    useAuthStore
                        .getState()
                        .setUser({ ...currentUser, businessId: createdBusinessId })
                }
                if (business) {
                    queryClient.setQueryData(
                        [
                            'business',
                            'mine',
                            currentUser?.id ?? 'anonymous',
                            createdBusinessId ?? businessId ?? 'none',
                        ],
                        (previous: BusinessResponse['business'] | undefined) =>
                            previous ? { ...previous, ...business } : business,
                    )
                }
                void queryClient.invalidateQueries({ queryKey: ['business', 'mine'] })

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
                } else {
                    sileo.success({
                        title: '¡Tu negocio fue actualizado!',
                        description: 'Los cambios se guardaron correctamente.',
                        duration: 5000,
                    })
                }

                return { ...response.data, business }
            } catch (error) {
                const normalizedError = normalizeApiError(error)
                sileo.error({
                    title: businessId
                        ? 'No pudimos actualizar tu negocio'
                        : 'No pudimos crear tu negocio',
                    description:
                        normalizedError.message || 'Revisa la información e inténtalo de nuevo.',
                    duration: 5000,
                })
                throw normalizedError
            }
        },
    })
}
