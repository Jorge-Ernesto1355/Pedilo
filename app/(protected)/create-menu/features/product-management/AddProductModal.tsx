/* eslint-disable @next/next/no-img-element -- The selected image is previewed from a local object URL. */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormSetError } from 'react-hook-form'
import { Modal } from '@/app/components/ui/Modal'
import { productSchema, type ProductFormValues } from './product.schema'
import type { Product } from './product.types'
import { OptionGroupsEditor } from '../option-management/OptionGroupsEditor'
import { useProduct } from './useProductManagement'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { notify } from '@/src/lib/notifications/notify'
import { ImagePlus } from 'lucide-react'
import Link from 'next/link'

type AddProductModalProps = {
    open: boolean
    categoryName: string
    product?: Product | null
    isSaving?: boolean
    onClose: () => void
    onSave: (values: ProductFormValues, setError: UseFormSetError<ProductFormValues>) => void
}

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'
function sanitizeNumericInput(event: React.FormEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || target.inputMode !== 'decimal') return
    target.value = target.value
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1')
        .replace(/(\.\d{2}).*/g, '$1')
}

export function AddProductModal({
    open,
    categoryName,
    product,
    isSaving = false,
    onClose,
    onSave,
}: AddProductModalProps) {
    const productDetail = useProduct(product?.id ?? null)
    const currentProduct = productDetail.data ?? product
    const [selectedImage, setSelectedImage] = useState<{ source: string; url: string } | null>(null)
    const {
        register,
        handleSubmit,
        reset,
        setError,
        setValue,
        formState: { errors },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        mode: 'onChange',
        defaultValues: { name: '', description: '', price: '', image: null },
    })

    useEffect(() => {
        if (!open) return

        // A new product must never inherit the temporary preview from the
        // product that was just saved or edited.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedImage(null)
        reset({
            name: currentProduct?.name ?? '',
            description: currentProduct?.description ?? '',
            price: currentProduct ? String(currentProduct.price) : '',
            image: null,
        })
    }, [open, currentProduct, reset])

    useEffect(
        () => () => {
            if (selectedImage) URL.revokeObjectURL(selectedImage.url)
        },
        [selectedImage],
    )

    const imageSource = currentProduct?.id ?? 'new-product'
    const imagePreview =
        selectedImage?.source === imageSource
            ? selectedImage.url
            : (currentProduct?.imageUrl ?? null)

    function selectImage(file: File | undefined) {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('image', {
                type: 'validate',
                message: 'Selecciona un archivo de imagen válido.',
            })
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('image', { type: 'validate', message: 'La imagen no puede superar 5 MB.' })
            return
        }
        setValue('image', file, { shouldDirty: true, shouldValidate: true })
        setSelectedImage({ source: imageSource, url: URL.createObjectURL(file) })
    }

    const submit = (values: ProductFormValues) => onSave(values, setError)
    const showDetailError = () => {
        if (productDetail.isError)
            notify.error({
                title: 'No se pudo cargar el producto',
                description:
                    productDetail.error instanceof ApiError
                        ? 'Revisa tu conexión e inténtalo nuevamente.'
                        : 'Inténtalo nuevamente.',
            })
    }
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={product ? 'Editar producto' : 'Agregar producto'}
            description={`${product ? 'Actualiza' : 'Crea'} la información que tus clientes verán en el menú.`}
            size="lg"
        >
            <form
                onInputCapture={sanitizeNumericInput}
                onSubmit={handleSubmit(submit)}
                className="space-y-6"
            >
                <div className="rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] p-4">
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-[#2451C5]">
                        Información principal
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#65738A]">
                        El nombre, descripción y precio ayudan a tus clientes a decidir rápidamente
                        qué pedir.
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#65738A]">
                        Publica únicamente alimentos y bebidas permitidos por la{' '}
                        <Link
                            href="/productos-y-contenido"
                            className="font-semibold text-[#2451C5] underline underline-offset-2"
                        >
                            Política de Productos y Contenido
                        </Link>
                        . Para imágenes, revisa la{' '}
                        <Link
                            href="/propiedad-intelectual"
                            className="font-semibold text-[#2451C5] underline underline-offset-2"
                        >
                            Política de Propiedad Intelectual
                        </Link>
                        .
                    </p>
                </div>
                <div>
                    <label
                        htmlFor="product-name"
                        className="mb-2 block text-sm font-semibold text-[#243556]"
                    >
                        Nombre <span className="text-[#B42318]">*</span>
                    </label>
                    <input
                        id="product-name"
                        autoFocus
                        className={inputClass}
                        placeholder="Ej. Hamburguesa clásica"
                        {...register('name')}
                    />
                    {errors.name && (
                        <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                            {errors.name.message}
                        </p>
                    )}
                    <p className="mt-1.5 text-xs text-[#8996A9]">
                        Usa un nombre fácil de reconocer, como “Tacos al pastor”.
                    </p>
                </div>
                <div>
                    <label
                        htmlFor="product-description"
                        className="mb-2 block text-sm font-semibold text-[#243556]"
                    >
                        Descripción <span className="font-normal text-[#8996A9]">(opcional)</span>
                    </label>
                    <textarea
                        id="product-description"
                        rows={3}
                        className={`${inputClass} resize-none`}
                        placeholder="Carne, queso, lechuga y aderezo de la casa"
                        {...register('description')}
                    />
                    {errors.description && (
                        <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                            {errors.description.message}
                        </p>
                    )}
                    <p className="mt-1.5 text-xs text-[#8996A9]">
                        Describe ingredientes, tamaño o lo que hace especial a este producto.
                    </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="product-price"
                            className="mb-2 block text-sm font-semibold text-[#243556]"
                        >
                            Precio de venta <span className="text-[#B42318]">*</span>
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#65738A]">
                                $
                            </span>
                            <input
                                id="product-price"
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                className={`${inputClass} pl-8`}
                                {...register('price')}
                            />
                        </div>
                        {errors.price && (
                            <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                                {errors.price.message}
                            </p>
                        )}
                        <p className="mt-1.5 text-xs text-[#8996A9]">
                            Ejemplo: 89 o 89.50. Máximo 2 decimales.
                        </p>
                    </div>
                    <div>
                        <label
                            htmlFor="product-image"
                            className="mb-2 block text-sm font-semibold text-[#243556]"
                        >
                            Imagen del producto{' '}
                            <span className="font-normal text-[#8996A9]">(opcional)</span>
                        </label>
                        <label
                            htmlFor="product-image"
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] p-2.5 hover:border-[#2451C5]"
                        >
                            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EAF0FF] text-[#2451C5]">
                                {imagePreview ? (
                                    <img
                                        width={48}
                                        height={48}
                                        src={imagePreview}
                                        alt="Vista previa del producto"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <ImagePlus className="size-5" />
                                )}
                            </span>
                            <span className="text-left">
                                <span className="block text-sm font-semibold text-[#243556]">
                                    {imagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
                                </span>
                                <span className="block text-xs text-[#8996A9]">
                                    Una imagen · JPG, PNG o WebP · máximo 5 MB
                                </span>
                                <span className="mt-1 block text-[11px] leading-4 text-[#65738A]">
                                    Publica solo imágenes que tengas autorización para usar.
                                </span>
                            </span>
                            <input
                                key={imageSource}
                                id="product-image"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="sr-only"
                                onChange={(event) => selectImage(event.target.files?.[0])}
                            />
                        </label>
                        {errors.image && (
                            <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                                {errors.image.message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[#DCE5F3] bg-white px-4 py-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#E8EEFF] text-[#2451C5]">
                        ⌁
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#243556]">
                            Categoría: {categoryName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#8996A9]">
                            La categoría se asigna automáticamente desde donde abriste este
                            formulario.
                        </p>
                    </div>
                </div>
                {productDetail.isError && (
                    <button
                        type="button"
                        onClick={showDetailError}
                        className="w-full rounded-xl border border-[#F5C2C0] bg-[#FFF6F5] px-4 py-3 text-left text-sm text-[#B42318]"
                    >
                        No se pudo sincronizar el detalle del producto. Ver respuesta del servidor.
                    </button>
                )}
                <div className="flex flex-col-reverse gap-3 border-t border-[#E8EEF6] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-[#8996A9]">
                        {product
                            ? 'Los cambios se guardan en tu menú al confirmar.'
                            : 'Después de crear el producto podrás agregar opciones y extras.'}
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="rounded-xl border border-[#D7E1EF] px-4 py-2.5 text-sm font-semibold text-[#65738A] transition hover:bg-[#F2F5FA]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex min-w-40 items-center justify-center rounded-xl bg-[#1E40AF] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_-10px_rgba(30,64,175,.75)] transition hover:bg-[#183991] disabled:cursor-wait disabled:opacity-60"
                        >
                            {isSaving
                                ? 'Guardando producto…'
                                : product
                                  ? 'Guardar cambios'
                                  : 'Crear producto'}
                        </button>
                    </div>
                </div>
                {errors.root?.server?.message && (
                    <p role="alert" className="text-center text-xs text-[#B42318]">
                        {errors.root.server.message}
                    </p>
                )}
            </form>
            {currentProduct && (
                <OptionGroupsEditor
                    productId={currentProduct.id}
                    initialGroups={currentProduct.optionGroups}
                />
            )}
        </Modal>
    )
}
