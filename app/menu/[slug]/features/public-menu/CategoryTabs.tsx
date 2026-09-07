'use client'

import type { PublicMenuCategory } from './types'

export function CategoryTabs({ categories, activeCategory, onChange }: { categories: PublicMenuCategory[]; activeCategory: string; onChange: (categoryId: string) => void }) {
    return <nav className="sticky top-3 z-20 -mx-1 overflow-x-auto rounded-xl border border-[#DCE5F3] bg-white/95 p-1 shadow-[0_8px_22px_rgb(20_48_105_/_0.08)] backdrop-blur" aria-label="Categorías del menú"><div className="flex min-w-max gap-1">{categories.map((category) => <button key={category.id} type="button" aria-pressed={activeCategory === category.id} onClick={() => { onChange(category.id); document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${activeCategory === category.id ? 'bg-[#EAF0FF] text-[#1E40AF]' : 'text-[#65738A] hover:bg-[#F5F8FC] hover:text-[#1E40AF]'}`}>{category.name}</button>)}</div></nav>
}
