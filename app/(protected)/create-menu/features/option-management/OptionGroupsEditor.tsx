'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/app/components/ui/Modal'
import { sileo } from 'sileo'
import { useOptionGroups, useOptionManagement, useOptions } from './useOptionManagement'
import type { OptionGroup, ProductOption } from './option.types'

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-2.5 text-sm text-[#12234A] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'
function numberKeyDown(event: React.KeyboardEvent<HTMLInputElement>, decimal = false) {
    if (
        ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
            event.key,
        ) ||
        event.ctrlKey ||
        event.metaKey
    )
        return
    if (decimal && event.key === '.') return
    if (!/^\d$/.test(event.key)) event.preventDefault()
}
function numberPaste(event: React.ClipboardEvent<HTMLInputElement>, decimal = false) {
    const value = event.clipboardData.getData('text').trim()
    if (!new RegExp(decimal ? '^\\d+(\\.\\d{0,2})?$' : '^\\d+$').test(value)) event.preventDefault()
}
function sanitizeNumericInput(event: React.FormEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (target.inputMode === 'numeric') target.value = target.value.replace(/\D/g, '')
    if (target.inputMode === 'decimal')
        target.value = target.value
            .replace(/[^\d.]/g, '')
            .replace(/(\..*)\./g, '$1')
            .replace(/(\.\d{2}).*/g, '$1')
}
const groupSchema = z
    .object({
        name: z.string().trim().min(1, 'Escribe el nombre del grupo.'),
        isRequired: z.boolean(),
        minSelections: z.string().regex(/^\d+$/, 'Usa un número entero.'),
        maxSelections: z.string().regex(/^\d+$/, 'Usa un número entero.'),
        optionName: z.string().trim(),
        optionPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Usa un precio válido.'),
    })
    .superRefine((value, ctx) => {
        const min = Number(value.minSelections)
        const max = Number(value.maxSelections)
        if (max < min)
            ctx.addIssue({
                code: 'custom',
                path: ['maxSelections'],
                message: 'No puede ser menor que el mínimo.',
            })
        if (value.isRequired && min < 1)
            ctx.addIssue({
                code: 'custom',
                path: ['minSelections'],
                message: 'Un grupo obligatorio necesita al menos una selección.',
            })
    })
const optionSchema = z.object({
    name: z.string().trim().min(1, 'Escribe el nombre de la opción.'),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Usa un precio válido.'),
})
type GroupValues = z.infer<typeof groupSchema>
type OptionValues = z.infer<typeof optionSchema>

function mutationError(error: unknown) {
    const value = error as { code?: string; message?: string }
    sileo.error({ title: value.message ?? value.code ?? 'No se pudo completar la operación' })
}

export function OptionModal({
    open,
    option,
    onClose,
    onDone,
}: {
    open: boolean
    option?: ProductOption | null
    onClose: () => void
    onDone: (values: OptionValues) => void
}) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<OptionValues>({
        resolver: zodResolver(optionSchema),
        defaultValues: { name: '', price: '0' },
    })
    useEffect(() => {
        if (open) reset({ name: option?.name ?? '', price: option ? String(option.price) : '0' })
    }, [open, option, reset])
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={option ? 'Editar opción' : 'Agregar opción'}
            description="El precio se suma al precio base del producto."
        >
            <div onInputCapture={sanitizeNumericInput}>
                <form onSubmit={handleSubmit(onDone)} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#243556]">
                            Nombre <span className="text-[#B42318]">*</span>
                        </label>
                        <input
                            className={inputClass}
                            {...register('name')}
                            placeholder="Ej. Queso extra"
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-[#B42318]">{errors.name.message}</p>
                        )}
                        <p className="mt-1.5 text-xs text-[#8996A9]">
                            Ejemplos: “Tocino”, “Aguacate” o “Término medio”.
                        </p>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#243556]">
                            Precio adicional
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#65738A]">
                                +$
                            </span>
                            <input
                                className={`${inputClass} pl-10`}
                                inputMode="decimal"
                                onKeyDown={(event) => numberKeyDown(event, true)}
                                onPaste={(event) => numberPaste(event, true)}
                                {...register('price')}
                                placeholder="0.00"
                            />
                        </div>
                        {errors.price && (
                            <p className="mt-1 text-xs text-[#B42318]">{errors.price.message}</p>
                        )}
                        <p className="mt-1.5 text-xs text-[#8996A9]">
                            Es lo que se sumará al precio del producto. Usa 0 si no tiene costo.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#E8EEF6] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[#D7E1EF] px-4 py-2 text-sm font-semibold text-[#65738A]"
                        >
                            Cancelar
                        </button>
                        <button className="inline-flex items-center rounded-xl bg-[#1E40AF] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_-10px_rgba(30,64,175,.75)]">
                            {option ? 'Guardar opción' : 'Agregar opción'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    )
}

export function GroupModal({
    open,
    productId,
    group,
    onClose,
    onDone,
}: {
    open: boolean
    productId: string
    group?: OptionGroup | null
    onClose: () => void
    onDone: (group: OptionGroup, productId: string, isEdit: boolean) => void
}) {
    const existingOptionsQuery = useOptions(group?.id ?? null)
    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<GroupValues>({
        resolver: zodResolver(groupSchema),
        defaultValues: {
            name: '',
            isRequired: false,
            minSelections: '0',
            maxSelections: '5',
            optionName: '',
            optionPrice: '0',
        },
    })
    const [draftOptions, setDraftOptions] = useState<
        Array<{ name: string; price: number; isAvailable: boolean }>
    >([])
    // The modal is kept mounted by the shared Modal component so reset is required on each open.
    useEffect(() => {
        if (open) {
            reset({
                name: group?.name ?? '',
                isRequired: group?.isRequired ?? false,
                minSelections: String(group?.minSelections ?? 0),
                maxSelections: String(group?.maxSelections ?? 5),
                optionName: '',
                optionPrice: '0',
            })
            // The modal is reused for different groups and needs a clean local draft.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDraftOptions(
                group?.options?.map(({ name, price, isAvailable }) => ({
                    name,
                    price: Number(price),
                    isAvailable,
                })) ?? [],
            )
        }
    }, [open, group, reset])
    useEffect(() => {
        if (!open || !group || !existingOptionsQuery.data?.length) return
        // The group response may not include options; hydrate the editor from its options query.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftOptions(
            existingOptionsQuery.data.map(({ name, price, isAvailable }) => ({
                name,
                price: Number(price),
                isAvailable,
            })),
        )
    }, [existingOptionsQuery.data, group, open])
    const addDraft = () => {
        const name = document.getElementById('draft-option-name') as HTMLInputElement | null
        const price = document.getElementById('draft-option-price') as HTMLInputElement | null
        const trimmed = name?.value.trim() ?? ''
        if (!trimmed) {
            setError('optionName', { message: 'Escribe el nombre de la opción.' })
            return
        }
        if (!/^\d+(\.\d{1,2})?$/.test(price?.value ?? '')) {
            setError('optionPrice', { message: 'Usa un precio válido.' })
            return
        }
        if (draftOptions.some((option) => option.name.toLowerCase() === trimmed.toLowerCase())) {
            setError('optionName', { message: 'Esta opción ya fue agregada.' })
            return
        }
        setDraftOptions((current) => [
            ...current,
            { name: trimmed, price: Number(price?.value), isAvailable: true },
        ])
        if (name) name.value = ''
    }
    const submit = (values: GroupValues) =>
        onDone(
            {
                id: group?.id ?? '',
                productId,
                name: values.name.trim(),
                isRequired: values.isRequired,
                minSelections: Number(values.minSelections),
                maxSelections: Number(values.maxSelections),
                isActive: group?.isActive ?? true,
                sortOrder: group?.sortOrder ?? 0,
                options: draftOptions.map((option, index) => ({
                    ...option,
                    id: `draft-${index}`,
                    optionGroupId: '',
                    sortOrder: index,
                })),
            },
            productId,
            Boolean(group),
        )
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={group ? 'Editar grupo de opciones' : 'Crear grupo de opciones'}
            description="Define los extras o variantes que puede elegir el cliente."
            size="lg"
        >
            <div onInputCapture={sanitizeNumericInput}>
                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-[#243556]">
                            Nombre
                        </label>
                        <input
                            className={inputClass}
                            {...register('name')}
                            placeholder="Ej. Extras"
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-[#B42318]">{errors.name.message}</p>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[#243556]">
                        <input type="checkbox" {...register('isRequired')} /> Selección obligatoria
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#243556]">
                                Mínimo
                            </label>
                            <input
                                className={inputClass}
                                inputMode="numeric"
                                {...register('minSelections')}
                            />
                            {errors.minSelections && (
                                <p className="mt-1 text-xs text-[#B42318]">
                                    {errors.minSelections.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-[#243556]">
                                Máximo
                            </label>
                            <input
                                className={inputClass}
                                inputMode="numeric"
                                {...register('maxSelections')}
                            />
                            {errors.maxSelections && (
                                <p className="mt-1 text-xs text-[#B42318]">
                                    {errors.maxSelections.message}
                                </p>
                            )}
                        </div>
                    </div>
                    {group && (
                        <div className="rounded-xl border border-[#E8EEF6] bg-[#F8FAFE] p-3">
                            <p className="mb-2 text-sm font-semibold text-[#243556]">
                                Opciones actuales
                            </p>
                            {existingOptionsQuery.isLoading ? (
                                <p className="text-xs text-[#65738A]">Cargando opciones…</p>
                            ) : draftOptions.length === 0 ? (
                                <p className="text-xs text-[#8996A9]">
                                    Este grupo todavía no tiene opciones. Puedes agregarlas desde el
                                    botón “Agregar opción” después de guardar.
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    {draftOptions.map((option) => (
                                        <div
                                            key={option.name}
                                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-[#243556]"
                                        >
                                            <span>
                                                {option.name}{' '}
                                                <span className="text-[#65738A]">
                                                    +${option.price.toFixed(2)}
                                                </span>
                                            </span>
                                            <span className="text-xs text-[#65738A]">
                                                Adminístrala en la tarjeta del grupo
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {!group && (
                        <div className="rounded-xl border border-[#E8EEF6] bg-[#F8FAFE] p-3">
                            <p className="mb-3 text-sm font-semibold text-[#243556]">
                                Opciones (opcional)
                            </p>
                            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                                <input
                                    id="draft-option-name"
                                    className={inputClass}
                                    placeholder="Ej. Queso"
                                    {...register('optionName')}
                                />
                                <input
                                    id="draft-option-price"
                                    className={inputClass}
                                    inputMode="decimal"
                                    placeholder="Precio"
                                    defaultValue="0"
                                    {...register('optionPrice')}
                                />
                                <button
                                    type="button"
                                    onClick={addDraft}
                                    className="grid size-11 place-items-center rounded-xl bg-[#E5EDFF] text-[#1E40AF]"
                                    aria-label="Agregar opción"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                            {errors.optionName && (
                                <p className="mt-1 text-xs text-[#B42318]">
                                    {errors.optionName.message}
                                </p>
                            )}
                            {errors.optionPrice && (
                                <p className="mt-1 text-xs text-[#B42318]">
                                    {errors.optionPrice.message}
                                </p>
                            )}
                            <div className="mt-3 space-y-2">
                                {draftOptions.map((option) => (
                                    <div
                                        key={option.name}
                                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                        <span>
                                            {option.name}{' '}
                                            <span className="text-[#65738A]">
                                                +${option.price.toFixed(2)}
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDraftOptions((current) =>
                                                    current.filter(
                                                        (item) => item.name !== option.name,
                                                    ),
                                                )
                                            }
                                            aria-label={`Quitar ${option.name}`}
                                        >
                                            <X className="size-4 text-[#65738A]" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 border-t border-[#E8EEF6] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-[#65738A]"
                        >
                            Cancelar
                        </button>
                        <button className="rounded-xl bg-[#1E40AF] px-4 py-2 text-sm font-bold text-white">
                            {group ? 'Guardar cambios' : 'Crear grupo'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    )
}

export function OptionGroupCard({
    group,
    productId,
    onEditGroup,
}: {
    group: OptionGroup
    productId: string
    onEditGroup: (group: OptionGroup) => void
}) {
    const optionsQuery = useOptions(group.id)
    const mutations = useOptionManagement()
    const [option, setOption] = useState<ProductOption | null | undefined>(undefined)
    const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null)
    const options = optionsQuery.data?.length ? optionsQuery.data : (group.options ?? [])
    const reorderOption = (targetId: string) => {
        if (!draggedOptionId || draggedOptionId === targetId) return
        const next = [...options]
        const from = next.findIndex((item) => item.id === draggedOptionId)
        const to = next.findIndex((item) => item.id === targetId)
        if (from < 0 || to < 0) return
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        setDraggedOptionId(null)
        mutations.reorderOpts.mutate(
            { optionGroupId: group.id, productId, optionIds: next.map((item) => item.id) },
            { onError: mutationError },
        )
    }
    const saveOption = (values: OptionValues) => {
        const input = { name: values.name.trim(), price: Number(values.price) }
        if (option)
            mutations.updateOpt.mutate(
                { optionId: option.id, optionGroupId: group.id, productId, input },
                { onSuccess: () => setOption(undefined), onError: mutationError },
            )
        else
            mutations.createOpt.mutate(
                { optionGroupId: group.id, productId, input: { ...input, isAvailable: true } },
                { onSuccess: () => setOption(undefined), onError: mutationError },
            )
    }
    return (
        <div className="rounded-xl border border-[#E8EEF6] bg-white p-3">
            <div className="flex items-start gap-2">
                <GripVertical className="mt-1 size-4 text-[#A0ACBD]" />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-[#243556]">{group.name}</h5>
                        {group.isRequired && (
                            <span className="text-xs text-[#65738A]">Obligatorio</span>
                        )}
                        {!group.isActive && (
                            <span className="text-xs text-[#B42318]">Inactivo</span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-[#65738A]">
                        Selecciona {group.minSelections}–{group.maxSelections}
                    </p>
                </div>
                <button type="button" onClick={() => onEditGroup(group)} aria-label="Editar grupo">
                    <Pencil className="size-4 text-[#65738A]" />
                </button>
                <button
                    type="button"
                    onClick={() =>
                        mutations.statusGroup.mutate(
                            { optionGroupId: group.id, productId, isActive: !group.isActive },
                            { onError: mutationError },
                        )
                    }
                    aria-label="Cambiar estado"
                    className="text-xs text-[#1E40AF]"
                >
                    {group.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (window.confirm('¿Eliminar este grupo de opciones?'))
                            mutations.removeGroup.mutate(
                                { optionGroupId: group.id, productId },
                                { onError: mutationError },
                            )
                    }}
                    aria-label="Eliminar grupo"
                >
                    <Trash2 className="size-4 text-[#B42318]" />
                </button>
            </div>
            <div className="mt-3 border-t border-[#F0F3F8] pt-3">
                {optionsQuery.isLoading && options.length === 0 ? (
                    <p className="text-xs text-[#65738A]">Cargando opciones…</p>
                ) : optionsQuery.isError && options.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => void optionsQuery.refetch()}
                        className="text-xs text-[#B42318]"
                    >
                        No se pudieron cargar. Reintentar
                    </button>
                ) : options.length === 0 ? (
                    <p className="text-xs text-[#8996A9]">Este grupo aún no tiene opciones.</p>
                ) : (
                    <div className="space-y-1.5">
                        {options.map((item) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={() => setDraggedOptionId(item.id)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => reorderOption(item.id)}
                                className="flex items-center gap-2 text-sm"
                            >
                                <GripVertical className="size-3.5 text-[#B8C3D2]" />
                                <span
                                    className={`min-w-0 flex-1 ${!item.isAvailable ? 'text-[#9AA5B5] line-through' : 'text-[#243556]'}`}
                                >
                                    {item.name}{' '}
                                    <span className="text-[#65738A]">
                                        +${Number(item.price).toFixed(2)}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        mutations.statusOpt.mutate(
                                            {
                                                optionId: item.id,
                                                optionGroupId: group.id,
                                                productId,
                                                isAvailable: !item.isAvailable,
                                            },
                                            { onError: mutationError },
                                        )
                                    }
                                    className="text-xs text-[#1E40AF]"
                                >
                                    {item.isAvailable ? 'Ocultar' : 'Mostrar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOption(item)}
                                    aria-label="Editar opción"
                                >
                                    <Pencil className="size-3.5 text-[#65738A]" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('¿Eliminar esta opción?'))
                                            mutations.removeOpt.mutate(
                                                {
                                                    optionId: item.id,
                                                    optionGroupId: group.id,
                                                    productId,
                                                },
                                                { onError: mutationError },
                                            )
                                    }}
                                    aria-label="Eliminar opción"
                                >
                                    <Trash2 className="size-3.5 text-[#B42318]" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setOption(null)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#1E40AF]"
                >
                    <Plus className="size-3.5" />
                    Agregar opción
                </button>
            </div>
            <OptionModal
                open={option !== undefined}
                option={option}
                onClose={() => setOption(undefined)}
                onDone={saveOption}
            />
        </div>
    )
}

export function OptionGroupsEditor({
    productId,
    initialGroups,
}: {
    productId: string
    initialGroups?: OptionGroup[]
}) {
    const query = useOptionGroups(productId)
    const mutations = useOptionManagement()
    const [groupModal, setGroupModal] = useState<OptionGroup | null | undefined>(undefined)
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const groups = query.data?.length ? query.data : (initialGroups ?? [])
    const saveGroup = (group: OptionGroup, id: string, isEdit: boolean) => {
        if (isEdit)
            mutations.updateGroup.mutate(
                {
                    optionGroupId: group.id,
                    productId: id,
                    input: {
                        name: group.name,
                        isRequired: group.isRequired,
                        minSelections: group.minSelections,
                        maxSelections: group.maxSelections,
                    },
                },
                { onSuccess: () => setGroupModal(undefined), onError: mutationError },
            )
        else
            mutations.createGroup.mutate(
                {
                    productId: id,
                    input: {
                        name: group.name,
                        isRequired: group.isRequired,
                        minSelections: group.minSelections,
                        maxSelections: group.maxSelections,
                        isActive: true,
                        options:
                            group.options?.map(({ name, price, isAvailable }) => ({
                                name,
                                price: Number(price),
                                isAvailable,
                            })) ?? [],
                    },
                },
                { onSuccess: () => setGroupModal(undefined), onError: mutationError },
            )
    }
    const reorder = (targetId: string) => {
        if (!draggedId || draggedId === targetId) return
        const next = [...groups]
        const from = next.findIndex((item) => item.id === draggedId)
        const to = next.findIndex((item) => item.id === targetId)
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        mutations.reorderGroups.mutate({ productId, optionGroupIds: next.map((item) => item.id) })
        setDraggedId(null)
    }
    return (
        <section className="mt-5 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="font-display text-base text-[#12234A]">Opciones y extras</h4>
                    <p className="mt-1 text-xs text-[#65738A]">
                        Personaliza las elecciones disponibles para este producto.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setGroupModal(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5EDFF] px-3 py-2 text-xs font-bold text-[#1E40AF]"
                >
                    <Plus className="size-3.5" />
                    Crear grupo
                </button>
            </div>
            {query.isLoading && groups.length === 0 ? (
                <p className="mt-4 text-sm text-[#65738A]">Cargando grupos…</p>
            ) : query.isError && groups.length === 0 ? (
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="mt-4 text-sm text-[#B42318]"
                >
                    No se pudieron cargar los grupos. Reintentar
                </button>
            ) : groups.length === 0 ? (
                <p className="mt-4 text-sm text-[#8996A9]">Este producto aún no tiene opciones.</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            draggable
                            onDragStart={() => setDraggedId(group.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => reorder(group.id)}
                        >
                            <OptionGroupCard
                                group={group}
                                productId={productId}
                                onEditGroup={(value) => setGroupModal(value)}
                            />
                        </div>
                    ))}
                </div>
            )}
            <GroupModal
                open={groupModal !== undefined}
                productId={productId}
                group={groupModal}
                onClose={() => setGroupModal(undefined)}
                onDone={saveGroup}
            />
        </section>
    )
}
