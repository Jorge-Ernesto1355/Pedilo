'use client'

import { useState } from 'react'
import { CategoryTabs } from './features/public-menu/CategoryTabs'
import { MenuHeader } from './features/public-menu/MenuHeader'
import { OrderDrawer } from './features/public-menu/OrderDrawer'
import { ProductCard } from './features/public-menu/ProductCard'
import { ProductCustomizeDialog } from './features/public-menu/ProductCustomizeDialog'
import { useBusinessMenu } from './features/public-menu/useBusinessMenu'
import { useOrderCart } from './features/public-menu/useOrderCart'
import type { CartSelection, PublicMenuProduct } from './features/public-menu/types'

export default function PublicMenuPage({ slug }: { slug: string }) {
    const { data } = useBusinessMenu(slug)
    const cart = useOrderCart()
    const [activeCategory, setActiveCategory] = useState(data.categories[0]?.id ?? '')
    const [customizingProduct, setCustomizingProduct] = useState<PublicMenuProduct | null>(null)
    const [orderOpen, setOrderOpen] = useState(false)

    const categoryCount = data.categories.length

    function addCustomizedProduct(option: CartSelection | null, extras: CartSelection[]) {
        if (customizingProduct) cart.add(customizingProduct, option, extras)
    }

    function sendWhatsAppOrder(customerName: string) {
        const lines = cart.lines.map((line) => {
            const details = [line.option?.name, ...line.extras.map((extra) => extra.name)].filter(Boolean)
            return `${line.quantity}x ${line.product.name}${details.length ? ` (${details.join(', ')})` : ''} — $${(line.unitPrice * line.quantity).toLocaleString('es-MX')}`
        })
        const message = [`Hola, soy ${customerName}. Quiero hacer este pedido en ${data.business.name}:`, ...lines, `Total: $${cart.total.toLocaleString('es-MX')}`].join('\n')
        const whatsappUrl = `https://wa.me/${data.business.whatsappNumber}?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
    }

    return <main className="min-h-screen bg-[#F5F8FC] text-[#12234A]">
        <div className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-32">
            <div className="mb-5 flex items-center justify-between gap-4 px-1"><span className="text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">Menú online</span><span className="text-xs font-semibold text-[#8996A9]">{categoryCount} {categoryCount === 1 ? 'categoría' : 'categorías'}</span></div>
            <MenuHeader business={data.business} />
            <section className="mt-6" aria-labelledby="menu-title"><div className="mb-5 px-1"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">Pide a tu manera</p><h2 id="menu-title" className="mt-1 font-display text-2xl tracking-[-.05em] text-[#10224A] sm:text-3xl">Elige algo rico.</h2></div><CategoryTabs categories={data.categories} activeCategory={activeCategory} onChange={setActiveCategory} /><div className="mt-5 space-y-5">{data.categories.map((category) => <section key={category.id} id={`category-${category.id}`} className="scroll-mt-24 rounded-[24px] border border-[#DCE5F3] bg-white p-5 shadow-[0_16px_46px_-36px_rgba(19,49,117,.4)] sm:p-7"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#8996A9]">{category.products.length} {category.products.length === 1 ? 'opción' : 'opciones'}</p><h3 className="mt-1 font-display text-xl tracking-[-.04em] text-[#12234A]">{category.name}</h3></div></div><div>{category.products.map((product) => <ProductCard key={product.id} product={product} onAdd={() => cart.add(product)} onCustomize={() => setCustomizingProduct(product)} />)}</div></section>)}</div></section>
        </div>
        <OrderDrawer lines={cart.lines} totalItems={cart.totalItems} total={cart.total} open={orderOpen} businessName={data.business.name} onChangeQuantity={cart.changeQuantity} onOpen={() => setOrderOpen(true)} onClose={() => setOrderOpen(false)} onCheckout={sendWhatsAppOrder} />
        <ProductCustomizeDialog key={customizingProduct?.id ?? 'empty'} product={customizingProduct} onClose={() => setCustomizingProduct(null)} onAdd={addCustomizedProduct} />
    </main>
}
