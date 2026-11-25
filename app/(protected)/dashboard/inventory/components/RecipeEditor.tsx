'use client'

import { useMemo, useState } from 'react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { notify } from '@/src/lib/notifications/notify'
import type { RecipeTarget } from '../inventory.types'
import { formatQuantity } from '../inventoryFormat'
import { useIngredients, useInventoryMutations, useRecipe } from '../useInventory'
import { FormError, primaryButtonClass, ghostButtonClass } from './fields'
import {
    parseRecipeLines,
    RecipeLinesEditor,
    type RecipeLine,
    type RecipeLineErrors,
} from './RecipeLinesEditor'

/**
 * Edits the ingredients one unit of a saved product (or option) consumes. The
 * stock is deducted from these quantities when an order is marked as ready.
 */
export function RecipeEditor({
    target,
    label,
    description = 'Cantidad que se gasta por cada unidad vendida.',
}: {
    target: RecipeTarget
    label: string
    description?: string
}) {
    const recipe = useRecipe(target)
    const ingredients = useIngredients({ search: '', status: 'ALL' })
    const mutations = useInventoryMutations()
    const [draft, setDraft] = useState<RecipeLine[] | null>(null)
    const [editing, setEditing] = useState(false)
    const [error, setError] = useState('')
    const [lineErrors, setLineErrors] = useState<RecipeLineErrors>({})

    const serverLines = useMemo<RecipeLine[]>(
        () =>
            recipe.data?.map((line) => ({
                ingredientId: line.ingredientId,
                quantity: String(line.quantity),
            })) ?? [],
        [recipe.data],
    )
    const lines = draft ?? serverLines

    function save() {
        const result = parseRecipeLines(lines, ingredients.data?.ingredients ?? [])
        if (!result.ok) {
            setLineErrors(result.errors)
            return
        }
        mutations.recipe.mutate(
            { target, lines: result.lines },
            {
                onSuccess: () => {
                    setDraft(null)
                    setEditing(false)
                    notify.success({
                        title: 'Receta guardada',
                        description: `Actualizamos los ingredientes de ${label}.`,
                    })
                },
                onError: (failure) =>
                    setError(
                        failure instanceof ApiError
                            ? failure.message
                            : 'No pudimos guardar la receta. Inténtalo nuevamente.',
                    ),
            },
        )
    }

    if (recipe.isLoading)
        return (
            <div
                aria-hidden="true"
                className="h-[42px] w-full animate-pulse rounded-xl bg-[#DCE7F4]"
            />
        )
    if (recipe.isError)
        return (
            <p role="alert" className="text-sm text-[#B42318]">
                No pudimos cargar la receta.{' '}
                <button
                    type="button"
                    className="font-bold underline"
                    onClick={() => void recipe.refetch()}
                >
                    Reintentar
                </button>
            </p>
        )

    function cancel() {
        setDraft(null)
        setError('')
        setLineErrors({})
        setEditing(false)
    }

    if (!editing) {
        const byId = new Map((ingredients.data?.ingredients ?? []).map((item) => [item.id, item]))
        return (
            <div className="space-y-2" data-testid="recipe-editor">
                {recipe.data && recipe.data.length > 0 ? (
                    <ul className="divide-y divide-[#F0F3F8]" data-testid="recipe-summary">
                        {recipe.data.map((line) => {
                            const ingredient = byId.get(line.ingredientId)
                            return (
                                <li
                                    key={line.ingredientId}
                                    className="py-1.5 text-sm font-semibold text-[#243556]"
                                >
                                    {ingredient
                                        ? `${formatQuantity(line.quantity, ingredient.unit)} ${ingredient.name}`
                                        : 'Ingrediente'}
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="text-sm text-[#8996A9]">
                        Sin receta: este elemento no descuenta inventario.
                    </p>
                )}
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs font-bold text-[#1E40AF] underline underline-offset-2"
                >
                    {recipe.data && recipe.data.length > 0 ? 'Editar' : 'Agregar ingredientes'}
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-3" data-testid="recipe-editor">
            <p className="text-xs text-[#65738A]">{description}</p>
            <FormError message={error} />
            <RecipeLinesEditor
                lines={lines}
                errors={lineErrors}
                onChange={(next) => {
                    setError('')
                    setLineErrors({})
                    setDraft(next)
                }}
            />
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={cancel}
                    disabled={mutations.recipe.isPending}
                    className={ghostButtonClass}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    onClick={save}
                    disabled={!draft || mutations.recipe.isPending}
                    className={primaryButtonClass}
                >
                    {mutations.recipe.isPending ? 'Guardando…' : 'Guardar receta'}
                </button>
            </div>
        </div>
    )
}
