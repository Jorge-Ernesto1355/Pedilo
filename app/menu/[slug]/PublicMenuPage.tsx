'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, Utensils } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { CategoryTabs } from './features/public-menu/CategoryTabs'
import { MenuHeader } from './features/public-menu/MenuHeader'
import { OrderDrawer } from './features/public-menu/OrderDrawer'
import { ProductCard } from './features/public-menu/ProductCard'
import { ProductCustomizeDialog } from './features/public-menu/ProductCustomizeDialog'
import { OrderConfirmationModal } from './features/public-menu/OrderConfirmationModal'
import { useBusinessMenu } from './features/public-menu/useBusinessMenu'
import { useOrderCart } from './features/public-menu/useOrderCart'
import { createPublicOrder } from '@/src/lib/api/orderApi'
import {
    createWhatsAppOrderMessage,
    normalizeBusinessWhatsAppNumber,
} from './features/public-menu/whatsapp'
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
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
    const [orderError, setOrderError] = useState<string | null>(null)
    const [orderConfirmed, setOrderConfirmed] = useState(false)
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
    async function sendWhatsAppOrder(customerName: string, customerPhone: string, notes: string) {
        const businessWhatsAppNumber = normalizeBusinessWhatsAppNumber(
            catalog.business.whatsappNumber,
        )

        if (!businessWhatsAppNumber) {
            setOrderError('Este negocio todavía no tiene un número de WhatsApp válido.')
            return
        }

        setIsSubmittingOrder(true)
        setOrderError(null)

        // Reserve a blank tab synchronously so the eventual WhatsApp tab is
        // not blocked by the browser after the asynchronous order request.
        const whatsappWindow = window.open('about:blank', '_blank')
        if (whatsappWindow?.document) {
            whatsappWindow.document.title = 'Preparando tu pedido · Pedilo'
            whatsappWindow.document.body.innerHTML = `
                <style>
                    :root { color-scheme: dark; }
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        min-height: 100vh;
                        overflow: hidden;
                        background: #071735;
                        color: #f8fbff;
                        font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
                    }
                    .order-loading {
                        min-height: 100vh;
                        display: grid;
                        place-items: center;
                        padding: 24px;
                        position: relative;
                        isolation: isolate;
                    }
                    .order-loading::before,
                    .order-loading::after {
                        content: '';
                        position: absolute;
                        width: 360px;
                        height: 360px;
                        border-radius: 50%;
                        filter: blur(8px);
                        opacity: .36;
                        z-index: -1;
                    }
                    .order-loading::before {
                        top: -170px;
                        right: -100px;
                        background: #2451c5;
                    }
                    .order-loading::after {
                        bottom: -220px;
                        left: -120px;
                        background: #0c9f72;
                    }
                    .loading-card {
                        width: min(100%, 440px);
                        text-align: center;
                        padding: 42px 28px 34px;
                        border: 1px solid rgba(190, 215, 255, .18);
                        border-radius: 28px;
                        background: rgba(16, 34, 74, .76);
                        box-shadow: 0 30px 90px rgba(0, 0, 0, .28), inset 0 1px rgba(255,255,255,.08);
                        backdrop-filter: blur(18px);
                    }
                    .stage {
                        height: 148px;
                        display: grid;
                        place-items: center;
                        position: relative;
                        margin-bottom: 25px;
                    }
                    .orbit {
                        position: absolute;
                        width: 132px;
                        height: 132px;
                        border: 1px solid rgba(154, 190, 255, .27);
                        border-radius: 50%;
                        transform: rotate(-22deg) scaleX(1.55);
                        animation: orbit 2.5s ease-in-out infinite;
                    }
                    .orbit::after {
                        content: '';
                        position: absolute;
                        top: 7px;
                        left: 50%;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: #71e8bb;
                        box-shadow: 0 0 18px #71e8bb;
                    }
                    .pulse {
                        position: absolute;
                        width: 82px;
                        height: 82px;
                        border: 1px solid rgba(113, 232, 187, .45);
                        border-radius: 24px;
                        animation: pulse 1.9s ease-out infinite;
                    }
                    .envelope {
                        position: relative;
                        width: 70px;
                        height: 52px;
                        border-radius: 12px;
                        background: linear-gradient(145deg, #ffffff, #dceaff);
                        box-shadow: 0 14px 28px rgba(0,0,0,.22);
                        transform: rotate(-5deg);
                        animation: float 2.4s ease-in-out infinite;
                    }
                    .envelope::before,
                    .envelope::after {
                        content: '';
                        position: absolute;
                        top: 8px;
                        width: 43px;
                        height: 2px;
                        background: #85a4d7;
                    }
                    .envelope::before { left: 2px; transform: rotate(34deg); transform-origin: left; }
                    .envelope::after { right: 2px; transform: rotate(-34deg); transform-origin: right; }
                    .check {
                        position: absolute;
                        right: -9px;
                        bottom: -9px;
                        width: 28px;
                        height: 28px;
                        display: grid;
                        place-items: center;
                        border: 3px solid #10224a;
                        border-radius: 50%;
                        background: #25d366;
                        color: #06351f;
                        font-size: 16px;
                        font-weight: 900;
                    }
                    .eyebrow {
                        margin: 0 0 10px;
                        color: #71e8bb;
                        font-size: 11px;
                        font-weight: 800;
                        letter-spacing: .18em;
                        text-transform: uppercase;
                    }
                    h1 { margin: 0; font-size: clamp(26px, 6vw, 34px); letter-spacing: -.045em; }
                    .copy { margin: 12px auto 0; max-width: 31ch; color: #afc0dc; font-size: 14px; line-height: 1.6; }
                    .progress {
                        height: 5px;
                        margin: 27px auto 0;
                        overflow: hidden;
                        border-radius: 99px;
                        background: rgba(255,255,255,.12);
                    }
                    .progress span {
                        display: block;
                        width: 42%;
                        height: 100%;
                        border-radius: inherit;
                        background: linear-gradient(90deg, #71e8bb, #25d366);
                        box-shadow: 0 0 15px rgba(113,232,187,.7);
                        animation: progress 1.7s cubic-bezier(.4,0,.2,1) infinite;
                    }
                    .footnote { margin: 15px 0 0; color: #7184a7; font-size: 11px; }
                    @keyframes orbit { 0%,100% { transform: rotate(-22deg) scaleX(1.55); } 50% { transform: rotate(22deg) scaleX(1.55); } }
                    @keyframes pulse { 0% { opacity: .7; transform: scale(.78); } 70%,100% { opacity: 0; transform: scale(1.35); } }
                    @keyframes float { 0%,100% { transform: translateY(3px) rotate(-5deg); } 50% { transform: translateY(-7px) rotate(3deg); } }
                    @keyframes progress { 0% { transform: translateX(-120%); } 100% { transform: translateX(290%); } }
                    @media (prefers-reduced-motion: reduce) {
                        .orbit, .pulse, .envelope, .progress span { animation: none; }
                    }
                </style>
                <main class="order-loading" aria-live="polite">
                    <section class="loading-card" role="status" aria-label="Preparando tu pedido">
                        <div class="stage" aria-hidden="true">
                            <div class="orbit"></div>
                            <div class="pulse"></div>
                            <div class="envelope"><span class="check">✓</span></div>
                        </div>
                        <p class="eyebrow">Un momento</p>
                        <h1>Estamos preparando tu pedido</h1>
                        <p class="copy">Estamos confirmando los detalles para enviarlos al negocio por WhatsApp.</p>
                        <div class="progress" aria-hidden="true"><span></span></div>
                        <p class="footnote">No cierres esta ventana</p>
                    </section>
                </main>
            `
        }

        try {
            await createPublicOrder(catalog.business.id, {
                customer: { name: customerName, phone: customerPhone },
                items: cart.lines.map((line) => ({
                    productId: line.product.id,
                    quantity: line.quantity,
                    optionIds: line.selections.map((selection) => selection.id),
                })),
                ...(notes ? { notes } : {}),
            })

            const lines = cart.lines.map(
                (line) =>
                    `${line.quantity}x ${line.product.name} — $${(line.unitPrice * line.quantity).toLocaleString('es-MX')}`,
            )
            const message = createWhatsAppOrderMessage({
                businessName: catalog.business.name,
                customerName,
                customerPhone,
                lines,
                total: `$${cart.total.toLocaleString('es-MX')}`,
                notes,
            })
            const whatsappUrl = `https://wa.me/${businessWhatsAppNumber}?text=${encodeURIComponent(message)}`

            if (whatsappWindow) {
                whatsappWindow.location.href = whatsappUrl
            } else {
                // If the browser blocks the new tab, keep the customer in the
                // menu and let the confirmation modal explain what happened.
                // The order itself was already created successfully.
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
            }

            cart.clear()
            setOrderOpen(false)
            setOrderConfirmed(true)
        } catch (error) {
            whatsappWindow?.close()
            setOrderError(
                error instanceof ApiError && error.message
                    ? error.message
                    : 'No pudimos crear tu pedido. Inténtalo de nuevo.',
            )
        } finally {
            setIsSubmittingOrder(false)
        }
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
                onClose={() => {
                    setOrderOpen(false)
                    setOrderError(null)
                }}
                onCheckout={(customerName, customerPhone, notes) => {
                    void sendWhatsAppOrder(customerName, customerPhone, notes)
                }}
                isSubmitting={isSubmittingOrder}
                orderError={orderError}
            />
            <ProductCustomizeDialog
                key={product?.id ?? 'empty'}
                product={product}
                onClose={() => setProduct(null)}
                onAdd={(selections) => {
                    if (product) cart.add(product, selections)
                }}
            />
            {orderConfirmed && <OrderConfirmationModal onClose={() => setOrderConfirmed(false)} />}
        </main>
    )
}
