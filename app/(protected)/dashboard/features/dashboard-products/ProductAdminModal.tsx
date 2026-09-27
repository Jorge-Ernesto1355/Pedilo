'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/ui/Modal'
import {
    productSchema,
    type ProductFormValues,
} from '@/app/(protected)/create-menu/features/product-management/product.schema'
import type {
    Product,
    ProductInput,
} from '@/app/(protected)/create-menu/features/product-management/product.types'
import { OptionGroupsEditor } from '@/app/(protected)/create-menu/features/option-management/OptionGroupsEditor'

export type ProductCategoryOption = { id: string; name: string; label: string }

type ProductAdminModalProps = {
    open: boolean
    product: Product | null
    categories: ProductCategoryOption[]
    isSaving: boolean
    errorMessage?: string
    fieldErrors?: Record<string, string>
    onClose: () => void
    onSave: (input: ProductInput) => void
}

type AdminValues = ProductFormValues & { categoryId: string; active: boolean }

export function ProductAdminModal({
    open,
    product,
    categories,
    isSaving,
    errorMessage,
    fieldErrors,
    onClose,
    onSave,
}: ProductAdminModalProps) {
    const [values, setValues] = useState<AdminValues>({
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product ? String(product.price) : '',
        image: null,
        categoryId: product?.categoryId ?? categories[0]?.id ?? '',
        active: product?.active ?? product?.isAvailable ?? true,
    })
    const [errors, setErrors] = useState<Record<string, string>>({})

    function update<K extends keyof AdminValues>(key: K, value: AdminValues[K]) {
        setValues((current) => ({ ...current, [key]: value }))
        setErrors((current) => ({ ...current, [key]: '' }))
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const parsed = productSchema.safeParse({
            name: values.name,
            description: values.description,
            price: values.price,
            image: values.image,
        })
        const nextErrors: Record<string, string> = parsed.success
            ? {}
            : Object.fromEntries(
                  parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
              )
        if (!values.categoryId) nextErrors.categoryId = 'Selecciona una categoría.'
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return
        onSave(values)
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={product ? 'Editar producto' : 'Nuevo producto'}
            description="Mantén actualizado lo que tus clientes pueden pedir."
            size="lg"
        >
            <form className="space-y-4" onSubmit={submit} noValidate>
                {errorMessage && (
                    <div
                        role="alert"
                        className="rounded-xl border border-[#F4C7C3] bg-[#FFF4F2] px-3 py-2.5 text-sm text-[#B42318]"
                    >
                        {errorMessage}
                    </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Nombre del producto"
                        required
                        error={errors.name ?? fieldErrors?.name}
                    >
                        <input
                            value={values.name}
                            onChange={(event) => update('name', event.target.value)}
                            placeholder="Ej. Pizza pepperoni"
                            className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                            autoFocus
                        />
                    </Field>
                    <Field
                        label="Categoría"
                        required
                        error={errors.categoryId ?? fieldErrors?.categoryId}
                    >
                        <select
                            value={values.categoryId}
                            onChange={(event) => update('categoryId', event.target.value)}
                            className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        >
                            <option value="">Selecciona una categoría</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <Field
                    label="Descripción"
                    hint="Una descripción breve ayuda a vender mejor."
                    error={errors.description ?? fieldErrors?.description}
                >
                    <textarea
                        value={values.description}
                        onChange={(event) => update('description', event.target.value)}
                        placeholder="Ingredientes, tamaño o detalles importantes"
                        rows={3}
                        className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10 resize-none"
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Precio"
                        required
                        hint="Usa máximo dos decimales."
                        error={errors.price ?? fieldErrors?.price}
                    >
                        <input
                            value={values.price}
                            onChange={(event) =>
                                update('price', event.target.value.replace(/[^\d.]/g, ''))
                            }
                            inputMode="decimal"
                            placeholder="0.00"
                            className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        />
                    </Field>
                    <Field label="Imagen" hint="Opcional · máximo 5 MB">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => update('image', event.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-[#65738A] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEF3FF] file:px-3 file:py-2 file:font-semibold file:text-[#2451C5]"
                        />
                    </Field>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#DCE5F3] px-3 py-3 text-sm text-[#243556]">
                    <input
                        type="checkbox"
                        checked={values.active}
                        onChange={(event) => update('active', event.target.checked)}
                        className="size-4 accent-[#2451C5]"
                    />
                    <span>
                        <strong className="block">Producto activo</strong>
                        <span className="text-xs text-[#65738A]">
                            Estará disponible para tus clientes cuando esté activo.
                        </span>
                    </span>
                </label>
                <div className="flex flex-col-reverse gap-2 border-t border-[#E8EEF6] pt-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] hover:bg-[#F4F7FB]"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={isSaving}
                        className="rounded-xl bg-[#2451C5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
                    </button>
                </div>
            </form>
            {product && (
                <OptionGroupsEditor productId={product.id} initialGroups={product.optionGroups} />
            )}
        </Modal>
    )
}

function Field({
    label,
    hint,
    required,
    error,
    children,
}: {
    label: string
    hint?: string
    required?: boolean
    error?: string
    children: React.ReactNode
}) {
    return (
        <label className="block space-y-1.5">
            <span className="block text-sm font-semibold text-[#243556]">
                {label}
                {required && <span className="ml-1 text-[#B42318]">*</span>}
            </span>
            {children}
            {hint && !error && <span className="block text-xs text-[#8996A9]">{hint}</span>}
            {error && <span className="block text-xs font-medium text-[#B42318]">{error}</span>}
        </label>
    )
}
