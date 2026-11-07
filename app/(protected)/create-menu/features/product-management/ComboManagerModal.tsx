/* eslint-disable @next/next/no-img-element -- Combo image URLs are user-provided previews. */
'use client'

import { useId, useMemo, useState } from 'react'
import {
    Check,
    ChevronLeft,
    ChevronRight,
    ImagePlus,
    LoaderCircle,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { notify } from '@/src/lib/notifications/notify'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
import type { Menu } from '../category-management/menu.types'
import type { Product } from './product.types'
import { useProducts } from './useProductManagement'
import { useCombo, useComboManagement } from './useComboManagement'
import type { ComboGroupInput } from './comboApi'
import {
    COMBO_GROUP_CHOICES_MAX,
    COMBO_INCLUDED_PRODUCTS_MAX,
    COMBO_NAME_MAX_LENGTH,
    COMBO_OPTION_GROUPS_MAX,
    COMBO_OPTION_GROUP_NAME_MAX_LENGTH,
    PRODUCT_DESCRIPTION_MAX_LENGTH,
    PRODUCT_PRICE_MAX,
} from '../../description-limits'

type DraftGroup = {
    name: string
    productIds: string[]
}
type ComboManagerModalProps = {
    open: boolean
    categoryId: string
    categoryName: string
    menus: Menu[]
    combo?: Product | null
    onClose: () => void
}
const fieldClass =
    'w-full rounded-lg border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'
const primaryButton =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1E40AF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#183991] disabled:cursor-wait disabled:opacity-55'
const quietButton =
    'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D7E1EF] bg-white px-3 py-2 text-sm font-semibold text-[#43536E] hover:bg-[#F6F8FC] disabled:opacity-50'

function isValidComboPrice(rawPrice: string) {
    const value = Number(rawPrice)
    return (
        Number.isFinite(value) &&
        value > 0 &&
        value <= PRODUCT_PRICE_MAX &&
        Math.abs(value * 100 - Math.round(value * 100)) < 1e-8
    )
}

function friendlyError(error: unknown) {
    const messages: Record<string, string> = {
        INVALID_RELATED_PRODUCTS:
            'Uno de los productos ya no está disponible. Actualiza el catálogo e inténtalo de nuevo.',
        COMBO_CHOICE_PRODUCT_NOT_FOUND:
            'Uno de los productos elegidos ya no pertenece a este negocio o no está disponible.',
        CATEGORY_NOT_FOUND:
            'La categoría ya no está disponible. Actualiza el menú e inténtalo de nuevo.',
        INVALID_COMBO_SELECTION_CONFIGURATION:
            'Revisa los grupos: cada uno debe tener alternativas disponibles y límites válidos.',
        DUPLICATE_COMBO_CHOICE_PRODUCT:
            'Un producto está repetido o ya se usa en otra parte del combo. Revisa tus selecciones.',
        COMBO_PRODUCT_NOT_FOUND:
            'No encontramos este combo. Actualiza la página e inténtalo de nuevo.',
        INVALID_COMBO_CHOICE: 'Los combos no pueden incluirse como productos u opciones.',
        BUSINESS_ACCESS_DENIED: 'Tu cuenta no tiene permiso para crear combos en este negocio.',
    }
    if (error instanceof ApiError) {
        const codeMessage = error.code ? messages[error.code] : undefined
        if (codeMessage) return codeMessage

        const fieldMessage = Object.values(error.fieldErrors).flat()[0]
        if (fieldMessage) return fieldMessage
    }

    return getUserFriendlyError(error, {
        fallback: {
            title: 'No se pudo crear el combo',
            description: 'Ocurrió un problema al guardar el combo. Inténtalo nuevamente.',
        },
    }).description
}

function friendlyCreateError(error: unknown) {
    const description = friendlyError(error)
    if (error instanceof ApiError) {
        if (
            error.code &&
            [
                'INVALID_RELATED_PRODUCTS',
                'COMBO_CHOICE_PRODUCT_NOT_FOUND',
                'DUPLICATE_COMBO_CHOICE_PRODUCT',
                'INVALID_COMBO_SELECTION_CONFIGURATION',
            ].includes(error.code)
        )
            return { title: 'Revisa los productos del combo', description }
        if (Object.keys(error.fieldErrors).length)
            return { title: 'Revisa la información del combo', description }
    }
    const { title } = getUserFriendlyError(error, {
        fallback: { title: 'No se pudo crear el combo', description },
    })
    return { title, description }
}

function ProductPicker({
    products,
    selectedIds,
    onToggle,
    unavailableIds = [],
    categories,
    label,
    isLoading = false,
    isError = false,
    unavailableReasons = {},
}: {
    products: Product[]
    selectedIds: string[]
    onToggle: (id: string) => void
    unavailableIds?: string[]
    categories: Array<{ id: string; name: string }>
    label: string
    isLoading?: boolean
    isError?: boolean
    unavailableReasons?: Record<string, string>
}) {
    const searchId = useId()
    const [search, setSearch] = useState('')
    const [categoryId, setCategoryId] = useState('all')
    const filtered = products.filter(
        (product) =>
            product.type !== 'COMBO' &&
            (categoryId === 'all' || product.categoryId === categoryId) &&
            product.name
                .toLocaleLowerCase('es-MX')
                .includes(search.trim().toLocaleLowerCase('es-MX')),
    )
    return (
        <div>
            <label className="sr-only" htmlFor={`search-${searchId}`}>
                Buscar productos para {label}
            </label>
            <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]" />
                    <input
                        id={`search-${searchId}`}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar producto…"
                        className={`${fieldClass} pl-9`}
                    />
                </div>
                <select
                    aria-label="Filtrar por categoría"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className={fieldClass}
                >
                    <option value="all">Todas las categorías</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {isLoading && (
                    <p role="status" className="py-4 text-center text-sm text-[#65738A]">
                        Cargando productos…
                    </p>
                )}
                {isError && (
                    <p role="alert" className="py-4 text-center text-sm text-[#B42318]">
                        No pudimos cargar los productos. Actualiza e inténtalo nuevamente.
                    </p>
                )}
                {!isLoading &&
                    !isError &&
                    filtered.map((product) => {
                        const selected = selectedIds.includes(product.id)
                        const unavailable = unavailableIds.includes(product.id) && !selected
                        const reason = unavailable
                            ? (unavailableReasons[product.id] ??
                              'Ya se usa en otra parte de este combo.')
                            : ''
                        return (
                            <button
                                type="button"
                                key={product.id}
                                onClick={() => !unavailable && onToggle(product.id)}
                                disabled={unavailable}
                                aria-pressed={selected}
                                title={reason}
                                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition ${selected ? 'border-[#6D8FE9] bg-[#F2F6FF]' : unavailable ? 'cursor-not-allowed border-[#E8EEF6] bg-[#F8FAFC] opacity-60' : 'border-[#E8EEF6] hover:border-[#B8C8E5] hover:bg-[#FAFCFF]'}`}
                            >
                                <span
                                    className={`grid size-5 shrink-0 place-items-center rounded border ${selected ? 'border-[#2451C5] bg-[#2451C5] text-white' : 'border-[#C8D2E1] bg-white'}`}
                                >
                                    {selected && <Check className="size-3.5" />}
                                </span>
                                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-[#EEF3FF] text-[#5572B8]">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ImagePlus className="size-4" />
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-[#243556]">
                                        {product.name}
                                    </span>
                                    <span className="block text-xs text-[#8996A9]">
                                        {categories.find(
                                            (category) => category.id === product.categoryId,
                                        )?.name ?? 'Producto'}{' '}
                                        · ${Number(product.price).toFixed(2)}
                                    </span>
                                </span>
                                {unavailable && (
                                    <span className="text-[10px] leading-4 text-[#8996A9] sm:text-[11px]">
                                        {reason}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                {!isLoading && !isError && filtered.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[#D7E1EF] p-4 text-center text-sm text-[#8996A9]">
                        {products.length
                            ? 'No encontramos productos con esa búsqueda.'
                            : 'Agrega primero productos normales a tu menú.'}
                    </p>
                )}
            </div>
        </div>
    )
}

export function ComboManagerModal({
    open,
    categoryId,
    menus,
    combo = null,
    onClose,
}: ComboManagerModalProps) {
    const productsQuery = useProducts()
    const comboQuery = useCombo(open && combo ? combo.id : null)
    const actions = useComboManagement()
    const editing = Boolean(combo)
    const products = productsQuery.data ?? []
    const allCategories = useMemo(
        () =>
            menus
                .flatMap((menu) => menu.categories.map(({ id, name }) => ({ id, name })))
                .filter(
                    (item, index, list) =>
                        list.findIndex((other) => other.id === item.id) === index,
                ),
        [menus],
    )
    const [step, setStep] = useState(0)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [price, setPrice] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState('')
    const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId)
    const [included, setIncluded] = useState<string[]>([])
    const [includedQuantities, setIncludedQuantities] = useState<Record<string, number>>({})
    const [groups, setGroups] = useState<DraftGroup[]>([])
    const [newGroup, setNewGroup] = useState<DraftGroup>({ name: '', productIds: [] })
    const [newChoice, setNewChoice] = useState<Record<string, string>>({})
    const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null)
    const [addIncludedId, setAddIncludedId] = useState('')
    const [showIncludedPicker, setShowIncludedPicker] = useState(false)
    const [showChoicePicker, setShowChoicePicker] = useState<Record<string, boolean>>({})
    const [createError, setCreateError] = useState<{
        title: string
        description: string
        retryable?: boolean
    } | null>(null)
    const [editingComboDetails, setEditingComboDetails] = useState(false)
    const [comboName, setComboName] = useState('')
    const [comboDescription, setComboDescription] = useState('')
    const [comboPrice, setComboPrice] = useState('')
    const [comboDetailsError, setComboDetailsError] = useState('')

    const busy =
        actions.create.isPending ||
        actions.addIncluded.isPending ||
        actions.removeIncluded.isPending ||
        actions.updateIncludedQuantity.isPending ||
        actions.createGroup.isPending ||
        actions.updateGroup.isPending ||
        actions.deleteGroup.isPending ||
        actions.addChoice.isPending ||
        actions.removeChoice.isPending ||
        actions.updateDetails.isPending
    const currentCombo = comboQuery.data
    const existingUsedIds = currentCombo
        ? [
              ...currentCombo.includedProducts.map((item) => item.productId),
              ...currentCombo.optionGroups.flatMap((group) =>
                  group.products.map((item) => item.productId),
              ),
          ]
        : []
    const draftUsedIds = [...included, ...groups.flatMap((group) => group.productIds)]

    function close() {
        if (busy) return
        setStep(0)
        setName('')
        setDescription('')
        setPrice('')
        setImageUrl('')
        setImageFile(null)
        setImagePreview('')
        setSelectedCategoryId(categoryId)
        setIncluded([])
        setIncludedQuantities({})
        setGroups([])
        setNewGroup({ name: '', productIds: [] })
        setNewChoice({})
        setEditingGroup(null)
        setAddIncludedId('')
        setShowIncludedPicker(false)
        setShowChoicePicker({})
        setCreateError(null)
        setEditingComboDetails(false)
        setComboDetailsError('')
        onClose()
    }

    function selectImage(file: File | undefined) {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setCreateError({ title: 'Imagen no válida', description: 'Selecciona un archivo de imagen válido.' })
            setComboDetailsError('Selecciona un archivo de imagen válido.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setCreateError({ title: 'La imagen es demasiado grande', description: 'La imagen no puede superar 5 MB.' })
            setComboDetailsError('La imagen no puede superar 5 MB.')
            return
        }
        setImageFile(file)
        setImageUrl('')
        const reader = new FileReader()
        reader.onload = () => setImagePreview(String(reader.result ?? ''))
        reader.readAsDataURL(file)
        setCreateError(null)
        setComboDetailsError('')
    }

    function toggle(ids: string[], id: string, setter: (next: string[]) => void) {
        setter(ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
    }

    function addDraftGroup() {
        if (groups.length >= COMBO_OPTION_GROUPS_MAX) {
            setCreateError({
                title: 'Llegaste al máximo de grupos',
                description: `Un combo puede tener hasta ${COMBO_OPTION_GROUPS_MAX} grupos de opciones.`,
            })
            return
        }
        if (!newGroup.name.trim() || newGroup.productIds.length < 2) {
            notify.warning({
                title: 'Completa el grupo',
                description: 'Escribe un nombre y selecciona al menos dos productos distintos.',
            })
            return
        }
        setGroups((current) => [...current, { ...newGroup, name: newGroup.name.trim() }])
        setNewGroup({ name: '', productIds: [] })
        notify.success({
            title: 'Grupo agregado',
            description: 'El cliente podrá elegir un producto de esta lista.',
        })
    }

    function create() {
        if (busy) return
        setCreateError(null)
        const numericPrice = Number(price)
        if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
            setCreateError({
                title: 'Revisa los datos del combo',
                description: 'Escribe un nombre y un precio válido mayor que cero.',
            })
            setStep(0)
            return
        }
        if (name.trim().length > COMBO_NAME_MAX_LENGTH) {
            setCreateError({
                title: 'El nombre es demasiado largo',
                description: `Usa ${COMBO_NAME_MAX_LENGTH} caracteres o menos.`,
            })
            setStep(0)
            return
        }
        if (description.trim().length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
            setCreateError({
                title: 'La descripción es demasiado larga',
                description: `Usa ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres o menos.`,
            })
            setStep(0)
            return
        }
        if (!isValidComboPrice(price)) {
            setCreateError({
                title: 'El precio no es válido',
                description: `Usa un precio de hasta $${PRODUCT_PRICE_MAX.toLocaleString('es-MX')} y máximo dos decimales.`,
            })
            setStep(0)
            return
        }
        if (!selectedCategoryId || !included.length) {
            setCreateError({
                title: 'Falta información para crear el combo',
                description:
                    'Selecciona una categoría y al menos un producto que siempre venga incluido.',
            })
            setStep(!selectedCategoryId ? 0 : 1)
            return
        }
        if (
            groups.length > COMBO_OPTION_GROUPS_MAX ||
            groups.some(
                (group) =>
                    !group.name.trim() ||
                    group.name.trim().length > COMBO_OPTION_GROUP_NAME_MAX_LENGTH ||
                    group.productIds.length < 2 ||
                    group.productIds.length > COMBO_GROUP_CHOICES_MAX,
            )
        ) {
            setCreateError({
                title: 'Revisa los grupos de opciones',
                description:
                    'Cada grupo necesita un nombre y al menos dos productos para que el cliente pueda elegir.',
            })
            setStep(2)
            return
        }
        actions.create.mutate(
            {
                categoryId: selectedCategoryId,
                name: name.trim(),
                description: description.trim(),
                price: numericPrice,
                ...(imageFile
                    ? { imageFile }
                    : imageUrl.trim()
                      ? { imageUrl: imageUrl.trim() }
                      : {}),
                includedProducts: included.map((productId) => ({ productId, quantity: includedQuantities[productId] ?? 1 })),
                includedProductIds: included,
                optionGroups: groups as ComboGroupInput[],
            },
            {
                onSuccess: () => {
                    setCreateError(null)
                    setStep(0)
                    setName('')
                    setDescription('')
                    setPrice('')
                    setImageUrl('')
                    setImageFile(null)
                    setImagePreview('')
                    setSelectedCategoryId(categoryId)
                    setIncluded([])
                    setGroups([])
                    setNewGroup({ name: '', productIds: [] })
                    onClose()
                },
                onError: (error) =>
                    setCreateError({ ...friendlyCreateError(error), retryable: true }),
            },
        )
    }

    const title = editing
        ? `Administrar ${currentCombo?.name ?? combo?.name ?? 'combo'}`
        : 'Crear un combo'
    return (
        <Modal
            open={open}
            testId={editing ? 'combo-settings-dialog' : 'combo-creation-dialog'}
            onClose={close}
            closeDisabled={busy}
            title={title}
            description={
                editing
                    ? 'Revisa qué incluye el combo y administra las opciones que verá el cliente.'
                    : 'Primero define el combo que venderás; después indica qué incluye y qué podrá elegir el cliente.'
            }
            size="lg"
        >
            {editing ? (
                comboQuery.isLoading ? (
                    <div
                        role="status"
                        className="flex items-center justify-center gap-2 py-14 text-sm text-[#65738A]"
                    >
                        <LoaderCircle className="size-4 animate-spin" />
                        Cargando configuración del combo…
                    </div>
                ) : comboQuery.isError || !currentCombo ? (
                    <div
                        role="alert"
                        className="rounded-xl border border-[#F1C6C2] bg-[#FFF8F7] p-4 text-sm text-[#9B2C24]"
                    >
                        {comboQuery.error instanceof ApiError &&
                        comboQuery.error.code === 'COMBO_PRODUCT_NOT_FOUND'
                            ? 'No encontramos este combo. Actualiza la página e inténtalo nuevamente.'
                            : 'No pudimos cargar la configuración del combo. Revisa tu conexión e inténtalo nuevamente.'}
                    </div>
                ) : (
                    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
                        <section className="rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#5572B8]">
                                        Información del combo
                                    </p>
                                    {!editingComboDetails && (
                                        <>
                                            <h3 className="mt-2 text-lg font-bold text-[#12234A]">
                                                {currentCombo.name}
                                            </h3>
                                            <p className="mt-1 text-sm text-[#65738A]">
                                                {currentCombo.description || 'Sin descripción'} · $
                                                {Number(currentCombo.price).toFixed(2)} ·{' '}
                                                {currentCombo.category.name}
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-[#EAF0FF] px-2 py-1 text-xs font-bold text-[#2451C5]">
                                        COMBO
                                    </span>
                                    {!editingComboDetails && (
                                        <button
                                            type="button"
                                            className={quietButton}
                                            onClick={() => {
                                                setComboName(currentCombo.name)
                                                setComboDescription(currentCombo.description ?? '')
                                                setComboPrice(String(currentCombo.price))
                                                setImageFile(null)
                                                setImageUrl('')
                                                setImagePreview(currentCombo.imageUrl ?? '')
                                                setComboDetailsError('')
                                                setEditingComboDetails(true)
                                            }}
                                        >
                                            Editar información
                                        </button>
                                    )}
                                </div>
                            </div>
                            {editingComboDetails && (
                                <form
                                    className="mt-4 space-y-3"
                                    onSubmit={(event) => {
                                        event.preventDefault()
                                        const trimmedName = comboName.trim()
                                        if (
                                            !trimmedName ||
                                            trimmedName.length > COMBO_NAME_MAX_LENGTH
                                        ) {
                                            setComboDetailsError(
                                                `Escribe un nombre de hasta ${COMBO_NAME_MAX_LENGTH} caracteres.`,
                                            )
                                            return
                                        }
                                        if (
                                            comboDescription.trim().length >
                                            PRODUCT_DESCRIPTION_MAX_LENGTH
                                        ) {
                                            setComboDetailsError(
                                                `La descripción admite hasta ${PRODUCT_DESCRIPTION_MAX_LENGTH} caracteres.`,
                                            )
                                            return
                                        }
                                        if (!isValidComboPrice(comboPrice)) {
                                            setComboDetailsError(
                                                'Escribe un precio mayor que cero, con máximo dos decimales.',
                                            )
                                            return
                                        }
                                        setComboDetailsError('')
                                        void actions.updateDetails
                                            .mutateAsync({
                                                comboId: currentCombo.id,
                                                input: {
                                                    name: trimmedName,
                                                    description: comboDescription.trim(),
                                                    price: Number(comboPrice),
                                                    ...(imageFile ? { imageFile } : {}),
                                                },
                                            })
                                            .then(() => setEditingComboDetails(false))
                                            .catch((error: unknown) =>
                                                setComboDetailsError(friendlyError(error)),
                                            )
                                    }}
                                >
                                    <label className="block text-xs font-semibold text-[#43536E]">
                                        Nombre <span className="text-[#B42318]">(obligatorio)</span>
                                        <input
                                            aria-label="Nombre del combo"
                                            maxLength={COMBO_NAME_MAX_LENGTH}
                                            className={`${fieldClass} mt-1`}
                                            value={comboName}
                                            onChange={(event) => setComboName(event.target.value)}
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold text-[#43536E]">
                                        Descripción{' '}
                                        <span className="font-normal text-[#8996A9]">
                                            (opcional)
                                        </span>
                                        <textarea
                                            aria-label="Descripción del combo"
                                            maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                                            className={`${fieldClass} mt-1 min-h-20 resize-y`}
                                            value={comboDescription}
                                            onChange={(event) =>
                                                setComboDescription(event.target.value)
                                            }
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold text-[#43536E]">
                                        Precio <span className="text-[#B42318]">(obligatorio)</span>
                                        <input
                                            aria-label="Precio del combo"
                                            inputMode="decimal"
                                            className={`${fieldClass} mt-1`}
                                            value={comboPrice}
                                            onChange={(event) => setComboPrice(event.target.value)}
                                        />
                                    </label>
                                    <label className="block text-xs font-semibold text-[#43536E]">
                                        Imagen del combo <span className="font-normal text-[#8996A9]">(opcional)</span>
                                        <span className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] p-2.5 hover:border-[#2451C5]">
                                            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EAF0FF] text-[#2451C5]">
                                                {imagePreview ? <img src={imagePreview} alt="Vista previa del combo" className="h-full w-full object-cover" /> : <ImagePlus className="size-5" />}
                                            </span>
                                            <span className="text-left">
                                                <span className="block text-sm font-semibold text-[#243556]">{imagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
                                                <span className="block text-xs font-normal text-[#8996A9]">JPG, PNG o WebP · máximo 5 MB</span>
                                            </span>
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} />
                                        </span>
                                    </label>
                                    {comboDetailsError && (
                                        <p
                                            role="alert"
                                            className="rounded-lg bg-[#FFF2F0] px-3 py-2 text-sm text-[#9B2C24]"
                                        >
                                            {comboDetailsError}
                                        </p>
                                    )}
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            className={quietButton}
                                            disabled={actions.updateDetails.isPending}
                                            onClick={() => {
                                                setEditingComboDetails(false)
                                                setComboDetailsError('')
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className={primaryButton}
                                            disabled={busy}
                                        >
                                            {actions.updateDetails.isPending
                                                ? 'Guardando…'
                                                : 'Guardar cambios'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </section>
                        <section className="rounded-xl border border-[#D5E2F5] bg-white p-4">
                            <header className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-[#243556]">
                                        Productos incluidos
                                    </h3>
                                    <p className="mt-1 text-xs text-[#65738A]">
                                        El cliente recibe todos estos productos.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold text-[#8996A9]">
                                    {currentCombo.includedProducts.length} incluidos
                                </span>
                            </header>
                            <div
                                data-testid="combo-included-product-list"
                                className="mt-3 space-y-2"
                            >
                                {currentCombo.includedProducts.map((item) => {
                                    const quantity = item.quantity ?? 1
                                    return <div
                                        key={item.id}
                                        data-testid={`combo-included-product-${item.productId}`}
                                        className="flex items-center justify-between gap-3 rounded-lg bg-[#F7F9FC] px-3 py-2"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-[#243556]">
                                                {item.product.name}
                                            </p>
                                            <p className="text-xs text-[#8996A9]">
                                                ${Number(item.product.price).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                aria-label={`Disminuir cantidad de ${item.product.name}`}
                                                disabled={busy || quantity <= 1}
                                                onClick={() => actions.updateIncludedQuantity.mutate(
                                                    { comboId: combo!.id, includedId: item.id, quantity: quantity - 1 },
                                                    { onError: (error) => notify.error({ title: 'No se pudo actualizar la cantidad', description: friendlyError(error) }) },
                                                )}
                                                className="grid size-8 place-items-center rounded-md border border-[#D7E1EF] text-[#53647D] disabled:opacity-40"
                                            >−</button>
                                            <span
                                                data-testid={`combo-edit-included-quantity-${item.productId}`}
                                                className={`min-w-6 text-center text-sm font-bold ${quantity >= 10 ? 'text-[#B42318]' : 'text-[#243556]'}`}
                                            >{quantity}</span>
                                            <button
                                                type="button"
                                                aria-label={`Aumentar cantidad de ${item.product.name}`}
                                                disabled={busy || quantity >= 10}
                                                onClick={() => actions.updateIncludedQuantity.mutate(
                                                    { comboId: combo!.id, includedId: item.id, quantity: quantity + 1 },
                                                    { onError: (error) => notify.error({ title: 'No se pudo actualizar la cantidad', description: friendlyError(error) }) },
                                                )}
                                                className={`grid size-8 place-items-center rounded-md border text-sm font-bold ${quantity >= 10 ? 'cursor-not-allowed border-[#F3C2BD] text-[#B42318]' : 'border-[#D7E1EF] text-[#2451C5]'}`}
                                            >+</button>
                                            <button
                                            type="button"
                                            aria-label={`Quitar ${item.product.name} de productos incluidos`}
                                            disabled={busy || currentCombo.includedProducts.length <= 1}
                                            title={
                                                currentCombo.includedProducts.length <= 1
                                                    ? 'El combo debe conservar al menos un producto incluido.'
                                                    : undefined
                                            }
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        `¿Quitar “${item.product.name}” de los productos incluidos?`,
                                                    )
                                                )
                                                    actions.removeIncluded.mutate(
                                                        { comboId: combo!.id, includedId: item.id },
                                                        {
                                                            onError: (error) =>
                                                                notify.error({
                                                                    title: 'No se pudo quitar el producto',
                                                                    description:
                                                                        friendlyError(error),
                                                                }),
                                                        },
                                                    )
                                            }}
                                            className="grid size-8 place-items-center rounded-md text-[#78869B] hover:bg-[#FDECEC] hover:text-[#B42318]"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                })}
                            </div>
                            {currentCombo.includedProducts.length === 0 && (
                                <p className="mt-3 rounded-lg border border-dashed border-[#D7E1EF] p-3 text-xs text-[#8996A9]">
                                    Aún no hay productos obligatorios.
                                </p>
                            )}
                            <button
                                type="button"
                                className={`${quietButton} mt-3`}
                                onClick={() => setShowIncludedPicker(!showIncludedPicker)}
                                disabled={
                                    busy ||
                                    currentCombo.includedProducts.length >=
                                        COMBO_INCLUDED_PRODUCTS_MAX
                                }
                                title={
                                    currentCombo.includedProducts.length >=
                                    COMBO_INCLUDED_PRODUCTS_MAX
                                        ? `El combo admite hasta ${COMBO_INCLUDED_PRODUCTS_MAX} productos incluidos.`
                                        : undefined
                                }
                            >
                                <Plus className="size-4" />
                                {showIncludedPicker
                                    ? 'Cerrar selector'
                                    : 'Agregar producto incluido'}
                            </button>
                            {showIncludedPicker && (
                                <div className="mt-3">
                                    <ProductPicker
                                        label="producto incluido"
                                        products={products}
                                        categories={allCategories}
                                        selectedIds={addIncludedId ? [addIncludedId] : []}
                                        unavailableIds={existingUsedIds.filter(
                                            (id) => id !== addIncludedId,
                                        )}
                                        unavailableReasons={Object.fromEntries(
                                            currentCombo.optionGroups.flatMap((group) =>
                                                group.products.map((choice) => [
                                                    choice.productId,
                                                    'Este producto ya se usa en un grupo de opciones.',
                                                ]),
                                            ),
                                        )}
                                        isLoading={productsQuery.isLoading}
                                        isError={productsQuery.isError}
                                        onToggle={(id) =>
                                            setAddIncludedId((current) =>
                                                current === id ? '' : id,
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className={`${primaryButton} mt-3`}
                                        disabled={!addIncludedId || busy}
                                        onClick={() =>
                                            actions.addIncluded.mutate(
                                                { comboId: combo!.id, productId: addIncludedId },
                                                {
                                                    onSuccess: () => {
                                                        setAddIncludedId('')
                                                        setShowIncludedPicker(false)
                                                    },
                                                    onError: (error) =>
                                                        notify.error({
                                                            title: 'No se pudo agregar',
                                                            description: friendlyError(error),
                                                        }),
                                                },
                                            )
                                        }
                                    >
                                        <Plus className="size-4" />
                                        Agregar como producto incluido
                                    </button>
                                </div>
                            )}
                        </section>
                        <section className="rounded-xl border border-[#E3DCCB] bg-[#FFFEFB] p-4">
                            <header>
                                <h3 className="text-sm font-bold text-[#493D2C]">
                                    Opciones del cliente
                                </h3>
                                <p className="mt-1 text-xs text-[#786D5F]">
                                    Aquí eliges alternativas; el cliente selecciona según la regla
                                    de cada grupo.
                                </p>
                            </header>
                            <div className="mt-3 space-y-3">
                                {currentCombo.optionGroups.map((group) => (
                                    <article
                                        key={group.id}
                                        data-testid={`combo-option-group-${group.id}`}
                                        className="rounded-lg border border-[#EAE3D6] bg-white p-3"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-[#493D2C]">
                                                    {group.name}
                                                </h4>
                                                <p className="mt-0.5 text-xs text-[#786D5F]">
                                                    El cliente elige un producto ·{' '}
                                                    {group.products.length}{' '}
                                                    {group.products.length === 1
                                                        ? 'opción'
                                                        : 'opciones'}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    className={quietButton}
                                                    onClick={() =>
                                                        setEditingGroup({
                                                            id: group.id,
                                                            name: group.name,
                                                        })
                                                    }
                                                >
                                                    Editar grupo
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Eliminar grupo ${group.name}`}
                                                    className="grid size-9 place-items-center rounded-lg text-[#79869A] hover:bg-[#FDECEC] hover:text-[#B42318]"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                `Se eliminará el grupo “${group.name}” y todas sus opciones. ¿Continuar?`,
                                                            )
                                                        )
                                                            actions.deleteGroup.mutate(
                                                                {
                                                                    comboId: combo!.id,
                                                                    groupId: group.id,
                                                                },
                                                                {
                                                                    onError: (error) =>
                                                                        notify.error({
                                                                            title: 'No se pudo eliminar el grupo',
                                                                            description:
                                                                                friendlyError(
                                                                                    error,
                                                                                ),
                                                                        }),
                                                                },
                                                            )
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {editingGroup?.id === group.id && (
                                            <form
                                                className="mt-3 flex flex-col gap-2 sm:flex-row"
                                                onSubmit={(event) => {
                                                    event.preventDefault()
                                                    if (
                                                        !editingGroup.name.trim() ||
                                                        editingGroup.name.trim().length >
                                                            COMBO_OPTION_GROUP_NAME_MAX_LENGTH
                                                    ) {
                                                        notify.warning({
                                                            title: 'Revisa el nombre del grupo',
                                                            description: `Escribe un nombre de hasta ${COMBO_OPTION_GROUP_NAME_MAX_LENGTH} caracteres.`,
                                                        })
                                                        return
                                                    }
                                                    actions.updateGroup.mutate(
                                                        {
                                                            comboId: combo!.id,
                                                            groupId: group.id,
                                                            input: {
                                                                name: editingGroup.name.trim(),
                                                            },
                                                        },
                                                        {
                                                            onSuccess: () => setEditingGroup(null),
                                                            onError: (error) =>
                                                                notify.error({
                                                                    title: 'No se pudo actualizar el grupo',
                                                                    description:
                                                                        friendlyError(error),
                                                                }),
                                                        },
                                                    )
                                                }}
                                            >
                                                <input
                                                    aria-label="Nombre del grupo"
                                                    maxLength={COMBO_OPTION_GROUP_NAME_MAX_LENGTH}
                                                    className={fieldClass}
                                                    value={editingGroup.name}
                                                    onChange={(event) =>
                                                        setEditingGroup({
                                                            ...editingGroup,
                                                            name: event.target.value,
                                                        })
                                                    }
                                                />
                                                <span className="self-center text-xs text-[#8996A9]">
                                                    {editingGroup.name.length}/
                                                    {COMBO_OPTION_GROUP_NAME_MAX_LENGTH}
                                                </span>
                                                <button
                                                    type="submit"
                                                    className={primaryButton}
                                                    disabled={busy}
                                                >
                                                    Guardar
                                                </button>
                                            </form>
                                        )}
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {group.products.map((choice) => (
                                                <span
                                                    key={choice.id}
                                                    data-testid={`combo-option-choice-${choice.productId}`}
                                                    className="inline-flex items-center gap-2 rounded-md bg-[#F6F3ED] px-2.5 py-1.5 text-xs font-medium text-[#574A38]"
                                                >
                                                    {choice.product.name}
                                                    <button
                                                        type="button"
                                                        aria-label={`Quitar ${choice.product.name} de ${group.name}`}
                                                        disabled={
                                                            busy || group.products.length <= 2
                                                        }
                                                        title={
                                                            group.products.length <= 2
                                                                ? 'Cada grupo debe conservar al menos dos opciones.'
                                                                : 'Quitar opción'
                                                        }
                                                        onClick={() =>
                                                            actions.removeChoice.mutate(
                                                                {
                                                                    comboId: combo!.id,
                                                                    groupId: group.id,
                                                                    productId: choice.productId,
                                                                },
                                                                {
                                                                    onError: (error) =>
                                                                        notify.error({
                                                                            title: 'No se pudo quitar la opción',
                                                                            description:
                                                                                friendlyError(
                                                                                    error,
                                                                                ),
                                                                        }),
                                                                },
                                                            )
                                                        }
                                                        className="text-[#786D5F] hover:text-[#B42318]"
                                                    >
                                                        <X className="size-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className={`${quietButton} mt-3`}
                                            disabled={
                                                busy ||
                                                group.products.length >= COMBO_GROUP_CHOICES_MAX
                                            }
                                            title={
                                                group.products.length >= COMBO_GROUP_CHOICES_MAX
                                                    ? `Cada grupo admite hasta ${COMBO_GROUP_CHOICES_MAX} productos.`
                                                    : undefined
                                            }
                                            onClick={() =>
                                                setShowChoicePicker({
                                                    ...showChoicePicker,
                                                    [group.id]: !showChoicePicker[group.id],
                                                })
                                            }
                                        >
                                            <Plus className="size-4" />
                                            {showChoicePicker[group.id]
                                                ? 'Cerrar selector'
                                                : 'Agregar opción'}
                                        </button>
                                        {showChoicePicker[group.id] && (
                                            <div className="mt-3">
                                                <ProductPicker
                                                    label={`opción para ${group.name}`}
                                                    products={products}
                                                    categories={allCategories}
                                                    selectedIds={
                                                        newChoice[group.id]
                                                            ? [newChoice[group.id]!]
                                                            : []
                                                    }
                                                    unavailableIds={existingUsedIds.filter(
                                                        (id) => id !== newChoice[group.id],
                                                    )}
                                                    unavailableReasons={Object.fromEntries([
                                                        ...currentCombo.includedProducts.map(
                                                            (item) => [
                                                                item.productId,
                                                                'Este producto ya está incluido obligatoriamente.',
                                                            ],
                                                        ),
                                                        ...currentCombo.optionGroups.flatMap(
                                                            (item) =>
                                                                item.products.map((choice) => [
                                                                    choice.productId,
                                                                    'Este producto ya se usa en un grupo de opciones.',
                                                                ]),
                                                        ),
                                                    ])}
                                                    isLoading={productsQuery.isLoading}
                                                    isError={productsQuery.isError}
                                                    onToggle={(id) =>
                                                        setNewChoice({
                                                            ...newChoice,
                                                            [group.id]:
                                                                newChoice[group.id] === id
                                                                    ? ''
                                                                    : id,
                                                        })
                                                    }
                                                />
                                                <button
                                                    type="button"
                                                    className={`${primaryButton} mt-3`}
                                                    disabled={!newChoice[group.id] || busy}
                                                    onClick={() =>
                                                        actions.addChoice.mutate(
                                                            {
                                                                comboId: combo!.id,
                                                                groupId: group.id,
                                                                productId: newChoice[group.id]!,
                                                            },
                                                            {
                                                                onSuccess: () => {
                                                                    setNewChoice({
                                                                        ...newChoice,
                                                                        [group.id]: '',
                                                                    })
                                                                    setShowChoicePicker({
                                                                        ...showChoicePicker,
                                                                        [group.id]: false,
                                                                    })
                                                                },
                                                                onError: (error) =>
                                                                    notify.error({
                                                                        title: 'No se pudo agregar la opción',
                                                                        description:
                                                                            friendlyError(error),
                                                                    }),
                                                            },
                                                        )
                                                    }
                                                >
                                                    <Plus className="size-4" />
                                                    Agregar opción al grupo
                                                </button>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                            {!currentCombo.optionGroups.length && (
                                <p className="mt-3 rounded-lg border border-dashed border-[#E3DCCB] p-3 text-xs text-[#786D5F]">
                                    Aún no hay grupos. Crea uno para que el cliente pueda elegir
                                    alternativas.
                                </p>
                            )}
                            <form
                                className="mt-4 rounded-lg border border-dashed border-[#D9D0C2] bg-white p-3"
                                onSubmit={(event) => {
                                    event.preventDefault()
                                    if (
                                        !newGroup.name.trim() ||
                                        newGroup.name.trim().length >
                                            COMBO_OPTION_GROUP_NAME_MAX_LENGTH ||
                                        newGroup.productIds.length < 2 ||
                                        newGroup.productIds.length > COMBO_GROUP_CHOICES_MAX ||
                                        currentCombo.optionGroups.length >= COMBO_OPTION_GROUPS_MAX
                                    ) {
                                        notify.warning({
                                            title: 'Completa el grupo',
                                            description: `Escribe un nombre de hasta ${COMBO_OPTION_GROUP_NAME_MAX_LENGTH} caracteres, selecciona entre 2 y ${COMBO_GROUP_CHOICES_MAX} productos y no superes ${COMBO_OPTION_GROUPS_MAX} grupos.`,
                                        })
                                        return
                                    }
                                    actions.createGroup.mutate(
                                        {
                                            comboId: combo!.id,
                                            input: { ...newGroup, name: newGroup.name.trim() },
                                        },
                                        {
                                            onSuccess: () =>
                                                setNewGroup({ name: '', productIds: [] }),
                                            onError: (error) =>
                                                notify.error({
                                                    title: 'No se pudo crear el grupo',
                                                    description: friendlyError(error),
                                                }),
                                        },
                                    )
                                }}
                            >
                                <p className="text-xs font-bold text-[#493D2C]">
                                    Agregar grupo de opciones
                                </p>
                                <input
                                    aria-label="Nombre del nuevo grupo"
                                    maxLength={COMBO_OPTION_GROUP_NAME_MAX_LENGTH}
                                    className={`${fieldClass} mt-2`}
                                    placeholder="Nombre del grupo, por ejemplo: Acompañamiento"
                                    value={newGroup.name}
                                    onChange={(event) =>
                                        setNewGroup({ ...newGroup, name: event.target.value })
                                    }
                                />
                                <p className="mt-1 text-right text-[11px] text-[#8996A9]">
                                    {newGroup.name.length}/{COMBO_OPTION_GROUP_NAME_MAX_LENGTH}
                                </p>
                                <div className="mt-2">
                                    <p className="text-xs text-[#65738A]">
                                        El cliente elegirá una opción de este grupo.
                                    </p>
                                </div>
                                <div className="mt-3">
                                    <ProductPicker
                                        label="opciones"
                                        products={products}
                                        categories={allCategories}
                                        isLoading={productsQuery.isLoading}
                                        isError={productsQuery.isError}
                                        selectedIds={newGroup.productIds}
                                        unavailableIds={draftUsedIds.filter(
                                            (id) => !newGroup.productIds.includes(id),
                                        )}
                                        unavailableReasons={Object.fromEntries([
                                            ...included.map((id) => [
                                                id,
                                                'Este producto ya está incluido obligatoriamente.',
                                            ]),
                                            ...groups.flatMap((item) =>
                                                item.productIds.map((id) => [
                                                    id,
                                                    'Este producto ya se usa en otro grupo de opciones.',
                                                ]),
                                            ),
                                        ])}
                                        onToggle={(id) => {
                                            if (
                                                !newGroup.productIds.includes(id) &&
                                                newGroup.productIds.length >=
                                                    COMBO_GROUP_CHOICES_MAX
                                            ) {
                                                notify.warning({
                                                    title: 'Llegaste al máximo de opciones',
                                                    description: `Cada grupo puede tener hasta ${COMBO_GROUP_CHOICES_MAX} productos.`,
                                                })
                                                return
                                            }
                                            toggle(newGroup.productIds, id, (productIds) =>
                                                setNewGroup({ ...newGroup, productIds }),
                                            )
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className={`${quietButton} mt-3`}
                                    disabled={
                                        !newGroup.name.trim() || newGroup.productIds.length < 2
                                    }
                                >
                                    <Plus className="size-4" />
                                    Guardar grupo de opciones
                                </button>
                                <p className="mt-2 text-[11px] text-[#8996A9]">
                                    Agrega un nombre y al menos dos productos. El cliente podrá
                                    elegir solo uno.
                                </p>
                            </form>
                        </section>
                    </div>
                )
            ) : (
                <div className="max-h-[70vh] overflow-y-auto">
                    <ol
                        aria-label="Progreso de creación del combo"
                        className="mb-5 grid grid-cols-4 gap-2"
                    >
                        {['Datos', 'Incluye', 'Opciones', 'Revisión'].map((label, index) => (
                            <li
                                key={label}
                                className={`border-b-2 pb-2 text-xs font-semibold ${index === step ? 'border-[#2451C5] text-[#2451C5]' : index < step ? 'border-[#9EB5EA] text-[#53617A]' : 'border-[#E8EEF6] text-[#8996A9]'}`}
                            >
                                {label}
                            </li>
                        ))}
                    </ol>
                    {step === 0 && (
                        <section className="space-y-4">
                            <p className="rounded-lg bg-[#F6F8FC] px-3 py-2 text-xs leading-5 text-[#65738A]">
                                Obligatorios: nombre, precio y categoría. Descripción e imagen son
                                opcionales.
                            </p>
                            <label className="block text-sm font-medium text-[#243556]">
                                Nombre del combo <span className="text-[#B42318">*</span>
                                <input
                                    className={`${fieldClass} mt-1`}
                                    value={name}
                                    maxLength={COMBO_NAME_MAX_LENGTH}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Nombre del combo"
                                    required
                                    aria-required="true"
                                />
                                <span className="mt-1 block text-right text-xs text-[#8996A9]">
                                    {name.length}/{COMBO_NAME_MAX_LENGTH}
                                </span>
                            </label>
                            <label className="block text-sm font-medium text-[#243556]">
                                Descripción{' '}
                                <span className="font-normal text-[#8996A9]">(opcional)</span>
                                <textarea
                                    className={`${fieldClass} mt-1`}
                                    value={description}
                                    maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                                    onChange={(event) => setDescription(event.target.value)}
                                    rows={3}
                                    placeholder="Describe brevemente qué ofrece este combo"
                                />
                                <span className="mt-1 block text-right text-xs text-[#8996A9]">
                                    {description.length}/{PRODUCT_DESCRIPTION_MAX_LENGTH}
                                </span>
                            </label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-[#243556]">
                                    Precio <span className="text-[#B42318">*</span>
                                    <input
                                        className={`${fieldClass} mt-1`}
                                        type="number"
                                        min="0.01"
                                        max={PRODUCT_PRICE_MAX}
                                        step="0.01"
                                        value={price}
                                        required
                                        aria-required="true"
                                        onChange={(event) => setPrice(event.target.value)}
                                    />
                                    <span className="mt-1 block text-xs font-normal text-[#8996A9]">
                                        Mayor que cero, hasta $
                                        {PRODUCT_PRICE_MAX.toLocaleString('es-MX')} y máximo dos
                                        decimales.
                                    </span>
                                </label>
                                <label className="block text-sm font-medium text-[#243556]">
                                    Categoría <span className="text-[#B42318">*</span>
                                    <select
                                        className={`${fieldClass} mt-1`}
                                        value={selectedCategoryId}
                                        required
                                        aria-required="true"
                                        onChange={(event) =>
                                            setSelectedCategoryId(event.target.value)
                                        }
                                    >
                                        {allCategories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <label className="block text-sm font-medium text-[#243556]">
                                Imagen del combo{' '}
                                <span className="font-normal text-[#8996A9]">(opcional)</span>
                                <span className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] p-2.5 hover:border-[#2451C5]">
                                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EAF0FF] text-[#2451C5]">
                                        {imagePreview || imageUrl ? (
                                            <img src={imagePreview || imageUrl} alt="Vista previa del combo" className="h-full w-full object-cover" />
                                        ) : <ImagePlus className="size-5" />}
                                    </span>
                                    <span className="text-left">
                                        <span className="block text-sm font-semibold text-[#243556]">{imagePreview || imageUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}</span>
                                        <span className="block text-xs font-normal text-[#8996A9]">JPG, PNG o WebP · máximo 5 MB</span>
                                    </span>
                                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} />
                                </span>
                            </label>
                        </section>
                    )}
                    {step === 1 && (
                        <section>
                            <h3 className="text-sm font-semibold text-[#243556]">
                                Productos incluidos <span className="text-[#B42318">*</span>
                            </h3>
                            <p className="mt-1 text-sm text-[#65738A]">
                                Obligatorio para continuar: selecciona al menos un producto. Todo lo
                                que elijas vendrá siempre con el combo.
                            </p>
                            <div className="mt-4">
                                <ProductPicker
                                    label="productos incluidos"
                                    products={products}
                                    categories={allCategories}
                                    isLoading={productsQuery.isLoading}
                                    isError={productsQuery.isError}
                                    selectedIds={included}
                                    unavailableIds={draftUsedIds.filter(
                                        (id) => !included.includes(id),
                                    )}
                                    onToggle={(id) => {
                                        if (!included.includes(id) && included.length >= COMBO_INCLUDED_PRODUCTS_MAX) {
                                            setCreateError({
                                                title: 'Llegaste al máximo de productos',
                                                description: `Un combo puede incluir hasta ${COMBO_INCLUDED_PRODUCTS_MAX} productos obligatorios.`,
                                            })
                                            return
                                        }
                                        setCreateError(null)
                                        toggle(included, id, (productIds) => {
                                            setIncluded(productIds)
                                            setIncludedQuantities((current) => {
                                                if (productIds.includes(id)) return { ...current, [id]: current[id] ?? 1 }
                                                const next = { ...current }
                                                delete next[id]
                                                return next
                                            })
                                        })
                                    }}
                                />
                            </div>
                            {included.length > 0 && (
                                <div className="mt-3 space-y-2 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3">
                                    <p className="text-xs font-bold uppercase tracking-[.08em] text-[#65738A]">Cantidad de cada producto</p>
                                    {included.map((id) => {
                                        const quantity = includedQuantities[id] ?? 1
                                        const atProductLimit = quantity >= 10
                                        return <div key={id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"><span className="min-w-0 truncate text-sm font-semibold text-[#243556]">{products.find((item) => item.id === id)?.name}</span><div className="flex items-center gap-2"><button type="button" aria-label={`Disminuir cantidad de ${products.find((item) => item.id === id)?.name ?? 'producto'}`} onClick={() => setIncludedQuantities((current) => ({ ...current, [id]: Math.max(1, quantity - 1) }))} className="grid size-8 place-items-center rounded-lg border border-[#D7E1EF] text-[#53647D]">−</button><span data-testid={`combo-included-quantity-${id}`} className={`min-w-6 text-center text-sm font-bold ${atProductLimit ? 'text-[#B42318]' : 'text-[#243556]'}`}>{quantity}</span><button type="button" aria-label={`Aumentar cantidad de ${products.find((item) => item.id === id)?.name ?? 'producto'}`} disabled={atProductLimit} onClick={() => setIncludedQuantities((current) => ({ ...current, [id]: Math.min(10, quantity + 1) }))} className={`grid size-8 place-items-center rounded-lg border text-sm font-bold ${atProductLimit ? 'cursor-not-allowed border-[#F3C2BD] text-[#B42318]' : 'border-[#D7E1EF] text-[#2451C5]'}`}>+</button></div></div>
                                    })}
                                </div>
                            )}
                            <p className="text-right text-xs text-[#8996A9]">
                                {included.length}/{COMBO_INCLUDED_PRODUCTS_MAX} productos seleccionados
                            </p>
                            {included.length >= COMBO_INCLUDED_PRODUCTS_MAX && (
                                <p
                                    role="status"
                                    className="mt-2 rounded-lg border border-[#F3C2BD] bg-[#FFF5F4] px-3 py-2 text-xs font-semibold text-[#B42318]"
                                >
                                    Llegaste al límite de {COMBO_INCLUDED_PRODUCTS_MAX} productos
                                    obligatorios. No puedes agregar más a este combo.
                                </p>
                            )}
                        </section>
                    )}
                    {step === 2 && (
                        <section>
                            <h3 className="text-sm font-semibold text-[#243556]">
                                Opciones para el cliente
                            </h3>
                            <p className="mt-1 text-sm text-[#65738A]">
                                Opcional. Si agregas un grupo, necesita un nombre y al menos dos
                                productos; el cliente elegirá uno. Puedes agregar hasta{' '}
                                {COMBO_OPTION_GROUPS_MAX} grupos.
                            </p>
                            <div className="mt-4 space-y-2">
                                {groups.map((group, index) => (
                                    <article
                                        key={`${group.name}-${index}`}
                                        className="rounded-lg border border-[#DCE5F3] p-3"
                                    >
                                        <div className="flex justify-between">
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {group.name}
                                                </p>
                                                <p className="text-xs text-[#65738A]">
                                                    El cliente elige una opción.
                                                </p>
                                                <p className="mt-1 text-xs text-[#65738A]">
                                                    {group.productIds
                                                        .map(
                                                            (id) =>
                                                                products.find(
                                                                    (item) => item.id === id,
                                                                )?.name,
                                                        )
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label={`Quitar grupo ${group.name}`}
                                                onClick={() =>
                                                    setGroups(groups.filter((_, i) => i !== index))
                                                }
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <div className="mt-4 rounded-lg border border-dashed border-[#D7E1EF] p-3">
                                <h4 className="text-sm font-semibold text-[#243556]">
                                    Nuevo grupo de opciones
                                </h4>
                                <label
                                    htmlFor="combo-option-group-name"
                                    className="mt-4 block text-sm font-medium text-[#243556]"
                                >
                                    Nombre del grupo (obligatorio al agregar)
                                </label>
                                <input
                                    id="combo-option-group-name"
                                    aria-label="Nombre del grupo"
                                    aria-required={newGroup.productIds.length > 0}
                                    value={newGroup.name}
                                    maxLength={COMBO_OPTION_GROUP_NAME_MAX_LENGTH}
                                    onChange={(event) =>
                                        setNewGroup({ ...newGroup, name: event.target.value })
                                    }
                                    className={`${fieldClass} mt-2`}
                                    placeholder="Nombre del grupo, por ejemplo: Acompañamiento"
                                />
                                <p className="mt-1 text-right text-[11px] text-[#8996A9]">
                                    {newGroup.name.length}/{COMBO_OPTION_GROUP_NAME_MAX_LENGTH}
                                </p>
                                <p className="mt-2 text-xs text-[#65738A]">
                                    El cliente elegirá una opción de este grupo.
                                </p>
                                <div className="mt-3">
                                    <ProductPicker
                                        label="opciones del grupo"
                                        products={products}
                                        categories={allCategories}
                                        isLoading={productsQuery.isLoading}
                                        isError={productsQuery.isError}
                                        selectedIds={newGroup.productIds}
                                        unavailableIds={draftUsedIds.filter(
                                            (id) => !newGroup.productIds.includes(id),
                                        )}
                                        onToggle={(id) => {
                                            if (
                                                !newGroup.productIds.includes(id) &&
                                                newGroup.productIds.length >=
                                                    COMBO_GROUP_CHOICES_MAX
                                            ) {
                                                setCreateError({
                                                    title: 'Llegaste al máximo de opciones',
                                                    description: `Cada grupo puede tener hasta ${COMBO_GROUP_CHOICES_MAX} productos.`,
                                                })
                                                return
                                            }
                                            setCreateError(null)
                                            toggle(newGroup.productIds, id, (productIds) =>
                                                setNewGroup({ ...newGroup, productIds }),
                                            )
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addDraftGroup}
                                    disabled={
                                        !newGroup.name.trim() ||
                                        newGroup.productIds.length < 2 ||
                                        groups.length >= COMBO_OPTION_GROUPS_MAX
                                    }
                                    className={`${quietButton} mt-3`}
                                >
                                    <Plus className="size-4" />
                                    Agregar grupo al combo
                                </button>
                                <p className="mt-2 text-xs text-[#8996A9]">
                                    Selecciona al menos dos productos para ofrecer alternativas; el
                                    cliente elige uno.
                                </p>
                                {(newGroup.name.trim() || newGroup.productIds.length > 0) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewGroup({ name: '', productIds: [] })
                                            setCreateError(null)
                                        }}
                                        className="mt-2 text-xs font-semibold text-[#53617A] underline underline-offset-2 hover:text-[#2451C5]"
                                    >
                                        Descartar grupo incompleto
                                    </button>
                                )}
                                <p className="mt-1 text-[11px] text-[#8996A9]">
                                    {groups.length}/{COMBO_OPTION_GROUPS_MAX} grupos agregados ·
                                    hasta {COMBO_GROUP_CHOICES_MAX} productos por grupo
                                </p>
                                {groups.length >= COMBO_OPTION_GROUPS_MAX && (
                                    <p
                                        role="alert"
                                        className="mt-2 rounded-lg border border-[#F3C2BD] bg-[#FFF5F4] px-3 py-2 text-xs font-semibold text-[#B42318]"
                                    >
                                        Llegaste al límite de {COMBO_OPTION_GROUPS_MAX} grupos. No
                                        puedes agregar más grupos a este combo.
                                    </p>
                                )}
                            </div>
                        </section>
                    )}
                    {step === 3 && (
                        <section>
                            <h3 className="text-base font-bold text-[#12234A]">Revisa tu combo</h3>
                            <div className="mt-3 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-4">
                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="max-w-full break-words text-sm font-bold text-[#243556] [overflow-wrap:anywhere]">
                                            {name}
                                        </p>
                                        <p className="mt-1 max-w-full break-words text-xs text-[#65738A] [overflow-wrap:anywhere]">
                                            {description || 'Sin descripción'} ·{' '}
                                            {
                                                allCategories.find(
                                                    (item) => item.id === selectedCategoryId,
                                                )?.name
                                            }
                                        </p>
                                    </div>
                                    <p className="max-w-full shrink-0 break-words text-sm font-bold text-[#1E40AF] sm:text-right [overflow-wrap:anywhere]">
                                        ${Number(price || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="mt-4 border-t border-[#E8EEF6] pt-3">
                                    <p className="text-xs font-bold text-[#245B3B]">
                                        Productos incluidos — se reciben todos
                                    </p>
                                    {included.length ? (
                                        included.map((id) => (
                                            <p key={id} className="mt-1 text-sm text-[#53617A]">
                                                {includedQuantities[id] ?? 1}× {products.find((item) => item.id === id)?.name}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="mt-1 text-xs text-[#8996A9]">
                                            Sin productos fijos.
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 border-t border-[#E8EEF6] pt-3">
                                    <p className="text-xs font-bold text-[#786D5F]">
                                        Opciones — elige un producto de cada grupo
                                    </p>
                                    {groups.length ? (
                                        groups.map((group, index) => (
                                            <div key={`${group.name}-${index}`} className="mt-2">
                                                <p className="text-sm font-semibold text-[#493D2C]">
                                                    {group.name}{' '}
                                                    <span className="font-normal text-[#786D5F]">
                                                        ( El cliente elige una opción. )
                                                    </span>
                                                </p>
                                                <p className="text-xs text-[#786D5F]">
                                                    {group.productIds
                                                        .map(
                                                            (id) =>
                                                                products.find(
                                                                    (item) => item.id === id,
                                                                )?.name,
                                                        )
                                                        .join(' · ')}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="mt-1 text-xs text-[#8996A9]">
                                            Sin grupos de opciones.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <p className="mt-3 text-xs leading-5 text-[#65738A]">
                                El combo se guardará y aparecerá en tu menú como un producto
                                vendible. Podrás editar sus grupos después.
                            </p>
                            {!included.length && (
                                <p
                                    role="alert"
                                    className="mt-2 text-xs font-semibold text-[#9B2C24]"
                                >
                                    Agrega al menos un producto incluido antes de crear.
                                </p>
                            )}
                        </section>
                    )}
                    {!editing && createError && (
                        <div
                            data-testid="combo-create-error"
                            role="alert"
                            aria-live="assertive"
                            className="mt-4 rounded-xl border border-[#E7B7B2] bg-[#FFF8F7] p-3.5 text-[#742A25]"
                        >
                            <p className="text-sm font-semibold">{createError.title}</p>
                            <p className="mt-1 text-sm leading-5">{createError.description}</p>
                            {createError.retryable && (
                                <button
                                    type="button"
                                    onClick={create}
                                    disabled={busy}
                                    className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#D8A6A1] bg-white px-3 text-sm font-semibold text-[#742A25] hover:bg-[#FFF0EE] disabled:cursor-wait disabled:opacity-60"
                                >
                                    Intentar de nuevo
                                </button>
                            )}
                        </div>
                    )}
                    <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-[#E8EEF6] pt-4 sm:flex-row sm:justify-between">
                        <button
                            type="button"
                            className={quietButton}
                            onClick={
                                step
                                    ? () => {
                                          setCreateError(null)
                                          setStep(step - 1)
                                      }
                                    : close
                            }
                            disabled={busy}
                        >
                            {step ? (
                                <>
                                    <ChevronLeft className="size-4" />
                                    Anterior
                                </>
                            ) : (
                                'Cancelar'
                            )}
                        </button>
                        {step < 3 ? (
                            <button
                                type="button"
                                className={primaryButton}
                                onClick={() => {
                                    const invalidImage =
                                        imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim())
                                    if (
                                        step === 0 &&
                                        (!name.trim() ||
                                            !isValidComboPrice(price) ||
                                            !selectedCategoryId ||
                                            invalidImage)
                                    ) {
                                        setCreateError({
                                            title: 'Revisa los datos del combo',
                                            description:
                                                'Escribe un nombre, un precio válido mayor que cero con máximo dos decimales y selecciona una categoría. La imagen debe usar una URL http o https.',
                                        })
                                        return
                                    }
                                    if (
                                        step === 2 &&
                                        (newGroup.name.trim() || newGroup.productIds.length > 0)
                                    ) {
                                        setCreateError({
                                            title: 'Completa el grupo de opciones',
                                            description:
                                                'Escribe un nombre y selecciona al menos dos productos. Si no quieres agregar el grupo, descarta el borrador.',
                                        })
                                        return
                                    }
                                    setCreateError(null)
                                    setStep(step + 1)
                                }}
                                disabled={
                                    (step === 0 &&
                                        (!name.trim() ||
                                            !isValidComboPrice(price) ||
                                            !selectedCategoryId)) ||
                                    (step === 1 && included.length === 0)
                                }
                            >
                                <span>Continuar</span>
                                <ChevronRight className="size-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={primaryButton}
                                onClick={create}
                                disabled={
                                    busy ||
                                    !name.trim() ||
                                    !selectedCategoryId ||
                                    !isValidComboPrice(price) ||
                                    !included.length
                                }
                            >
                                {actions.create.isPending ? (
                                    <>
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Creando combo…
                                    </>
                                ) : (
                                    <>
                                        <Check className="size-4" />
                                        Crear combo
                                    </>
                                )}
                            </button>
                        )}
                    </footer>
                </div>
            )}
        </Modal>
    )
}
