'use client'

import { useState } from 'react'
import { Search, Tag, X } from 'lucide-react'
import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
import type { Menu } from '../category-management/menu.types'

type Props = {
    businessId?: string
    menus?: Menu[]
    menusLoading?: boolean
    menusError?: boolean
    onRetryMenus?: () => void
    onSaved?: () => void
}

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
function dateParts(date: Date) { return { day: String(date.getDate()), month: String(date.getMonth()), time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` } }

export function DiscountsPanel({ businessId, menus = [], menusLoading = false, menusError = false, onRetryMenus, onSaved }: Props) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [value, setValue] = useState('10')
    const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
    const [scope, setScope] = useState<'MENU' | 'PRODUCTS' | 'CATEGORIES'>('MENU')
    const [endDay, setEndDay] = useState(() => dateParts(new Date(Date.now() + 24 * 60 * 60 * 1000)).day)
    const [endMonth, setEndMonth] = useState(() => dateParts(new Date(Date.now() + 24 * 60 * 60 * 1000)).month)
    const [endTime, setEndTime] = useState(() => dateParts(new Date(Date.now() + 24 * 60 * 60 * 1000)).time)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const products = menus.flatMap((menu) => menu.categories.flatMap((category) => category.products.map((product) => ({ ...product, categoryName: category.name, menuName: menu.name }))))
    const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(productSearch.trim().toLowerCase()))
    const categories = menus.flatMap((menu) => menu.categories.map((category) => ({ ...category, menuName: menu.name })))

    function setDuration(days: number) {
        const next = dateParts(new Date(Date.now() + days * 24 * 60 * 60 * 1000)); setEndDay(next.day); setEndMonth(next.month); setEndTime(next.time)
    }

    function selectedEndDate() {
        const now = new Date()
        const result = new Date(now.getFullYear(), Number(endMonth), Number(endDay), Number(endTime.slice(0, 2)), Number(endTime.slice(3, 5)))
        return result
    }

    function toggleId(id: string) {
        setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    }

    function validate() {
        const cleanName = name.trim()
        const numericValue = Number(value)
        if (cleanName.length < 2) return 'Escribe un nombre de al menos 2 caracteres.'
        if (cleanName.length > 50) return 'El nombre puede tener máximo 50 caracteres.'
        if (!value || !Number.isFinite(numericValue) || numericValue <= 0) return type === 'PERCENT' ? 'El porcentaje debe ser mayor a 0.' : 'El monto debe ser mayor a 0.'
        if (type === 'PERCENT' && (!Number.isInteger(numericValue) || numericValue > 100 || value.length > 3)) return 'El porcentaje debe ser un número entero entre 1 y 100.'
        if (type === 'FIXED' && (numericValue > 100000 || !/^\d+(\.\d{1,2})?$/.test(value))) return 'El monto debe tener máximo 2 decimales y no superar $100,000.'
        if (selectedEndDate().getTime() <= Date.now() + 60_000) return 'Elige una fecha posterior a un minuto desde ahora.'
        if (selectedIds.length === 0) return scope === 'MENU' ? 'Selecciona al menos un menú.' : scope === 'CATEGORIES' ? 'Selecciona al menos una categoría.' : 'Selecciona al menos un producto.'
        return null
    }

    async function submit() {
        if (!businessId) return
        const validationError = validate()
        if (validationError) { setError(validationError); return }
        setSaving(true); setError(''); setSaved(false)
        try {
            await apiClient.post(`/businesses/${businessId}/discounts`, {
                name: name.trim(), type, value: Number(value), scope,
                ...(scope === 'MENU' ? { menuIds: selectedIds } : {}),
                ...(scope === 'PRODUCTS' ? { productIds: selectedIds } : {}),
                ...(scope === 'CATEGORIES' ? { categoryIds: selectedIds } : {}),
                endsAt: selectedEndDate().toISOString(),
            })
            setSaved(true); setOpen(false); setName(''); onSaved?.()
        } catch (cause) {
            const normalized = normalizeApiError(cause)
            const friendly = getUserFriendlyError(normalized, { fallback: { title: 'No se pudo crear el descuento' } })
            setError(normalized.code === 'DISCOUNT_CONFLICT' ? 'Uno de los productos ya tiene otro descuento activo.' : friendly.description)
        } finally { setSaving(false) }
    }

    return <>
        <div className="rounded-2xl border border-[#DCE5F3] bg-[#FBFCFE] p-4">
            <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FFF3D6] text-[#B87500]"><Tag className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#10224A]">Descuentos</p><p className="text-xs text-[#74829A]">Atrae clientes con promociones visibles en tu menú.</p></div>
                <button type="button" data-cy="create-discount" onClick={() => setOpen(true)} className="rounded-xl bg-[#2451C5] px-3 py-2 text-xs font-bold text-white hover:bg-[#1E40AF]">Crear descuento</button>
            </div>
            {saved && <p className="mt-3 text-xs font-semibold text-emerald-700">Descuento creado correctamente.</p>}
        </div>
        {open && <div data-cy="discount-create-dialog" className="fixed inset-0 z-50 flex items-end justify-center bg-[#10224A]/30 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Crear descuento">
            <div className="w-full max-w-[480px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">Promoción</p><h3 className="text-xl font-bold text-[#10224A]">Crear descuento</h3></div><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X className="size-5 text-[#74829A]" /></button></div>
                <div className="space-y-4">
                    <label className="block text-sm font-semibold text-[#243556]">Nombre<input maxLength={50} data-cy="discount-name" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Ej. Fin de semana" className="mt-1 h-11 w-full rounded-xl border border-[#C9D7EA] px-3 text-sm outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" /><span className="mt-1 block text-right text-[11px] font-normal text-[#8996A9]">{name.length}/50</span></label>
                    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-[#243556]">Tipo<div className="relative mt-1"><select data-cy="discount-type" value={type} onChange={(event) => { setType(event.target.value as typeof type); setError('') }} className="h-11 w-full appearance-none rounded-xl border border-[#C9D7EA] bg-white px-3 pr-9 text-sm font-medium text-[#243556] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"><option value="PERCENT">Porcentaje</option><option value="FIXED">Monto fijo</option></select><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#65738A]">⌄</span></div></label><label className="text-sm font-semibold text-[#243556]">Valor<div className="relative mt-1"><input data-cy="discount-value" inputMode="decimal" min="1" max={type === 'PERCENT' ? 100 : 100000} maxLength={type === 'PERCENT' ? 3 : 8} value={value} onChange={(event) => { const next = event.target.value.replace(',', '.'); setValue(type === 'PERCENT' ? next.replace(/\D/g, '').slice(0, 3) : next); setError('') }} className="h-11 w-full rounded-xl border border-[#C9D7EA] bg-white px-3 pr-9 text-sm outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8996A9]">{type === 'PERCENT' ? '%' : '$'}</span></div></label></div>
                    <label className="block text-sm font-semibold text-[#243556]">Aplicar a<div className="relative mt-1"><select data-cy="discount-scope" value={scope} onChange={(event) => { setScope(event.target.value as typeof scope); setSelectedIds([]); setError('') }} className="h-11 w-full appearance-none rounded-xl border border-[#C9D7EA] bg-white px-3 pr-9 text-sm font-medium text-[#243556] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"><option value="MENU">Todo el menú</option><option value="PRODUCTS">Productos específicos</option><option value="CATEGORIES">Categorías</option></select><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#65738A]">⌄</span></div></label>
                    {scope === 'PRODUCTS' && !menusLoading && !menusError && <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]" /><input data-cy="discount-product-search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar producto por nombre" className="h-10 w-full rounded-xl border border-[#C9D7EA] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" /></label>}
                    {menusLoading ? <div data-cy="discount-targets-skeleton" className="space-y-2 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3" aria-label="Cargando opciones"><span className="block h-9 animate-pulse rounded-lg bg-[#E8EEF6]" /><span className="block h-9 animate-pulse rounded-lg bg-[#E8EEF6]" /><span className="block h-9 animate-pulse bg-[#E8EEF6]" /></div> : menusError ? <div role="alert" className="rounded-xl border border-[#F3C7C3] bg-[#FFF7F6] p-3 text-xs text-[#B42318]"><p className="font-bold">No pudimos cargar las opciones del menú.</p><p className="mt-1">Revisa tu conexión e inténtalo nuevamente.</p>{onRetryMenus && <button type="button" onClick={onRetryMenus} className="mt-2 rounded-lg bg-white px-3 py-1.5 font-bold text-[#B42318] ring-1 ring-[#F3C7C3]">Reintentar</button>}</div> : <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-2">{scope === 'MENU' ? menus.map((menu) => <label key={menu.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white"><input type="checkbox" checked={selectedIds.includes(menu.id)} onChange={() => toggleId(menu.id)} /> <span className="min-w-0 truncate">{menu.name}</span><span className="ml-auto text-[11px] text-[#8996A9]">{menu.categories.length} categorías</span></label>) : scope === 'CATEGORIES' ? categories.map((category) => <label key={category.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white"><input type="checkbox" checked={selectedIds.includes(category.id)} onChange={() => toggleId(category.id)} /> <span className="min-w-0 truncate">{category.name}</span><span className="ml-auto text-[11px] text-[#8996A9]">{category.menuName}</span></label>) : filteredProducts.map((product) => <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white"><input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => toggleId(product.id)} /> <span className="min-w-0 truncate">{product.name}</span><span className="ml-auto text-[11px] text-[#8996A9]">{product.menuName}</span></label>)}{(scope === 'MENU' ? menus.length : scope === 'CATEGORIES' ? categories.length : filteredProducts.length) === 0 && <p className="px-2 py-3 text-xs text-[#74829A]">{scope === 'PRODUCTS' && productSearch ? 'No encontramos productos con ese nombre.' : 'Todavía no hay opciones disponibles en tu menú.'}</p>}</div>}
                    <div><p className="block text-sm font-semibold text-[#243556]">Termina el</p><div className="mt-1 grid grid-cols-3 gap-2"><select data-cy="discount-end-day" value={endDay} onChange={(event) => { setEndDay(event.target.value); setError('') }} className="h-11 appearance-none rounded-xl border border-[#C9D7EA] bg-white px-2 text-sm outline-none focus:border-[#2451C5]"><option value="">Día</option>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select><select data-cy="discount-end-month" value={endMonth} onChange={(event) => { setEndMonth(event.target.value); setError('') }} className="h-11 appearance-none rounded-xl border border-[#C9D7EA] bg-white px-2 text-sm outline-none focus:border-[#2451C5]"><option value="">Mes</option>{monthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}</select><input data-cy="discount-end-time" type="time" value={endTime} onChange={(event) => { setEndTime(event.target.value); setError('') }} className="h-11 rounded-xl border border-[#C9D7EA] bg-white px-2 text-sm outline-none focus:border-[#2451C5]" /></div><div className="mt-2 flex gap-2"><button type="button" onClick={() => setDuration(1)} className="rounded-lg bg-[#EEF3FF] px-2.5 py-1.5 text-[11px] font-bold text-[#2451C5]">1 día</button><button type="button" onClick={() => setDuration(7)} className="rounded-lg bg-[#EEF3FF] px-2.5 py-1.5 text-[11px] font-bold text-[#2451C5]">7 días</button><button type="button" onClick={() => setDuration(30)} className="rounded-lg bg-[#EEF3FF] px-2.5 py-1.5 text-[11px] font-bold text-[#2451C5]">30 días</button></div></div>
                    {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
                    <button type="button" data-cy="save-discount" disabled={saving || !name || !endDay || !endMonth || !endTime} onClick={submit} className="w-full rounded-xl bg-[#2451C5] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar descuento'}</button>
                </div>
            </div>
        </div>}
    </>
}
