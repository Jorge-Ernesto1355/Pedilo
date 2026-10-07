'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
    createCustomer,
    deleteCustomer,
    getCustomer,
    getCustomers,
    updateCustomer,
} from '@/src/lib/api/orderApi'
import type { CustomerPayload } from '@/src/lib/api/order-types'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'
export function useCustomers(params: { page: number; limit: number; search?: string }) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['customers', businessId, params],
        queryFn: () => getCustomers(businessId as string, params),
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
    })
}
export function useCustomer(id: string | null) {
    const user = useAuthStore((state) => state.user)
    return useQuery({
        queryKey: ['customer', user?.id ?? 'anonymous', user?.businessId ?? 'none', id],
        queryFn: () => getCustomer(id as string),
        enabled: Boolean(id && user?.businessId),
        staleTime: 5 * 60 * 1000,
    })
}
export function useCustomerMutations() {
    const client = useQueryClient()
    const invalidate = () => void client.invalidateQueries({ queryKey: ['customers'] })
    const showError = (error: unknown) =>
        notify.error({
            title: 'No se pudo actualizar el cliente',
            description: friendlyNotificationError(error, 'Inténtalo nuevamente.'),
        })
    const businessId = useAuthStore((state) => state.user?.businessId)
    return {
        create: useMutation({
            mutationFn: (payload: CustomerPayload) => createCustomer(businessId as string, payload),
            onSuccess: () => {
                invalidate()
                notify.success({
                    title: 'Cliente guardado',
                    description: 'La información quedó actualizada.',
                })
            },
            onError: showError,
        }),
        update: useMutation({
            mutationFn: ({ id, payload }: { id: string; payload: CustomerPayload }) =>
                updateCustomer(id, payload),
            onSuccess: () => {
                invalidate()
                notify.success({
                    title: 'Cliente actualizado',
                    description: 'Los cambios se guardaron correctamente.',
                })
            },
            onError: showError,
        }),
        remove: useMutation({
            mutationFn: deleteCustomer,
            onSuccess: () => {
                invalidate()
                notify.success({
                    title: 'Cliente eliminado',
                    description: 'El cliente se eliminó correctamente.',
                })
            },
            onError: showError,
        }),
    }
}
