'use client'

import { useMemo, useState } from 'react'
import { Boxes, History, Pencil, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { notify } from '@/src/lib/notifications/notify'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { InventorySkeleton } from '../components/DashboardSkeletons'
import { EmptyState } from '../components/EmptyState'
import {
    LazyIngredientFormModal,
    LazyInventorySettingsModal,
    LazyMovementHistoryModal,
    LazyMovementModal,
} from './components/LazyInventoryModals'
import { levelBarColor, StockLevelBadge } from './components/StockLevelBadge'
import type {
    Ingredient,
    IngredientStatusFilter,
    MovementInput,
    StockAlert,
} from './inventory.types'
import { formatQuantity } from './inventoryFormat'
import {
    useIngredients,
    useInventoryMutations,
    useInventorySettings,
    useOpenStockAlerts,
} from './useInventory'
import { inputClass } from './components/fields'

const filters: { value: IngredientStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'ALERTS', label: 'Con alertas' },
    { value: 'OUT', label: 'Agotados' },
    { value: 'CRITICAL', label: 'Críticos' },
    { value: 'LOW', label: 'Bajos' },
    { value: 'OK', label: 'Normales' },
]

type Editor = { mode: 'create' } | { mode: 'edit'; ingredient: Ingredient } | null
type Movement = { ingredient: Ingredient; type: MovementInput['type'] } | null

export default function InventoryPage() {
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<IngredientStatusFilter>('ALL')
    const [editor, setEditor] = useState<Editor>(null)
    const [movement, setMovement] = useState<Movement>(null)
    const [history, setHistory] = useState<Ingredient | null>(null)
    const [settingsOpen, setSettingsOpen] = useState(false)

    const list = useIngredients({ search: search.trim(), status })
    const everything = useIngredients({ search: '', status: 'ALL' })
    const settings = useInventorySettings()
    const alerts = useOpenStockAlerts()
    const mutations = useInventoryMutations()

    const consumptionAlerts = useMemo(
        () =>
            new Map<string, StockAlert>(
                (alerts.data ?? [])
                    .filter((alert) => alert.kind === 'CONSUMPTION')
                    .map((alert) => [alert.ingredientId, alert]),
            ),
        [alerts.data],
    )
    const counts = everything.data?.counts ?? list.data?.counts
    const total = counts ? counts.OK + counts.LOW + counts.CRITICAL + counts.OUT : 0
    const ingredients = list.data?.ingredients ?? []
    const filtering = status !== 'ALL' || search.trim() !== ''
    const countFor = (value: IngredientStatusFilter) => {
        if (!counts) return null
        if (value === 'ALL') return total
        if (value === 'ALERTS') return counts.LOW + counts.CRITICAL + counts.OUT
        return counts[value]
    }

    // Until the first response (or error) arrives there is nothing real to show.
    // Rendering the empty state here would flash "no ingredients" to every owner.
    if (!list.data && !list.isError) return <InventorySkeleton />
    if (list.isError && !list.data)
        return (
            <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
                <DashboardErrorState
                    title="No pudimos cargar tu inventario"
                    description="Revisa tu conexión e inténtalo nuevamente."
                    onRetry={async () => {
                        await list.refetch()
                    }}
                />
            </main>
        )

    return (
        <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 pb-28 sm:px-8 lg:px-10 lg:py-10">
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-medium text-[#65738A]">
                        Controla lo que tienes y qué se está acabando
                    </p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A] sm:text-4xl">
                        Inventario
                    </h1>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9D7EA] bg-white px-4 py-2.5 text-sm font-bold text-[#243556] transition hover:bg-[#F5F8FC]"
                    >
                        <Settings2 className="size-4" />
                        Configuración
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditor({ mode: 'create' })}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2451C5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1E40AF]"
                    >
                        <Plus className="size-4" />
                        Nuevo ingrediente
                    </button>
                </div>
            </header>

            {total === 0 && !filtering ? (
                <EmptyState
                    icon={Boxes}
                    title="Aún no registras ingredientes"
                    description="Agrega lo que usas en tu cocina, define la receta de tus productos y descontaremos el inventario cada vez que marques un pedido como listo."
                    action={{
                        label: 'Agregar mi primer ingrediente',
                        onClick: () => setEditor({ mode: 'create' }),
                    }}
                />
            ) : (
                <section className="rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div
                            role="tablist"
                            aria-label="Filtrar por estado"
                            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
                        >
                            {filters.map((filter) => {
                                const count = countFor(filter.value)
                                const active = status === filter.value
                                return (
                                    <button
                                        key={filter.value}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        data-testid={`inventory-filter-${filter.value}`}
                                        onClick={() => setStatus(filter.value)}
                                        className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-[#EAF0FF] text-[#1E40AF]' : 'text-[#65738A] hover:bg-[#F5F8FC]'}`}
                                    >
                                        {filter.label}
                                        {count !== null && (
                                            <span className="tabular-nums text-xs opacity-70">
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        <input
                            type="search"
                            aria-label="Buscar ingrediente"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar ingrediente"
                            className={`${inputClass} lg:max-w-xs`}
                        />
                    </div>

                    {ingredients.length === 0 ? (
                        <p className="py-14 text-center text-sm text-[#65738A]">
                            {filtering
                                ? 'Ningún ingrediente coincide con este filtro.'
                                : 'No hay ingredientes todavía.'}
                        </p>
                    ) : (
                        <>
                            <div className="mt-5 hidden overflow-x-auto md:block">
                                <table
                                    className="w-full min-w-[820px] text-left"
                                    data-testid="ingredient-table"
                                >
                                    <thead>
                                        <tr className="border-b border-[#E8EEF6] text-xs uppercase tracking-[.08em] text-[#8996A9]">
                                            <th className="px-3 py-3 font-semibold">Ingrediente</th>
                                            <th className="px-3 py-3 font-semibold">Stock</th>
                                            <th className="px-3 py-3 font-semibold">Avisar en</th>
                                            <th className="px-3 py-3 font-semibold">Estado</th>
                                            <th className="px-3 py-3 text-right font-semibold">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map((ingredient) => (
                                            <tr
                                                key={ingredient.id}
                                                data-testid="ingredient-row"
                                                data-ingredient={ingredient.name}
                                                className="border-b border-[#F0F3F8] text-sm text-[#243556] last:border-0 hover:bg-[#FAFCFF]"
                                            >
                                                <td className="px-3 py-3.5">
                                                    <p className="font-semibold">
                                                        {ingredient.name}
                                                    </p>
                                                    {consumptionAlerts.has(ingredient.id) && (
                                                        <p className="mt-0.5 text-xs font-semibold text-[#8A5E0B]">
                                                            Consumo alto en las últimas horas
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <StockCell ingredient={ingredient} />
                                                </td>
                                                <td className="px-3 py-3.5 tabular-nums text-[#65738A]">
                                                    {ingredient.threshold > 0
                                                        ? formatQuantity(
                                                              ingredient.threshold,
                                                              ingredient.unit,
                                                          )
                                                        : 'Solo al agotarse'}
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <StockLevelBadge level={ingredient.level} />
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <RowActions
                                                        ingredient={ingredient}
                                                        onMove={(type) =>
                                                            setMovement({ ingredient, type })
                                                        }
                                                        onHistory={() => setHistory(ingredient)}
                                                        onEdit={() =>
                                                            setEditor({ mode: 'edit', ingredient })
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <ul className="mt-5 space-y-3 md:hidden" data-testid="ingredient-cards">
                                {ingredients.map((ingredient) => (
                                    <li
                                        key={ingredient.id}
                                        data-testid="ingredient-card"
                                        data-ingredient={ingredient.name}
                                        className="rounded-xl border border-[#E8EEF6] p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-[#243556]">
                                                    {ingredient.name}
                                                </p>
                                                {consumptionAlerts.has(ingredient.id) && (
                                                    <p className="mt-0.5 text-xs font-semibold text-[#8A5E0B]">
                                                        Consumo alto en las últimas horas
                                                    </p>
                                                )}
                                            </div>
                                            <StockLevelBadge level={ingredient.level} />
                                        </div>
                                        <div className="mt-3">
                                            <StockCell ingredient={ingredient} />
                                        </div>
                                        <p className="mt-2 text-xs text-[#8996A9]">
                                            Avisamos en{' '}
                                            {ingredient.threshold > 0
                                                ? formatQuantity(
                                                      ingredient.threshold,
                                                      ingredient.unit,
                                                  )
                                                : 'cuanto se agote'}
                                        </p>
                                        <div className="mt-3">
                                            <RowActions
                                                ingredient={ingredient}
                                                onMove={(type) => setMovement({ ingredient, type })}
                                                onHistory={() => setHistory(ingredient)}
                                                onEdit={() =>
                                                    setEditor({ mode: 'edit', ingredient })
                                                }
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {list.isError && (
                        <p
                            role="alert"
                            className="mt-4 flex items-center gap-2 text-sm text-[#B42318]"
                        >
                            No pudimos actualizar la lista.
                            <button
                                type="button"
                                onClick={() => void list.refetch()}
                                className="inline-flex items-center gap-1 font-bold underline"
                            >
                                <RefreshCw className="size-3.5" /> Reintentar
                            </button>
                        </p>
                    )}
                </section>
            )}

            <LazyIngredientFormModal
                open={editor !== null}
                ingredient={editor?.mode === 'edit' ? editor.ingredient : null}
                defaultLowStockPercent={settings.data?.defaultLowStockPercent ?? 20}
                isSaving={mutations.create.isPending || mutations.update.isPending}
                isArchiving={mutations.archive.isPending}
                error={editor?.mode === 'edit' ? mutations.update.error : mutations.create.error}
                onClose={() => {
                    setEditor(null)
                    mutations.create.reset()
                    mutations.update.reset()
                }}
                onSave={(input) => {
                    if (editor?.mode === 'edit') {
                        mutations.update.mutate(
                            {
                                id: editor.ingredient.id,
                                input: {
                                    name: input.name,
                                    parLevel: input.parLevel,
                                    lowStockMode: input.lowStockMode,
                                    lowStockValue: input.lowStockValue,
                                    consumptionAlertPercent: input.consumptionAlertPercent,
                                },
                            },
                            {
                                onSuccess: () => {
                                    setEditor(null)
                                    notify.success({ title: 'Ingrediente actualizado' })
                                },
                            },
                        )
                    } else
                        mutations.create.mutate(input, {
                            onSuccess: (created) => {
                                setEditor(null)
                                notify.success({
                                    title: 'Ingrediente creado',
                                    description: `${created.name} ya está en tu inventario.`,
                                })
                            },
                        })
                }}
                onArchive={() => {
                    if (editor?.mode !== 'edit') return
                    mutations.archive.mutate(editor.ingredient.id, {
                        onSuccess: () => {
                            setEditor(null)
                            notify.success({ title: 'Ingrediente archivado' })
                        },
                        onError: () =>
                            notify.error({
                                title: 'No pudimos archivarlo',
                                description: 'Inténtalo nuevamente en unos momentos.',
                            }),
                    })
                }}
            />
            <LazyMovementModal
                open={movement !== null}
                ingredient={movement?.ingredient ?? null}
                initialType={movement?.type ?? 'PURCHASE'}
                isSaving={mutations.movement.isPending}
                error={mutations.movement.error}
                onClose={() => {
                    setMovement(null)
                    mutations.movement.reset()
                }}
                onSave={(input) => {
                    if (!movement) return
                    mutations.movement.mutate(
                        { id: movement.ingredient.id, input },
                        {
                            onSuccess: () => {
                                setMovement(null)
                                notify.success({
                                    title: 'Movimiento registrado',
                                    description: `Actualizamos el stock de ${movement.ingredient.name}.`,
                                })
                            },
                        },
                    )
                }}
            />
            <LazyMovementHistoryModal ingredient={history} onClose={() => setHistory(null)} />
            <LazyInventorySettingsModal
                open={settingsOpen}
                settings={settings.data}
                isSaving={mutations.settings.isPending}
                error={mutations.settings.error}
                onClose={() => {
                    setSettingsOpen(false)
                    mutations.settings.reset()
                }}
                onSave={(input) =>
                    mutations.settings.mutate(input, {
                        onSuccess: () => {
                            setSettingsOpen(false)
                            notify.success({ title: 'Configuración guardada' })
                        },
                    })
                }
            />
        </main>
    )
}

function StockCell({ ingredient }: { ingredient: Ingredient }) {
    const reference = Math.max(ingredient.parLevel, ingredient.stock, 0)
    const percent =
        reference > 0 ? Math.min(100, Math.max(0, (ingredient.stock / reference) * 100)) : 0
    return (
        <div className="min-w-[9rem]">
            <p className="font-semibold tabular-nums" data-testid="ingredient-stock">
                {formatQuantity(ingredient.stock, ingredient.unit)}
            </p>
            <div
                className="mt-1.5 h-1 w-full max-w-[9rem] rounded-full bg-[#E8EEF6]"
                aria-hidden="true"
            >
                <div
                    className={`h-1 rounded-full ${levelBarColor[ingredient.level]}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

function RowActions({
    ingredient,
    onMove,
    onHistory,
    onEdit,
}: {
    ingredient: Ingredient
    onMove: (type: MovementInput['type']) => void
    onHistory: () => void
    onEdit: () => void
}) {
    return (
        <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
            <button
                type="button"
                onClick={() => onMove('PURCHASE')}
                className="rounded-lg bg-[#EAF0FF] px-3 py-2 text-xs font-bold text-[#1E40AF] hover:bg-[#DCE6FF]"
            >
                Agregar stock
            </button>
            <button
                type="button"
                onClick={() => onMove('ADJUSTMENT')}
                className="rounded-lg px-3 py-2 text-xs font-bold text-[#243556] hover:bg-[#F0F4FA]"
            >
                Conteo o merma
            </button>
            <button
                type="button"
                onClick={onHistory}
                aria-label={`Historial de ${ingredient.name}`}
                className="grid size-8 place-items-center rounded-lg text-[#65738A] hover:bg-[#F0F4FA]"
            >
                <History className="size-4" />
            </button>
            <button
                type="button"
                onClick={onEdit}
                aria-label={`Editar ${ingredient.name}`}
                className="grid size-8 place-items-center rounded-lg text-[#65738A] hover:bg-[#F0F4FA]"
            >
                <Pencil className="size-4" />
            </button>
        </div>
    )
}
