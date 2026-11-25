'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import {
    archiveIngredient,
    createIngredient,
    getInventorySettings,
    getRecipe,
    listIngredients,
    listMovements,
    listStockAlerts,
    recordMovement,
    setRecipe,
    updateIngredient,
    updateInventorySettings,
} from './inventoryApi'
import type {
    IngredientInput,
    IngredientStatusFilter,
    IngredientUpdateInput,
    InventorySettings,
    MovementInput,
    RecipeTarget,
} from './inventory.types'

/** Every inventory query shares this prefix so one invalidation refreshes them all. */
export const inventoryKey = (businessId: string | null | undefined) =>
    ['inventory', businessId] as const

function requireBusiness(businessId: string | null | undefined) {
    if (!businessId) throw new Error('No encontramos el negocio del usuario.')
    return businessId
}

export function useIngredients(params: { search: string; status: IngredientStatusFilter }) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: [...inventoryKey(businessId), 'ingredients', params],
        queryFn: () => listIngredients(businessId as string, params),
        enabled: Boolean(businessId),
        staleTime: 30_000,
        placeholderData: (previous) => previous,
    })
}

export function useMovements(ingredientId: string | null, page: number) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: [...inventoryKey(businessId), 'movements', ingredientId, page],
        queryFn: () => listMovements(businessId as string, ingredientId as string, page),
        enabled: Boolean(businessId && ingredientId),
    })
}

export function useRecipe(target: RecipeTarget | null) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: [...inventoryKey(businessId), 'recipe', target?.kind, target?.id],
        queryFn: () => getRecipe(businessId as string, target as RecipeTarget),
        enabled: Boolean(businessId && target),
    })
}

export function useInventorySettings(enabled = true) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: [...inventoryKey(businessId), 'settings'],
        queryFn: () => getInventorySettings(businessId as string),
        enabled: Boolean(businessId) && enabled,
        staleTime: 5 * 60_000,
    })
}

export function useOpenStockAlerts() {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: [...inventoryKey(businessId), 'alerts'],
        queryFn: () => listStockAlerts(businessId as string),
        enabled: Boolean(businessId),
        staleTime: 60_000,
    })
}

export function useInventoryMutations() {
    const client = useQueryClient()
    const businessId = useAuthStore((state) => state.user?.businessId)
    const refresh = () => client.invalidateQueries({ queryKey: inventoryKey(businessId) })

    return {
        create: useMutation({
            mutationFn: (input: IngredientInput) =>
                createIngredient(requireBusiness(businessId), input),
            onSuccess: refresh,
        }),
        update: useMutation({
            mutationFn: ({ id, input }: { id: string; input: IngredientUpdateInput }) =>
                updateIngredient(requireBusiness(businessId), id, input),
            onSuccess: refresh,
        }),
        archive: useMutation({
            mutationFn: (id: string) => archiveIngredient(requireBusiness(businessId), id),
            onSuccess: refresh,
        }),
        movement: useMutation({
            mutationFn: ({ id, input }: { id: string; input: MovementInput }) =>
                recordMovement(requireBusiness(businessId), id, input),
            onSuccess: refresh,
        }),
        recipe: useMutation({
            mutationFn: ({
                target,
                lines,
            }: {
                target: RecipeTarget
                lines: { ingredientId: string; quantity: number }[]
            }) => setRecipe(requireBusiness(businessId), target, lines),
            onSuccess: refresh,
        }),
        settings: useMutation({
            mutationFn: (input: Partial<InventorySettings>) =>
                updateInventorySettings(requireBusiness(businessId), input),
            onSuccess: refresh,
        }),
    }
}
