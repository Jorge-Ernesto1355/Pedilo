'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/app/components/ui/Modal'
import type { MenuCreationInput } from './menu.types'

const menuFormSchema = z.object({
    name: z.string().trim().min(1, 'Escribe un nombre para el menú.').max(80, 'Usa 80 caracteres o menos.'),
    description: z.string().trim().max(180, 'Usa 180 caracteres o menos.'),
    category: z.string().trim().max(40, 'Usa 40 caracteres o menos.'),
    categoryDescription: z.string().trim().max(180, 'Usa 180 caracteres o menos.'),
})

type MenuFormValues = z.infer<typeof menuFormSchema>

type AddCategoryModalProps = {
    open: boolean
    isSaving?: boolean
    errorMessage?: string
    onClose: () => void
    onSave: (menu: MenuCreationInput) => void
}

export function AddCategoryModal({ open, isSaving = false, errorMessage, onClose, onSave }: AddCategoryModalProps) {
    const [draftCategories, setDraftCategories] = useState<MenuCreationInput['categories']>([])
    const addingCategory = useRef(false)
    const { register, handleSubmit, getValues, reset, setError, trigger, formState: { errors } } = useForm<MenuFormValues>({
        resolver: zodResolver(menuFormSchema),
        defaultValues: { name: '', description: '', category: '', categoryDescription: '' },
    })

    useEffect(() => {
        if (!open) return
        reset({ name: '', description: '', category: '', categoryDescription: '' })
        const timer = window.setTimeout(() => setDraftCategories([]), 0)
        return () => window.clearTimeout(timer)
    }, [open, reset])

    async function addCategory() {
        if (addingCategory.current) return
        addingCategory.current = true

        try {
        const isValid = await trigger('category')
        if (!isValid) return

        const category = getValues('category').trim()
        if (draftCategories.some((item) => item.name.toLowerCase() === category.toLowerCase())) {
            setError('category', { type: 'duplicate', message: 'Esta categoría ya fue agregada.' })
            return
        }

        setDraftCategories((current) => [...current, { name: category, description: getValues('categoryDescription').trim() }])
        reset({ ...getValues(), category: '', categoryDescription: '' })
        } finally {
            addingCategory.current = false
        }
    }

    function submit(values: MenuFormValues) {
        onSave({ name: values.name.trim(), description: values.description.trim(), categories: draftCategories })
    }

    return (
        <Modal open={open} onClose={onClose} title="Crear menú" description="Crea un menú y organiza sus categorías desde un solo lugar.">
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
                <div>
                    <label htmlFor="menu-name" className="mb-2 block text-sm font-semibold text-[#243556]">Nombre del menú</label>
                    <input id="menu-name" autoFocus placeholder="Ej. Menú principal" className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('name')} />
                    {errors.name && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.name.message}</p>}
                </div>

                <div>
                    <label htmlFor="menu-description" className="mb-2 block text-sm font-semibold text-[#243556]">Descripción <span className="font-normal text-[#8996A9]">(opcional)</span></label>
                    <textarea id="menu-description" rows={3} placeholder="Hamburguesas, alitas y bebidas" className="w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('description')} />
                    {errors.description && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.description.message}</p>}
                </div>

                <div className="border-t border-[#E8EEF6] pt-5">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[.13em] text-[#8996A9]">Categorías</p>
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <label htmlFor="category-name" className="sr-only">Nombre de categoría</label>
                            <input id="category-name" placeholder="Nombre de categoría" className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('category')} />
                            {errors.category && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.category.message}</p>}
                            <label htmlFor="category-description" className="sr-only">Descripción de categoría</label>
                            <textarea id="category-description" rows={2} placeholder="Descripción de categoría (opcional)" className="mt-2 w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('categoryDescription')} />
                            {errors.categoryDescription && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.categoryDescription.message}</p>}
                        </div>
                        <button type="button" onClick={() => void addCategory()} aria-label="Agregar categoría" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#C9D7EA] text-[#2451C5] transition hover:border-[#2451C5] hover:bg-[#F4F7FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/15"><Plus className="size-4" /></button>
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[.13em] text-[#8996A9]">Categorías agregadas</p>
                    {draftCategories.length > 0 ? <ul className="divide-y divide-[#E8EEF6] overflow-hidden rounded-xl border border-[#DCE5F3] bg-[#FBFCFE]">{draftCategories.map((category) => <li key={category.name} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm text-[#243556]"><div><p className="font-semibold">{category.name}</p>{category.description && <p className="mt-0.5 text-xs font-normal text-[#8996A9]">{category.description}</p>}</div><button type="button" onClick={() => setDraftCategories((current) => current.filter((item) => item.name !== category.name))} aria-label={`Quitar ${category.name}`} className="grid size-7 shrink-0 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#FDECEC] hover:text-[#B42318]"><X className="size-4" /></button></li>)}</ul> : <p className="rounded-xl border border-dashed border-[#DCE5F3] px-3.5 py-3 text-sm text-[#8996A9]">Aún no has agregado categorías.</p>}
                </div>

                {errorMessage && <p role="alert" className="rounded-xl bg-[#FDECEC] px-3.5 py-3 text-xs text-[#B42318]">{errorMessage}</p>}
                <div className="flex flex-col-reverse gap-2 border-t border-[#E8EEF6] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] transition hover:bg-[#F2F5FA] disabled:opacity-50">Cancelar</button><button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20 disabled:cursor-wait disabled:opacity-60">{isSaving ? 'Creando menú…' : 'Crear menú'}</button></div>
            </form>
        </Modal>
    )
}
