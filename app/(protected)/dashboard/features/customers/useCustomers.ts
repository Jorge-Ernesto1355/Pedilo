'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
    createCustomer,
    deleteCustomer,
    getCustomer,
    getCustomers,
    updateCustomer,
} from '@/src/lib/api/orderApi'
import type { CustomerPayload } from '@/src/lib/api/order-types'
import { sileo } from 'sileo'
export function useCustomers(params: { page: number; limit: number; search?: string }) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: ['customers', businessId, params],
        queryFn: () => getCustomers(businessId as string, params),
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
    })
}
export function useCustomer(id: string | null) {
    return useQuery({
        queryKey: ['customer', id],
        queryFn: () => getCustomer(id as string),
        enabled: Boolean(id),
        staleTime: 5 * 60 * 1000,
    })
}
export function useCustomerMutations() {
    const client = useQueryClient()
    const invalidate = () => void client.invalidateQueries({ queryKey: ['customers'] })
    const showError = (error: unknown) =>
        sileo.error({
            title: error instanceof Error ? error.message : 'No pudimos completar la operación.',
        })
    const businessId = useAuthStore((state) => state.user?.businessId)
    return {
        create: useMutation({
            mutationFn: (payload: CustomerPayload) => createCustomer(businessId as string, payload),
            onSuccess: () => {
                invalidate()
                sileo.success({
                    title: 'Customer guardado',
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
                sileo.success({ title: 'Customer actualizado' })
            },
            onError: showError,
        }),
        remove: useMutation({
            mutationFn: deleteCustomer,
            onSuccess: () => {
                invalidate()
                sileo.success({ title: 'Customer eliminado' })
            },
            onError: showError,
        }),
    }
}
