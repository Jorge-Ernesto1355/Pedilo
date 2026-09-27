'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, Utensils } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { CategoryTabs } from './features/public-menu/CategoryTabs'
import { MenuHeader } from './features/public-menu/MenuHeader'
import { OrderDrawer } from './features/public-menu/OrderDrawer'
import { ProductCard } from './features/public-menu/ProductCard'
import { ProductCustomizeDialog } from './features/public-menu/ProductCustomizeDialog'
import { useBusinessMenu } from './features/public-menu/useBusinessMenu'
import { useOrderCart } from './features/public-menu/useOrderCart'
import type { PublicProduct } from './features/public-menu/publicCatalog.types'

function LoadingMenu() {
    return (
        <main className="min-h-screen bg-[#F5F8FC] p-4 sm:p-8">
            <div className="mx-auto max-w-5xl animate-pulse space-y-5">
                <div className="h-40 rounded-[24px] bg-[#DCE5F3] sm:h-56" />
                <div className="h-7 w-56 rounded bg-[#DCE5F3]" />
                <div className="h-12 rounded-xl bg-[#DCE5F3]" />
                <div className="space-y-3 rounded-[24px] bg-white p-6">
                    <div className="h-6 w-40 rounded bg-[#E8EEF6]" />
                    <div className="h-24 rounded bg-[#F1F4F9]" />
                    <div className="h-24 rounded bg-[#F1F4F9]" />
                </div>
            </div>
        </main>
    )
}

export default function PublicMenuPage({ slug }: { slug: string }) {
    const query = useBusinessMenu(slug)
    const cart = useOrderCart()
    const [menuId, setMenuId] = useState('')
    const [activeCategory, setActiveCategory] = useState('')
    const [product, setProduct] = useState<PublicProduct | null>(null)
    const [orderOpen, setOrderOpen] = useState(false)
    const menus = useMemo(
        () => query.data?.menus.filter((menu) => menu.isActive) ?? [],
        [query.data],
    )
    const menu = menus.find((item) => item.id === menuId) ?? menus[0]
    const categories = useMemo(
        () =>
            menu?.categories
                .filter((category) => category.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
        [menu],
    )

    if (query.isLoading) return <LoadingMenu />
    if (query.isError || !query.data) {
        const notFound =
            query.error instanceof ApiError &&
            (query.error.status === 404 || query.error.code === 'PUBLIC_BUSINESS_NOT_FOUND')
        return (
            <main className="grid min-h-screen place-items-center bg-[#F5F8FC] p-6 text-center">
                <div>
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF0FF] text-[#2451C5]">
                        <AlertCircle />
                    </div>
                    <h1 className="mt-5 font-display text-3xl text-[#10224A]">
                        {notFound ? 'Negocio no encontrado' : 'No pudimos cargar el menú'}
                    </h1>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[#65738A]">
                        {notFound
                            ? 'No pudimos encontrar este menú.'
                            : 'Intenta nuevamente en unos momentos.'}
                    </p>
                    {!notFound && (
                        <button
                            type="button"
                            onClick={() => void query.refetch()}
                            className="mt-5 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </main>
        )
    }

    const catalog = query.data!
    function sendWhatsAppOrder(customerName: string) {
        const lines = cart.lines.map(
            (line) =>
                `${line.quantity}x ${line.product.name} — $${(line.unitPrice * line.quantity).toLocaleString('es-MX')}`,
        )
        const message = [
            `Hola, soy ${customerName}. Quiero hacer este pedido en ${catalog.business.name}:`,
            ...lines,
            `Total: $${cart.total.toLocaleString('es-MX')}`,
        ].join('\n')
        window.open(
            `https://wa.me/${catalog.business.whatsappNumber ?? ''}?text=${encodeURIComponent(message)}`,
            '_blank',
            'noopener,noreferrer',
        )
    }

    return (
        <main className="min-h-screen bg-[#F5F8FC] text-[#12234A]">
            <div className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-32">
                <MenuHeader business={query.data.business} />
                {menus.length > 0 ? (
                    <section className="mt-6" aria-label="Menús">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {menus.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setMenuId(item.id)}
                                    className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold ${item.id === menu?.id ? 'border-[#2451C5] bg-[#1E40AF] text-white' : 'border-[#DCE5F3] bg-white text-[#65738A]'}`}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        {menu?.description && (
                            <p className="mt-4 px-1 text-sm text-[#65738A]">{menu.description}</p>
                        )}
                        {categories.length > 0 ? (
                            <div className="mt-5">
                                <CategoryTabs
                                    categories={categories}
                                    activeCategory={activeCategory}
                                    onChange={setActiveCategory}
                                />
                                <div className="mt-5 space-y-5">
                                    {categories.map((category) => (
                                        <section
                                            key={category.id}
                                            id={`category-${category.id}`}
                                            className="scroll-mt-24 rounded-[24px] border border-[#DCE5F3] bg-white p-5 sm:p-7"
                                        >
                                            <div className="mb-5">
                                                <p className="text-xs font-bold uppercase tracking-[.15em] text-[#8996A9]">
                                                    {category.products.length}{' '}
                                                    {category.products.length === 1
                                                        ? 'opción'
                                                        : 'opciones'}
                                                </p>
                                                <h2 className="mt-1 font-display text-xl text-[#12234A]">
                                                    {category.name}
                                                </h2>
                                                {category.description && (
                                                    <p className="mt-1 text-sm text-[#65738A]">
                                                        {category.description}
                                                    </p>
                                                )}
                                            </div>
                                            {category.products.map((item) => (
                                                <ProductCard
                                                    key={item.id}
                                                    product={item}
                                                    onSelect={() => setProduct(item)}
                                                    onAdd={() => cart.add(item)}
                                                />
                                            ))}
                                        </section>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="mt-6 rounded-2xl border border-dashed border-[#DCE5F3] bg-white p-10 text-center text-sm text-[#65738A]">
                                Este menú todavía no tiene categorías publicadas.
                            </p>
                        )}
                    </section>
                ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#DCE5F3] bg-white p-10 text-center">
                        <Utensils className="mx-auto text-[#2451C5]" />
                        <p className="mt-3 text-sm text-[#65738A]">
                            Este negocio todavía no tiene menús publicados.
                        </p>
                    </div>
                )}
            </div>
            <OrderDrawer
                lines={cart.lines}
                totalItems={cart.totalItems}
                total={cart.total}
                open={orderOpen}
                businessName={query.data.business.name}
                onChangeQuantity={cart.changeQuantity}
                onOpen={() => setOrderOpen(true)}
                onClose={() => setOrderOpen(false)}
                onCheckout={sendWhatsAppOrder}
            />
            <ProductCustomizeDialog
                key={product?.id ?? 'empty'}
                product={product}
                onClose={() => setProduct(null)}
                onAdd={(selections) => {
                    if (product) cart.add(product, selections)
                }}
            />
        </main>
    )
}
