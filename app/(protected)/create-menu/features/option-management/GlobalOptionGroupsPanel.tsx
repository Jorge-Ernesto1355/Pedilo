'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Checkbox } from '@/app/components/ui/Checkbox'
import { apiClient } from '@/src/lib/api/client'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
import { notify } from '@/src/lib/notifications/notify'
import {
    assignGlobalGroupProducts,
    archiveGlobalOptionGroup,
    createGlobalOptionGroup,
    getGlobalOptionGroup,
    listGlobalOptionGroups,
    replaceGlobalGroupOptions,
    updateGlobalOptionGroup,
    type GlobalOption,
    type GlobalOptionGroup,
    type GlobalOptionGroupSummary,
} from './globalOptionApi'

// Tope de grupos globales por negocio.
const MAX_GROUPS = 10

type Product = { id: string; name: string }
type ProductPage = { products?: Product[]; pagination?: { total?: number }; total?: number }
const inputClass =
    'mt-1 h-11 w-full rounded-xl border border-[#DCE5F3] bg-white px-3 text-sm text-[#243556] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'

function optionError(option: GlobalOption) {
    if (!option.name.trim()) return 'Escribe el nombre de la opción.'
    if (!Number.isInteger(option.price) || option.price < 0 || option.price > 10_000)
        return 'El costo debe ser un número entero entre $0 y $10,000.'
    if (
        !Number.isInteger(option.minSelections) ||
        option.minSelections < 0 ||
        option.minSelections > 10
    )
        return 'El mínimo debe ser un número entero entre 0 y 10.'
    if (
        !Number.isInteger(option.maxSelections) ||
        option.maxSelections < 0 ||
        option.maxSelections > 10
    )
        return 'El máximo debe ser un número entero entre 0 y 10.'
    if (option.maxSelections < option.minSelections)
        return 'El máximo no puede ser menor que el mínimo.'
    return undefined
}

function OptionRow({
    option,
    index,
    onChange,
    onRemove,
    showMissingNameError,
}: {
    option: GlobalOption
    index: number
    onChange: (index: number, patch: Partial<GlobalOption>) => void
    onRemove: () => void
    showMissingNameError: boolean
}) {
    const error = optionError(option)
    const [costText, setCostText] = useState(String(option.price))
    return (
        <div className="rounded-xl border border-[#E3E9F1] bg-white p-3">
            <div className="flex items-end gap-2">
                <label className="block min-w-0 flex-1 text-[11px] font-bold text-[#65738A]">
                    Nombre de la opción
                    <input
                        maxLength={40}
                        value={option.name}
                        onChange={(event) => onChange(index, { name: event.target.value })}
                        className={inputClass}
                        placeholder="Ej. Queso extra"
                    />
                    <span className="mt-1 block text-right text-[11px] font-semibold text-[#8996A9]">
                        {option.name.length}/40
                    </span>
                </label>
                <button
                    type="button"
                    onClick={onRemove}
                    className="mb-5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#F2C7C7] text-[#B42318]"
                    aria-label={`Eliminar ${option.name}`}
                >
                    <Trash2 className="size-4" />
                </button>
            </div>
            <div className="mt-2 grid items-start gap-3 sm:grid-cols-3">
                <label className="text-[11px] font-bold text-[#65738A]">
                    Mínimo
                    <input
                        type="number"
                        min="0"
                        max="10"
                        step="1"
                        inputMode="numeric"
                        value={option.minSelections}
                        onChange={(event) =>
                            onChange(index, { minSelections: Number(event.target.value) })
                        }
                        className={inputClass}
                        placeholder="0"
                    />
                    <span className="mt-1 block text-[10px] font-medium text-[#8996A9]">
                        De 0 a 10 unidades
                    </span>
                </label>
                <label className="text-[11px] font-bold text-[#65738A]">
                    Máximo
                    <input
                        type="number"
                        min="0"
                        max="10"
                        step="1"
                        inputMode="numeric"
                        value={option.maxSelections}
                        onChange={(event) =>
                            onChange(index, { maxSelections: Number(event.target.value) })
                        }
                        className={inputClass}
                        placeholder="1"
                    />
                    <span className="mt-1 block text-[10px] font-medium text-[#8996A9]">
                        De 0 a 10 unidades
                    </span>
                </label>
                <label className="text-[11px] font-bold text-[#65738A]">
                    Costo adicional
                    <input
                        type="text"
                        inputMode="numeric"
                        value={costText}
                        onChange={(event) => {
                            const value = event.target.value
                            if (value !== '' && (!/^\d+$/.test(value) || Number(value) > 10_000))
                                return
                            setCostText(value)
                            if (value !== '') onChange(index, { price: Number(value) })
                        }}
                        onBlur={() => {
                            if (costText === '') {
                                setCostText('0')
                                onChange(index, { price: 0 })
                            }
                        }}
                        className={inputClass}
                        placeholder="0"
                        aria-label={`Costo de ${option.name}`}
                    />
                    <span className="mt-1 block text-[10px] font-medium text-[#8996A9]">
                        Entero de $0 a $10,000
                    </span>
                </label>
            </div>
            {error && (error !== 'Escribe el nombre de la opción.' || showMissingNameError) && (
                <p className="mt-2 text-xs text-[#B42318]">{error}</p>
            )}
        </div>
    )
}

export function GlobalOptionGroupsPanel({ businessId }: { businessId?: string }) {
    const [groups, setGroups] = useState<GlobalOptionGroupSummary[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [productPage, setProductPage] = useState(1)
    const [productTotal, setProductTotal] = useState(0)
    const [selectedId, setSelectedId] = useState<string>()
    const [selected, setSelected] = useState<GlobalOptionGroup | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [detailError, setDetailError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [creating, setCreating] = useState(false)
    // Cambio de página de productos: se conserva lo mostrado y se atenúa hasta que llegue la nueva.
    const [pageLoading, setPageLoading] = useState(false)
    // Grupo recién creado: se anima su entrada una vez y se lleva a la vista si quedó fuera.
    const [createdId, setCreatedId] = useState<string>()
    const createdRef = useRef<HTMLButtonElement | null>(null)
    const [error, setError] = useState<string>()
    const [showMissingNameErrors, setShowMissingNameErrors] = useState(false)
    // Identifica la última selección de grupo: una respuesta tardía de otra no debe pisarla.
    const detailRequest = useRef(0)
    const loadProducts = useCallback(async (id: string, page: number) => {
        const response = await apiClient.get<ProductPage>(
            `/businesses/${id}/products?page=${page}&limit=10`,
            { withCredentials: true },
        )
        return {
            products: response.data.products ?? [],
            total: response.data.pagination?.total ?? response.data.total ?? 0,
        }
    }, [])
    const load = useCallback(async () => {
        if (!businessId) return
        setLoading(true)
        setError(undefined)
        detailRequest.current += 1
        try {
            const nextGroups = await listGlobalOptionGroups()
            const safeGroups = Array.isArray(nextGroups) ? nextGroups : []
            setGroups(safeGroups)
            setProducts([])
            setProductPage(1)
            setProductTotal(0)
            setSelectedId(undefined)
            setSelected(null)
            setDetailError(null)
        } catch (loadError) {
            setError(getUserFriendlyError(loadError).description)
        } finally {
            setLoading(false)
        }
    }, [businessId])
    useEffect(() => {
        if (!createdId) return
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        createdRef.current?.scrollIntoView({
            block: 'nearest',
            behavior: reduceMotion ? 'auto' : 'smooth',
        })
    }, [createdId])
    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0)
        return () => window.clearTimeout(timer)
    }, [load])
    async function changeProductPage(page: number) {
        const pageCount = Math.max(1, Math.ceil(productTotal / 10))
        if (!businessId || page < 1 || page > pageCount || pageLoading) return
        setPageLoading(true)
        try {
            const response = await loadProducts(businessId, page)
            setProducts(response.products)
            setProductTotal(response.total)
            setProductPage(page)
        } catch (pageError) {
            setError(getUserFriendlyError(pageError).description)
        } finally {
            setPageLoading(false)
        }
    }
    async function selectGroup(groupId: string) {
        if (!businessId) return
        const requestId = ++detailRequest.current
        setSelectedId(groupId)
        setDetailLoading(true)
        setDetailError(null)
        try {
            const [group, productResponse] = await Promise.all([
                getGlobalOptionGroup(groupId),
                loadProducts(businessId, 1),
            ])
            if (requestId !== detailRequest.current) return
            setSelected({
                ...group,
                options: group.options ?? [],
                productIds: group.productIds ?? [],
            })
            setProducts(productResponse.products)
            setProductPage(1)
            setProductTotal(productResponse.total)
        } catch (detailError) {
            if (requestId !== detailRequest.current) return
            setSelected(null)
            setDetailError(getUserFriendlyError(detailError).description)
        } finally {
            if (requestId === detailRequest.current) setDetailLoading(false)
        }
    }
    async function create() {
        if (groups.length >= MAX_GROUPS) {
            setError(`Puedes tener como máximo ${MAX_GROUPS} grupos de opciones globales.`)
            return
        }
        setCreating(true)
        setError(undefined)
        try {
            const group = await createGlobalOptionGroup({
                name: 'Nuevo grupo',
                isRequired: false,
                minSelections: 0,
                maxSelections: 1,
                isActive: true,
                options: [],
            })
            setGroups((current) => [...current, group])
            setCreatedId(group.id)
        } catch (createError) {
            setError(getUserFriendlyError(createError).description)
        } finally {
            setCreating(false)
        }
    }
    async function saveGroup() {
        if (!selected) return
        const invalidOption = selected.options.map(optionError).find(Boolean)
        if (invalidOption) {
            setError(invalidOption)
            return
        }
        setSaving(true)
        setError(undefined)
        // El guardado son tres llamadas y cada una sube la versión en el servidor. Si una falla
        // a medias, el reintento debe partir de la última versión que el servidor confirmó.
        let confirmedVersion = selected.version
        try {
            const patched = await updateGlobalOptionGroup(selected.id, {
                name: selected.name,
                isRequired: selected.isRequired,
                minSelections: selected.minSelections,
                maxSelections: selected.maxSelections,
                expectedVersion: selected.version,
            })
            confirmedVersion = patched.version ?? confirmedVersion
            const updated = await replaceGlobalGroupOptions(selected.id, selected.options)
            confirmedVersion = updated.version ?? confirmedVersion
            const group = await assignGlobalGroupProducts(
                updated.id,
                selected.productIds,
                updated.version,
            )
            setGroups((current) => current.map((item) => (item.id === group.id ? group : item)))
            setSelected(group)
            notify.success({
                title: 'Grupo guardado',
                description: 'Las opciones y los productos asignados se actualizaron.',
            })
            await selectGroup(group.id)
        } catch (saveError) {
            if (confirmedVersion !== selected.version) updateSelected({ version: confirmedVersion })
            setError(getUserFriendlyError(saveError).description)
        } finally {
            setSaving(false)
        }
    }
    async function archiveSelected() {
        if (!selected || !confirm('¿Archivar este grupo global?')) return
        setError(undefined)
        try {
            await archiveGlobalOptionGroup(selected.id)
            await load()
        } catch (archiveError) {
            setError(getUserFriendlyError(archiveError).description)
        }
    }
    function updateSelected(patch: Partial<GlobalOptionGroup>) {
        if (selected) setSelected((current) => (current ? { ...current, ...patch } : current))
    }
    function updateOption(index: number, patch: Partial<GlobalOption>) {
        if (patch.name?.trim()) setShowMissingNameErrors(false)
        if (selected)
            updateSelected({
                options: selected.options.map((option, optionIndex) =>
                    optionIndex === index ? { ...option, ...patch } : option,
                ),
            })
    }
    function addOption() {
        if (!selected) return
        if (selected.options.length >= 10) {
            setError('Un grupo global puede tener como máximo 10 opciones.')
            return
        }
        if (selected.options.some((option) => !option.name.trim())) {
            setShowMissingNameErrors(true)
            return
        }
        setShowMissingNameErrors(false)
        updateSelected({
            options: [
                ...selected.options,
                { name: '', price: 0, minSelections: 0, maxSelections: 1, isAvailable: true },
            ],
        })
    }
    if (!businessId) return null
    const atGroupLimit = groups.length >= MAX_GROUPS
    const pageCount = Math.max(1, Math.ceil(productTotal / 10))
    return (
        <section
            className="rounded-[24px] border border-[#DCE5F3] bg-white p-5 shadow-[0_22px_70px_-52px_rgba(19,49,117,.4)] sm:p-6"
            aria-labelledby="global-options-title"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                        Catálogo reutilizable
                    </p>
                    <h2
                        id="global-options-title"
                        className="mt-1 font-display text-2xl tracking-[-.05em] text-[#10224A]"
                    >
                        Grupos de opciones globales
                    </h2>
                    <p className="mt-1 text-sm text-[#65738A]">
                        Administra extras y variantes una sola vez y asígnalos a varios productos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        data-cy="global-groups-counter"
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${atGroupLimit ? 'bg-[#FFF0F0] text-[#B42318]' : 'bg-[#EEF3FF] text-[#2451C5]'}`}
                    >
                        {groups.length}/{MAX_GROUPS}
                    </span>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="rounded-xl border border-[#DCE5F3] p-2.5 text-[#2451C5]"
                        aria-label="Recargar grupos"
                    >
                        <RefreshCw className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => void create()}
                        disabled={saving || creating || atGroupLimit}
                        aria-busy={creating}
                        aria-describedby={atGroupLimit ? 'global-groups-limit' : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-xl bg-[#2451C5] px-3.5 py-2.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed ${atGroupLimit ? 'disabled:opacity-50' : ''}`}
                    >
                        {creating ? (
                            <LoaderCircle
                                className="size-4 animate-spin motion-reduce:animate-none"
                                aria-hidden="true"
                            />
                        ) : (
                            <Plus className="size-4" aria-hidden="true" />
                        )}{' '}
                        Crear grupo
                    </button>
                </div>
            </div>
            {atGroupLimit && !loading && (
                <p
                    id="global-groups-limit"
                    data-cy="global-groups-limit"
                    className="mt-3 text-xs font-semibold text-[#B42318]"
                >
                    Llegaste al límite de {MAX_GROUPS} grupos. Archiva uno para crear otro.
                </p>
            )}
            {error && (
                <div
                    role="alert"
                    className="mt-4 rounded-xl border border-[#F2C7C7] bg-[#FFF7F7] p-3 text-sm text-[#B42318]"
                >
                    {error}
                </div>
            )}
            {loading ? (
                <div
                    aria-label="Cargando grupos de opciones"
                    className="mt-5 grid gap-2 sm:grid-cols-2"
                >
                    <div className="h-14 animate-pulse rounded-xl bg-[#EEF3FF]" />
                    <div className="h-14 animate-pulse rounded-xl bg-[#EEF3FF]" />
                </div>
            ) : groups.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#BFCDE1] p-6 text-center text-sm text-[#65738A]">
                    Todavía no hay grupos globales. Crea el primero para reutilizar sus opciones.
                </div>
            ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
                    <div className="min-w-0 space-y-2">
                        {groups.map((group) => (
                            <button
                                key={group.id}
                                ref={createdId === group.id ? createdRef : undefined}
                                type="button"
                                onClick={() => void selectGroup(group.id)}
                                onAnimationEnd={() => {
                                    if (createdId === group.id) setCreatedId(undefined)
                                }}
                                className={`group flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:shadow-[0_8px_18px_-12px_rgb(36_81_197_/_0.5)] motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.985] active:shadow-none ${createdId === group.id ? 'pedilo-item-enter' : ''} ${selectedId === group.id ? 'border-[#7392E6] bg-[#F4F7FF] text-[#163A9B]' : 'border-[#E3E9F1] text-[#243556] hover:border-[#B9CDFD] hover:bg-[#F8FAFE]'}`}
                            >
                                <span className="truncate">{group.name}</span>
                                <ChevronDown
                                    className={`size-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${selectedId === group.id ? 'rotate-180 text-[#2451C5]' : 'text-[#8996A9] motion-safe:group-hover:translate-y-0.5 group-hover:text-[#2451C5]'}`}
                                    aria-hidden="true"
                                />
                            </button>
                        ))}
                    </div>
                    {detailLoading ? (
                        <div
                            aria-label="Cargando grupo global"
                            className="rounded-2xl border border-[#E3E9F1] bg-[#FBFCFE] p-4"
                        >
                            <div className="h-6 w-40 animate-pulse rounded bg-[#E6EDF7]" />
                            <div className="mt-5 space-y-3">
                                <div className="h-11 animate-pulse rounded-xl bg-[#EEF3FF]" />
                                <div className="h-28 animate-pulse rounded-xl bg-[#EEF3FF]" />
                                <div className="h-36 animate-pulse rounded-xl bg-[#EEF3FF]" />
                            </div>
                        </div>
                    ) : detailError ? (
                        <div
                            role="alert"
                            className="grid min-h-[360px] place-items-center rounded-2xl border border-[#F2C7C7] bg-[#FFF9F9] p-6 text-center sm:p-10"
                        >
                            <div className="max-w-xs">
                                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#FDECEC] text-[#B42318]">
                                    <RefreshCw className="size-5" />
                                </div>
                                <h3 className="mt-4 font-display text-xl text-[#243556]">
                                    No pudimos cargar este grupo
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-[#65738A]">
                                    {detailError}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => selectedId && void selectGroup(selectedId)}
                                    className="mt-5 rounded-xl border border-[#E3B0B0] bg-white px-3.5 py-2 text-sm font-bold text-[#B42318]"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    ) : selected ? (
                        <div className="rounded-2xl border border-[#E3E9F1] bg-[#FBFCFE] p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-bold text-[#65738A]">
                                    Nombre
                                    <input
                                        maxLength={40}
                                        value={selected.name}
                                        onChange={(event) =>
                                            updateSelected({ name: event.target.value })
                                        }
                                        className={inputClass}
                                    />
                                    <span className="mt-1 block text-right text-[11px] font-semibold text-[#8996A9]">
                                        {selected.name.length}/40
                                    </span>
                                </label>
                                <label className="mt-5 flex h-11 cursor-pointer items-center gap-2.5 self-start rounded-xl border border-[#DCE5F3] bg-white px-3 text-sm font-semibold text-[#243556] transition-colors hover:border-[#B9CDFD] has-[input:checked]:border-[#B9CDFD] has-[input:checked]:bg-[#F4F7FF] has-[input:checked]:text-[#163A9B]">
                                    <Checkbox
                                        checked={selected.isRequired}
                                        onChange={(event) =>
                                            updateSelected({
                                                isRequired: event.target.checked,
                                                minSelections: event.target.checked
                                                    ? Math.max(1, selected.minSelections)
                                                    : selected.minSelections,
                                            })
                                        }
                                    />{' '}
                                    Obligatorio
                                </label>
                            </div>
                            <div className="mt-5 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[.12em] text-[#65738A]">
                                            Opciones
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-[#8996A9]">
                                            Cada opción tiene su propio nombre, mínimo, máximo y
                                            costo adicional.
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${selected.options.length >= 10 ? 'bg-[#FFF0F0] text-[#B42318]' : 'bg-[#EEF3FF] text-[#2451C5]'}`}
                                    >
                                        {selected.options.length}/10
                                    </span>
                                </div>
                                {selected.options.map((option, index) => (
                                    <OptionRow
                                        key={option.id ?? index}
                                        option={option}
                                        index={index}
                                        onChange={updateOption}
                                        showMissingNameError={showMissingNameErrors}
                                        onRemove={() =>
                                            updateSelected({
                                                options: selected.options.filter(
                                                    (_, optionIndex) => optionIndex !== index,
                                                ),
                                            })
                                        }
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={addOption}
                                    className={`text-sm font-bold ${selected.options.length >= 10 ? 'text-[#B42318]' : 'text-[#2451C5]'}`}
                                >
                                    {selected.options.length >= 10
                                        ? 'Límite de 10 opciones alcanzado'
                                        : '+ Agregar opción'}
                                </button>
                            </div>
                            <div className="mt-5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold uppercase tracking-[.12em] text-[#65738A]">
                                        Productos asignados
                                    </p>
                                    <span className="text-xs font-semibold text-[#8996A9]">
                                        {selected.productIds.length} seleccionados · {productTotal}{' '}
                                        productos
                                    </span>
                                </div>
                                <div
                                    aria-busy={pageLoading}
                                    className={`mt-2 grid max-h-72 min-h-40 content-start gap-2 overflow-y-auto transition-opacity duration-200 sm:grid-cols-2 ${pageLoading ? 'pointer-events-none opacity-45' : ''}`}
                                >
                                    {products.map((product) => (
                                        <label
                                            key={product.id}
                                            className="flex min-h-10 min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-[#E3E9F1] bg-white px-2.5 py-1.5 text-sm text-[#243556] transition-colors hover:border-[#B9CDFD] has-[input:checked]:border-[#B9CDFD] has-[input:checked]:bg-[#F4F7FF] has-[input:checked]:font-semibold has-[input:checked]:text-[#163A9B]"
                                        >
                                            <Checkbox
                                                checked={selected.productIds.includes(product.id)}
                                                onChange={(event) =>
                                                    updateSelected({
                                                        productIds: event.target.checked
                                                            ? [...selected.productIds, product.id]
                                                            : selected.productIds.filter(
                                                                  (id) => id !== product.id,
                                                              ),
                                                    })
                                                }
                                            />
                                            <span className="truncate">{product.name}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        disabled={productPage <= 1 || pageLoading}
                                        onClick={() => void changeProductPage(productPage - 1)}
                                        className="rounded-lg border border-[#DCE5F3] px-3 py-1.5 text-xs font-bold text-[#2451C5] disabled:opacity-40"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs font-semibold text-[#65738A]">
                                        Página {productPage} de {pageCount}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={productPage >= pageCount || pageLoading}
                                        onClick={() => void changeProductPage(productPage + 1)}
                                        className="rounded-lg border border-[#DCE5F3] px-3 py-1.5 text-xs font-bold text-[#2451C5] disabled:opacity-40"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => void archiveSelected()}
                                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9A6A66] transition-colors hover:bg-[#FBF1F0] hover:text-[#B42318]"
                                >
                                    Archivar grupo
                                </button>
                                <button
                                    type="button"
                                    disabled={saving || creating}
                                    onClick={() => void saveGroup()}
                                    className="inline-flex items-center rounded-lg bg-[#2451C5] px-3 py-1.5 text-xs font-bold text-white"
                                >
                                    {saving ? 'Guardando…' : 'Guardar cambios'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-[#C7D5E9] bg-[#FBFCFE] p-6 text-center sm:p-10">
                            <div className="max-w-xs">
                                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#EAF0FF] text-[#2451C5]">
                                    <ChevronDown className="size-5" />
                                </div>
                                <h3 className="mt-4 font-display text-xl text-[#243556]">
                                    Elige un grupo para editarlo
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-[#65738A]">
                                    Selecciona un grupo de la lista para cargar sus opciones y los
                                    productos que lo utilizan.
                                </p>
                                <p className="mt-4 text-xs font-semibold text-[#8996A9]">
                                    Hasta entonces no cargaremos su configuración.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
