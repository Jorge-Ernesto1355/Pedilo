'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
import type { Menu } from '@/app/(protected)/create-menu/features/category-management/menu.types'

type Discount = { id: string; name: string; type: 'PERCENT' | 'FIXED'; value: number; scope: 'MENU' | 'PRODUCTS' | 'CATEGORIES'; endsAt: string; product_ids?: string[]; category_ids?: string[]; menu_ids?: string[] }
type Props = { businessId?: string; discount: Discount; menus: Menu[]; onClose: () => void; onSaved: () => void }
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function parts(value: string) { const date = new Date(value); return { day: String(date.getDate()), month: String(date.getMonth()), time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` } }

export function DiscountEditDialog({ businessId, discount, menus, onClose, onSaved }: Props) {
    const initial = parts(discount.endsAt)
    const [name, setName] = useState(discount.name)
    const [value, setValue] = useState(String(discount.value))
    const [scope, setScope] = useState(discount.scope)
    const [day, setDay] = useState(initial.day)
    const [month, setMonth] = useState(initial.month)
    const [time, setTime] = useState(initial.time)
    const [selected, setSelected] = useState<string[]>(discount.scope === 'MENU' ? discount.menu_ids ?? [] : discount.scope === 'CATEGORIES' ? discount.category_ids ?? [] : discount.product_ids ?? [])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const products = menus.flatMap((menu) => menu.categories.flatMap((category) => category.products.map((product) => ({ ...product, menuName: menu.name }))))
    const categories = menus.flatMap((menu) => menu.categories.map((category) => ({ ...category, menuName: menu.name })))
    const options = useMemo(() => scope === 'MENU' ? menus : scope === 'CATEGORIES' ? categories : products, [scope, menus, categories, products])
    function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }
    async function save() {
        const numeric = Number(value)
        if (name.trim().length < 2 || name.trim().length > 50) return setError('El nombre debe tener entre 2 y 50 caracteres.')
        if (!Number.isFinite(numeric) || numeric <= 0 || (discount.type === 'PERCENT' && (!Number.isInteger(numeric) || numeric > 100)) || (discount.type === 'FIXED' && (numeric > 100000 || !/^\d+(\.\d{1,2})?$/.test(value)))) return setError(discount.type === 'PERCENT' ? 'El porcentaje debe ser un entero entre 1 y 100.' : 'El monto debe tener máximo 2 decimales y no superar $100,000.')
        if (!selected.length) return setError(scope === 'MENU' ? 'Selecciona al menos un menú.' : scope === 'CATEGORIES' ? 'Selecciona al menos una categoría.' : 'Selecciona al menos un producto.')
        let date = new Date(new Date().getFullYear(), Number(month), Number(day), Number(time.slice(0, 2)), Number(time.slice(3, 5)))
        if (date.getTime() <= Date.now() + 60_000) return setError('Elige una fecha posterior a un minuto desde ahora.')
        setSaving(true); setError('')
        try { await apiClient.put(`/businesses/${businessId}/discounts/${discount.id}`, { name: name.trim(), type: discount.type, value: numeric, scope, endsAt: date.toISOString(), ...(scope === 'MENU' ? { menuIds: selected } : {}), ...(scope === 'CATEGORIES' ? { categoryIds: selected } : {}), ...(scope === 'PRODUCTS' ? { productIds: selected } : {}) }); onSaved(); onClose() } catch (cause) { setError(getUserFriendlyError(normalizeApiError(cause)).description) } finally { setSaving(false) }
    }
    return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#10224A]/30 p-0 sm:items-center sm:p-5"><div className="w-full max-w-[520px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label="Editar descuento"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">Editar descuento</p><h2 className="text-xl font-bold text-[#10224A]">{discount.name}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar"><X className="size-5 text-[#74829A]" /></button></div><div className="space-y-3"><label className="block text-sm font-semibold text-[#243556]">Nombre<input maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[#C9D7EA] px-3 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold text-[#243556]">Tipo<input value={discount.type === 'PERCENT' ? 'Porcentaje' : 'Monto fijo'} disabled className="mt-1 h-11 w-full rounded-xl border border-[#E3E8F1] bg-[#F6F8FC] px-3 text-sm text-[#74829A]" /></label><label className="text-sm font-semibold text-[#243556]">Valor<input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value.replace(',', '.'))} className="mt-1 h-11 w-full rounded-xl border border-[#C9D7EA] px-3 text-sm" /></label></div><label className="block text-sm font-semibold text-[#243556]">Aplicar a<select value={scope} onChange={(event) => { setScope(event.target.value as typeof scope); setSelected([]) }} className="mt-1 h-11 w-full rounded-xl border border-[#C9D7EA] bg-white px-3 text-sm"><option value="MENU">Menús</option><option value="CATEGORIES">Categorías</option><option value="PRODUCTS">Productos específicos</option></select></label><div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-2">{options.map((option) => <label key={option.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white"><input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} /><span className="min-w-0 truncate">{option.name}</span></label>)}</div><div className="grid grid-cols-3 gap-2"><select value={day} onChange={(event) => setDay(event.target.value)} className="h-11 rounded-xl border border-[#C9D7EA] bg-white px-2 text-sm">{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select><select value={month} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-xl border border-[#C9D7EA] bg-white px-2 text-sm">{months.map((item, index) => <option key={item} value={index}>{item}</option>)}</select><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-11 rounded-xl border border-[#C9D7EA] bg-white px-2 text-sm" /></div>{error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}<button type="button" onClick={() => void save()} disabled={saving} className="w-full rounded-xl bg-[#2451C5] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button></div></div></div>
}
