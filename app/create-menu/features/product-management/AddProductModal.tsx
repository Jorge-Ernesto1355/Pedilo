/* eslint-disable @next/next/no-img-element -- Product images are local object URLs until upload integration exists. */

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Modal } from '@/app/components/ui/Modal'
import { productSchema, type ProductFormValues, type SavedProduct } from './product.schema'
import { ProductExtrasList } from './ProductExtrasList'
import { ProductOptionsList } from './ProductOptionsList'

type AddProductModalProps = {
    open: boolean
    categories: string[]
    onClose: () => void
    onSave: (product: SavedProduct) => void
}

export function AddProductModal({ open, categories, onClose, onSave }: AddProductModalProps) {
    const methods = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), mode: 'onChange', defaultValues: { name: '', price: '', description: '', category: categories[0] ?? '', options: [], extras: [] } })
    const { register, handleSubmit, reset, formState: { errors } } = methods
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const currentObjectUrl = useRef<string | null>(null)

    useEffect(() => () => {
        if (currentObjectUrl.current) URL.revokeObjectURL(currentObjectUrl.current)
    }, [])

    useEffect(() => {
        if (open) reset({ name: '', price: '', description: '', category: categories[0] ?? '', options: [], extras: [] })
    }, [categories, open, reset])

    function selectImage(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (currentObjectUrl.current) URL.revokeObjectURL(currentObjectUrl.current)
        const url = URL.createObjectURL(file)
        currentObjectUrl.current = url
        setImagePreview(url)
    }

    function save(values: ProductFormValues) {
        onSave({ ...values, id: crypto.randomUUID(), image: imagePreview })
        onClose()
        setImagePreview(null)
    }

    return (
        <Modal open={open} onClose={onClose} title="Agregar producto" description="Construye una ficha clara para que tus clientes sepan qué pedir." size="lg">
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(save)} className="space-y-7">
                    <div>
                        <p className="mb-2 text-sm font-semibold text-[#243556]">Imagen del plato <span className="font-normal text-[#8996A9]">(opcional)</span></p>
                        <label htmlFor="product-image" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectImage(event.dataTransfer.files[0]) }} className="group relative flex min-h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] transition hover:border-[#2451C5] hover:bg-[#F4F7FF]">
                            {imagePreview ? <img src={imagePreview} alt="Vista previa del producto" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-2 text-center text-[#65738A]"><span className="grid size-11 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]"><ImagePlus className="size-5" /></span><span className="text-sm font-semibold">Arrastra una imagen o haz clic</span><span className="text-xs text-[#8996A9]">JPG, PNG o WebP · vista local</span></span>}
                            {imagePreview && <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-bold text-[#243556] shadow-sm"><Upload className="size-3.5" />Cambiar imagen</span>}
                            <input id="product-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => selectImage(event.target.files?.[0])} />
                        </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-[1.15fr_.55fr_.85fr]">
                        <div><label htmlFor="product-name" className="mb-2 block text-sm font-semibold text-[#243556]">Nombre del plato</label><input id="product-name" placeholder="Ej. Hamburguesa clásica" className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('name')} />{errors.name && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.name.message}</p>}</div>
                        <div><label htmlFor="product-price" className="mb-2 block text-sm font-semibold text-[#243556]">Precio</label><div className="relative"><span className="pointer-events-none absolute left-3.5 top-3 text-sm text-[#8996A9]">$</span><input id="product-price" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" className="w-full rounded-xl border border-[#D7E1EF] py-3 pl-7 pr-3.5 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('price')} /></div>{errors.price && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.price.message}</p>}</div>
                        <div><label htmlFor="product-category" className="mb-2 block text-sm font-semibold text-[#243556]">Categoría</label><select id="product-category" className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('category')}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{errors.category && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.category.message}</p>}</div>
                    </div>
                    <div><label htmlFor="product-description" className="mb-2 block text-sm font-semibold text-[#243556]">Descripción / ingredientes</label><textarea id="product-description" rows={3} placeholder="Carne, queso, lechuga y aderezo de la casa" className="w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('description')} />{errors.description && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.description.message}</p>}</div>

                    <div className="grid gap-6 border-t border-[#E8EEF6] pt-6 sm:grid-cols-2">
                        <div><div className="mb-3"><p className="text-sm font-semibold text-[#243556]">Opciones</p><p className="mt-1 text-xs leading-5 text-[#8996A9]">Variantes que el cliente debe elegir.</p></div><ProductOptionsList />{errors.options?.root && <p role="alert" className="mt-2 text-xs text-[#B42318]">{errors.options.root.message}</p>}</div>
                        <div><div className="mb-3"><p className="text-sm font-semibold text-[#243556]">Extras</p><p className="mt-1 text-xs leading-5 text-[#8996A9]">Añade complementos y su precio opcional.</p></div><ProductExtrasList />{errors.extras?.root && <p role="alert" className="mt-2 text-xs text-[#B42318]">{errors.extras.root.message}</p>}</div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-[#E8EEF6] pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] transition hover:bg-[#F2F5FA]">Cancelar</button><button type="submit" className="rounded-xl bg-[#1E40AF] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20">Guardar producto</button></div>
                </form>
            </FormProvider>
        </Modal>
    )
}
