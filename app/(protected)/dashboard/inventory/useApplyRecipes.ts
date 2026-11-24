'use client'

import { notify } from '@/src/lib/notifications/notify'
import type { RecipeTarget } from './inventory.types'
import { useInventoryMutations } from './useInventory'

export type RecipeToApply = {
    target: RecipeTarget
    lines: { ingredientId: string; quantity: number }[]
}

/**
 * Saves the recipes typed while their option did not exist yet. Returns once
 * every request settled; a failure warns the user without undoing the option.
 */
export function useApplyRecipes() {
    const { recipe } = useInventoryMutations()
    return async (items: RecipeToApply[]) => {
        const pending = items.filter((item) => item.lines.length > 0)
        if (pending.length === 0) return
        const results = await Promise.allSettled(pending.map((item) => recipe.mutateAsync(item)))
        if (results.some((result) => result.status === 'rejected'))
            notify.error({
                title: 'Opción creada, pero no sus ingredientes',
                description: 'Agrégalos desde “Ingredientes” en la misma opción.',
            })
    }
}
