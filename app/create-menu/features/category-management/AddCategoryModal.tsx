'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Plus } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Modal } from '@/app/components/ui/Modal'
import { categorySchema, type CategoryValues } from './categoryManagement.schema'

type AddCategoryModalProps = {
    open: boolean
    categories: string[]
    onClose: () => void
    onSave: (category: string) => void
}

export function AddCategoryModal({ open, categories, onClose, onSave }: AddCategoryModalProps) {
    const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: { category: '' } })
    const selectedCategory = useWatch({ control, name: 'category' })

    function submit(values: CategoryValues) {
        onSave(values.category)
        setValue('category', '')
    }

    return (
        <Modal open={open} onClose={onClose} title="Agregar categoría" description="Organiza tu menú para que encontrar cada plato sea natural.">
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
                <div><label htmlFor="category-name" className="mb-2 block text-sm font-semibold text-[#243556]">Nueva categoría</label><input id="category-name" autoFocus placeholder="Ej. Desayunos" className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('category')} />{errors.category && <p role="alert" className="mt-1.5 text-xs text-[#B42318]">{errors.category.message}</p>}</div>
                <div><p className="mb-2 text-xs font-bold uppercase tracking-[.13em] text-[#8996A9]">Categorías existentes</p><div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} type="button" onClick={() => setValue('category', category, { shouldValidate: true })} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${selectedCategory === category ? 'border-[#2451C5] bg-[#EEF3FF] text-[#1E40AF]' : 'border-[#DCE5F3] text-[#52627B] hover:border-[#AEBFE0]'}`}>{selectedCategory === category && <Check className="size-3.5" />}{category}</button>)}</div></div>
                <div className="flex flex-col-reverse gap-2 border-t border-[#E8EEF6] pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] transition hover:bg-[#F2F5FA]">Cancelar</button><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20"><Plus className="size-4" />Guardar categoría</button></div>
            </form>
        </Modal>
    )
}
