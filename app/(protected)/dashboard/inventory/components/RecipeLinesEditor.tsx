'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Trash2 } from 'lucide-react'
import type { Ingredient } from '../inventory.types'
import { maxQuantity, maxQuantityLabel, unitLabels, unitNames } from '../inventoryFormat'
import { useIngredients } from '../useInventory'
import { inputClass, parseDecimal, quantityOnly } from './fields'

export type RecipeLine = { ingredientId: string; quantity: string }
export type RecipeLineErrors = Record<string, string>

const MAX_LINES = 50
// Rows the ingredient picker shows before it scrolls: 8 rows of 36px plus 4px of padding.
const VISIBLE_RESULTS = 8
const RESULT_ROW_PX = 36

/** Validates every row; returns API-ready lines, or an error per ingredient id. */
export function parseRecipeLines(
    lines: RecipeLine[],
    ingredients: Ingredient[],
):
    | { ok: true; lines: { ingredientId: string; quantity: number }[] }
    | { ok: false; errors: RecipeLineErrors } {
    const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]))
    const errors: RecipeLineErrors = {}
    const parsed: { ingredientId: string; quantity: number }[] = []
    for (const line of lines) {
        const quantity = parseDecimal(line.quantity)
        const ingredient = byId.get(line.ingredientId)
        if (quantity === null || quantity <= 0)
            errors[line.ingredientId] = 'Escribe una cantidad mayor a cero.'
        else if (ingredient && quantity > maxQuantity[ingredient.unit])
            errors[line.ingredientId] = `El máximo es ${maxQuantityLabel[ingredient.unit]}.`
        else parsed.push({ ingredientId: line.ingredientId, quantity })
    }
    return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, lines: parsed }
}

const normalize = (value: string) =>
    value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim()

/**
 * Controlled list of recipe rows with a searchable ingredient picker. It never
 * talks to the recipe API, so it works both for new products (draft) and saved ones.
 */
export function RecipeLinesEditor({
    lines,
    onChange,
    errors = {},
}: {
    lines: RecipeLine[]
    onChange: (next: RecipeLine[]) => void
    errors?: RecipeLineErrors
}) {
    const ingredientsQuery = useIngredients({ search: '', status: 'ALL' })
    const ingredients = useMemo(
        () => ingredientsQuery.data?.ingredients ?? [],
        [ingredientsQuery.data],
    )
    const byId = useMemo(
        () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
        [ingredients],
    )
    const id = useId()
    const listboxId = `${id}-options`
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const pendingFocus = useRef<string | null>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const used = new Set(lines.map((line) => line.ingredientId))
    const results = ingredients.filter(
        (ingredient) =>
            !used.has(ingredient.id) && normalize(ingredient.name).includes(normalize(query)),
    )
    const atLimit = lines.length >= MAX_LINES

    // Focus the quantity of the row that was just added, once it is rendered.
    useEffect(() => {
        if (!pendingFocus.current) return
        document.getElementById(`${id}-qty-${pendingFocus.current}`)?.focus()
        pendingFocus.current = null
    }, [lines.length, id])

    // When the picker opens, bring the whole list into view so nobody has to scroll for it.
    useEffect(() => {
        if (open) listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [open])

    // Keep the highlighted option visible while moving with the arrow keys.
    useEffect(() => {
        if (!open || !results[active]) return
        document
            .getElementById(`${id}-option-${results[active].id}`)
            ?.scrollIntoView({ block: 'nearest' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, open])

    function add(ingredient: Ingredient) {
        onChange([...lines, { ingredientId: ingredient.id, quantity: '' }])
        setQuery('')
        setOpen(false)
        setActive(0)
        pendingFocus.current = ingredient.id
    }

    if (ingredientsQuery.isLoading)
        return (
            <div
                aria-hidden="true"
                className="h-[42px] w-full animate-pulse rounded-xl bg-[#DCE7F4]"
            />
        )
    if (ingredientsQuery.isError)
        return (
            <p role="alert" className="text-sm text-[#B42318]">
                No pudimos cargar tus ingredientes.{' '}
                <button
                    type="button"
                    className="font-bold underline"
                    onClick={() => void ingredientsQuery.refetch()}
                >
                    Reintentar
                </button>
            </p>
        )
    if (ingredients.length === 0)
        return (
            <p className="text-sm leading-6 text-[#65738A]">
                Aún no tienes ingredientes.{' '}
                <Link
                    href="/dashboard/inventory"
                    className="font-semibold text-[#2451C5] underline underline-offset-2"
                >
                    Créalos en Inventario
                </Link>{' '}
                para armar esta receta.
            </p>
        )

    return (
        <div className="space-y-3" data-testid="recipe-lines">
            {lines.length === 0 ? (
                <p className="text-sm text-[#8996A9]">
                    Sin receta: este elemento no descuenta inventario.
                </p>
            ) : (
                <ul className="divide-y divide-[#F0F3F8]">
                    {lines.map((line) => {
                        const ingredient = byId.get(line.ingredientId)
                        const error = errors[line.ingredientId]
                        return (
                            <li
                                key={line.ingredientId}
                                className="py-2.5"
                                data-testid="recipe-line"
                            >
                                <div className="flex items-center gap-2">
                                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#243556]">
                                        {ingredient?.name ?? 'Ingrediente'}
                                    </p>
                                    <div className="relative w-32 shrink-0">
                                        <input
                                            id={`${id}-qty-${line.ingredientId}`}
                                            aria-label={`Cantidad de ${ingredient?.name ?? 'ingrediente'}`}
                                            aria-invalid={Boolean(error)}
                                            value={line.quantity}
                                            inputMode="decimal"
                                            placeholder="0"
                                            onKeyDown={(event) => {
                                                // Never submit a surrounding product form from here.
                                                if (event.key === 'Enter') event.preventDefault()
                                            }}
                                            onChange={(event) =>
                                                onChange(
                                                    lines.map((item) =>
                                                        item.ingredientId === line.ingredientId
                                                            ? {
                                                                  ...item,
                                                                  quantity: quantityOnly(
                                                                      event.target.value,
                                                                  ),
                                                              }
                                                            : item,
                                                    ),
                                                )
                                            }
                                            className={`${inputClass} pr-10 ${error ? 'border-[#B42318]' : ''}`}
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-[#8996A9]">
                                            {ingredient ? unitLabels[ingredient.unit] : ''}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={`Quitar ${ingredient?.name ?? 'ingrediente'}`}
                                        onClick={() =>
                                            onChange(
                                                lines.filter(
                                                    (item) =>
                                                        item.ingredientId !== line.ingredientId,
                                                ),
                                            )
                                        }
                                        className="grid size-9 shrink-0 place-items-center rounded-lg text-[#B42318] hover:bg-[#FFF4F2]"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                                {error && (
                                    <p
                                        role="alert"
                                        className="mt-1 text-xs font-medium text-[#B42318]"
                                    >
                                        {error}
                                    </p>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            <div
                onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
                }}
            >
                <div className="relative">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]"
                        aria-hidden="true"
                    />
                    <input
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            open && results[active]
                                ? `${id}-option-${results[active].id}`
                                : undefined
                        }
                        aria-label="Buscar ingrediente"
                        value={query}
                        disabled={atLimit}
                        placeholder={
                            atLimit
                                ? 'Llegaste al máximo de ingredientes'
                                : 'Buscar ingrediente para agregar…'
                        }
                        onFocus={() => setOpen(true)}
                        onChange={(event) => {
                            setQuery(event.target.value)
                            setActive(0)
                            setOpen(true)
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault()
                                setOpen(true)
                                setActive((current) => Math.min(current + 1, results.length - 1))
                            } else if (event.key === 'ArrowUp') {
                                event.preventDefault()
                                setActive((current) => Math.max(current - 1, 0))
                            } else if (event.key === 'Enter') {
                                event.preventDefault()
                                if (open && results[active]) add(results[active])
                            } else if (event.key === 'Escape' && open) {
                                event.stopPropagation()
                                setOpen(false)
                            }
                        }}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                {open && !atLimit && (
                    <ul
                        ref={listRef}
                        id={listboxId}
                        role="listbox"
                        aria-label="Ingredientes disponibles"
                        style={{ maxHeight: VISIBLE_RESULTS * RESULT_ROW_PX + 8 }}
                        className="mt-1.5 overflow-y-auto overscroll-contain rounded-xl bg-[#F6F9FE] p-1"
                    >
                        {results.length === 0 ? (
                            <li className="px-3 py-2.5 text-sm text-[#65738A]">
                                {query.trim()
                                    ? `Sin resultados para “${query.trim()}”.`
                                    : 'Ya agregaste todos tus ingredientes.'}
                            </li>
                        ) : (
                            results.map((ingredient, index) => (
                                <li
                                    key={ingredient.id}
                                    id={`${id}-option-${ingredient.id}`}
                                    role="option"
                                    aria-selected={index === active}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => add(ingredient)}
                                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition ${index === active ? 'bg-white text-[#12234A] shadow-sm' : 'text-[#243556]'}`}
                                >
                                    <span className="min-w-0 truncate font-semibold">
                                        {ingredient.name}
                                    </span>
                                    <span className="shrink-0 text-xs text-[#8996A9]">
                                        {unitNames[ingredient.unit]}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>
        </div>
    )
}
