'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, Utensils } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
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
import type { CartLine } from './features/public-menu/types'

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

function isMissingBusiness(error: unknown) {
    return (
        error instanceof ApiError &&
        (error.status === 404 ||
            error.code === 'BUSINESS_NOT_FOUND' ||
            error.code === 'PUBLIC_BUSINESS_NOT_FOUND')
    )
}

function escapeHtml(value: string) {
    return value.replace(
        /[&<>'"]/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;',
            })[character] ?? character,
    )
}

function getWhatsAppRedirectMarkup(whatsappUrl?: string) {
    const manualUrl = whatsappUrl ? escapeHtml(whatsappUrl) : '#'
    const manualLinkState = whatsappUrl ? '' : ' hidden aria-disabled="true"'

    return `<style>
            :root { color-scheme: light; }
            * { box-sizing: border-box; }
            html, body { min-height: 100%; }
            body {
                margin: 0;
                background: #F5F8FC;
                color: #12234A;
                font-family: "Inter Tight", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .redirect-shell {
                position: relative;
                isolation: isolate;
                display: grid;
                min-height: 100svh;
                place-items: center;
                overflow: hidden;
                padding: 24px;
            }
            .redirect-shell::before,
            .redirect-shell::after {
                position: absolute;
                z-index: -1;
                width: 280px;
                height: 280px;
                border: 1px solid #DCE5F3;
                border-radius: 50%;
                content: '';
            }
            .redirect-shell::before {
                top: -150px;
                right: -85px;
                background: #EAF0FF;
            }
            .redirect-shell::after {
                bottom: -180px;
                left: -105px;
                background: #FFFFFF;
            }
            .redirect-wrap { width: min(100%, 480px); }
            .brand {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 22px;
                color: #12234A;
                font-size: 19px;
                font-weight: 800;
                letter-spacing: -.05em;
            }
            .brand-mark {
                display: grid;
                width: 34px;
                height: 34px;
                place-items: center;
                border-radius: 11px;
                background: #1E40AF;
                color: #FFFFFF;
                box-shadow: 0 8px 18px rgb(30 64 175 / .18);
            }
            .redirect-card {
                padding: 30px 24px 26px;
                border: 1px solid #DCE5F3;
                border-radius: 24px;
                background: #FFFFFF;
                box-shadow: 0 24px 62px rgb(18 35 74 / .11);
                text-align: center;
            }
            .route-scene {
                position: relative;
                height: 154px;
                margin-bottom: 20px;
            }
            .route-line {
                position: absolute;
                top: 77px;
                right: 19%;
                left: 19%;
                height: 2px;
                overflow: hidden;
                background: repeating-linear-gradient(90deg, #AFC2E6 0 10px, transparent 10px 18px);
            }
            .route-line::after {
                position: absolute;
                top: -3px;
                left: -16%;
                width: 14px;
                height: 8px;
                border-radius: 50%;
                background: #2451C5;
                box-shadow: 0 0 0 5px rgb(36 81 197 / .12);
                content: '';
                animation: route-dot 1.9s ease-in-out infinite;
            }
            .package {
                position: absolute;
                top: 40px;
                left: 14%;
                display: grid;
                width: 76px;
                height: 76px;
                place-items: center;
                border: 2px solid #2451C5;
                border-radius: 21px;
                background: #EAF0FF;
                color: #2451C5;
                box-shadow: 0 14px 26px rgb(30 64 175 / .14);
                animation: package-bob 3.1s ease-in-out infinite;
            }
            .whatsapp {
                position: absolute;
                top: 43px;
                right: 14%;
                display: grid;
                width: 70px;
                height: 70px;
                place-items: center;
                border: 6px solid #FFFFFF;
                border-radius: 50%;
                background: #25D366;
                color: #FFFFFF;
                box-shadow: 0 12px 24px rgb(37 211 102 / .22);
                animation: whatsapp-breathe 2.3s ease-in-out infinite;
            }
            .whatsapp::after {
                position: absolute;
                inset: -9px;
                border: 1px solid rgb(37 211 102 / .3);
                border-radius: inherit;
                content: '';
                animation: whatsapp-ring 2.3s ease-out infinite;
            }
            .status {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 0 0 12px;
                color: #16803D;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: .08em;
                text-transform: uppercase;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #25D366;
                box-shadow: 0 0 0 4px rgb(37 211 102 / .12);
            }
            h1 {
                margin: 0;
                color: #10224A;
                font-size: clamp(28px, 7vw, 38px);
                letter-spacing: -.055em;
                line-height: 1.05;
            }
            .copy {
                max-width: 34ch;
                margin: 13px auto 0;
                color: #65738A;
                font-size: 15px;
                line-height: 1.65;
            }
            .progress {
                position: relative;
                height: 5px;
                margin: 25px auto 0;
                overflow: hidden;
                border-radius: 999px;
                background: #E8EEF6;
            }
            .progress::after {
                position: absolute;
                top: 0;
                bottom: 0;
                left: -35%;
                width: 35%;
                border-radius: inherit;
                background: #2451C5;
                content: '';
                animation: progress 1.8s ease-in-out infinite;
            }
            .manual-link {
                display: inline-flex;
                min-height: 44px;
                align-items: center;
                justify-content: center;
                margin-top: 18px;
                padding: 0 16px;
                border: 1px solid #C9D6ED;
                border-radius: 12px;
                color: #1E40AF;
                font-size: 14px;
                font-weight: 800;
                text-decoration: none;
            }
            .manual-link:hover { border-color: #AFC2E6; background: #F8FAFE; }
            .manual-link[hidden] { display: none; }
            .footnote { margin: 16px 0 0; color: #8996A9; font-size: 12px; }
            @keyframes route-dot {
                0% { transform: translateX(0); opacity: 0; }
                15%, 75% { opacity: 1; }
                100% { transform: translateX(700%); opacity: 0; }
            }
            @keyframes package-bob {
                0%, 100% { transform: translateY(2px) rotate(-2deg); }
                50% { transform: translateY(-7px) rotate(2deg); }
            }
            @keyframes whatsapp-breathe {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.06); }
            }
            @keyframes whatsapp-ring {
                0%, 65%, 100% { opacity: 0; transform: scale(.8); }
                30% { opacity: 1; transform: scale(1); }
            }
            @keyframes progress {
                0% { transform: translateX(0); }
                100% { transform: translateX(390%); }
            }
            @media (max-width: 420px) {
                .redirect-shell {
                    min-height: 100svh;
                    padding: max(14px, env(safe-area-inset-top)) 12px max(14px, env(safe-area-inset-bottom));
                }
                .redirect-wrap { width: 100%; }
                .brand { margin-bottom: 18px; }
                .redirect-card {
                    padding: 30px 22px 28px;
                    border-radius: 22px;
                }
                .route-scene { height: 174px; margin-bottom: 22px; }
                .package {
                    top: 48px;
                    left: 6%;
                    width: 82px;
                    height: 82px;
                }
                .package svg { width: 48px; height: 48px; }
                .whatsapp {
                    top: 51px;
                    right: 6%;
                    width: 78px;
                    height: 78px;
                }
                .whatsapp svg { width: 38px; height: 38px; }
                .route-line { top: 89px; right: 23%; left: 23%; }
                h1 { font-size: clamp(30px, 8.8vw, 36px); }
                .copy { font-size: 16px; line-height: 1.55; }
                .progress { height: 6px; margin-top: 28px; }
                .manual-link { width: 100%; min-height: 50px; margin-top: 20px; }
                .footnote { margin-top: 14px; line-height: 1.5; }
            }
            @media (prefers-reduced-motion: reduce) {
                .route-line::after, .package, .whatsapp, .whatsapp::after, .progress::after { animation: none; }
            }
        </style>
        <main class="redirect-shell" aria-live="polite">
            <div class="redirect-wrap">
                <div class="brand" aria-label="Pedilo">
                    <span class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                            <path d="M6 4.5h12l-1.2 4.2H7.2L6 4.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                            <path d="M7.4 8.7v8.8c0 1.1.9 2 2 2h5.2c1.1 0 2-.9 2-2V8.7M9.5 12.2h5M9.5 15.2h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </span>
                    pedilo
                </div>
                <section class="redirect-card" role="status" aria-label="Preparando la redirección a WhatsApp">
                    <div class="route-scene" aria-hidden="true">
                        <div class="route-line"></div>
                        <div class="package">
                            <svg viewBox="0 0 48 48" width="42" height="42" fill="none">
                                <path d="m9 16 15-7 15 7-15 7-15-7Z" fill="#DCE8FF" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" />
                                <path d="M9 16v16l15 8 15-8V16M24 23v17M16.5 12.5l15 7" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" />
                            </svg>
                        </div>
                        <div class="whatsapp">
                            <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
                                <path d="M20 11.6a8 8 0 0 1-11.8 7l-3.2 1 1-3.1A8 8 0 1 1 20 11.6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                                <path d="M9.2 8.6c.2-.4.4-.4.7-.4h.4c.2 0 .3.1.4.4l.6 1.4c.1.3.1.5-.1.7l-.5.6c.5 1 1.2 1.7 2.2 2.2l.6-.5c.2-.2.4-.2.7-.1l1.4.6c.3.1.4.2.4.4v.4c0 .3 0 .5-.4.7-.4.2-1.3.4-2.1.1-1.2-.4-2.4-1.1-3.3-2-.9-.9-1.6-2.1-2-3.3-.3-.8-.1-1.7.1-2.1Z" fill="currentColor" />
                            </svg>
                        </div>
                    </div>
                    <p class="status"><span class="status-dot"></span>Pedido listo</p>
                    <h1>¡Tu pedido va en camino!</h1>
                    <p class="copy">Abriendo WhatsApp para que continúes con el negocio.</p>
                    <div class="progress" aria-hidden="true"></div>
                    <a id="manual-whatsapp-link" class="manual-link" href="${manualUrl}" target="_self"${manualLinkState}>Abrir WhatsApp manualmente</a>
                    <p class="footnote">Si no se abre automáticamente, usa el botón para continuar.</p>
                </section>
            </div>
        </main>`
}

export default function PublicMenuPage({ slug }: { slug: string }) {
    const query = useBusinessMenu(slug)
    const cart = useOrderCart()
    const [menuId, setMenuId] = useState('')
    const [activeCategory, setActiveCategory] = useState('')
    const [product, setProduct] = useState<PublicProduct | null>(null)
    const [editingLineKey, setEditingLineKey] = useState<string | null>(null)
    const [editingSelections, setEditingSelections] = useState<CartLine['selections']>([])
    const [orderOpen, setOrderOpen] = useState(false)
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
    const [orderError, setOrderError] = useState<string | null>(null)
    const [orderConfirmed, setOrderConfirmed] = useState(false)
    const [manualWhatsAppUrl, setManualWhatsAppUrl] = useState<string | null>(null)
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
        const missingBusiness = isMissingBusiness(query.error)
        const friendlyError = getUserFriendlyError(query.error, {
            fallback: {
                title: 'No pudimos cargar el menú',
                description: 'Inténtalo nuevamente en unos momentos.',
            },
        })

        if (missingBusiness) {
            return (
                <main className="grid min-h-screen place-items-center bg-[#F5F8FC] px-5 py-10 sm:px-6">
                    <section
                        aria-labelledby="business-not-found-title"
                        className="w-full max-w-lg rounded-[28px] border border-[#DCE5F3] bg-white p-7 text-center shadow-[0_22px_60px_rgb(16_34_74_/_0.09)] sm:p-10"
                    >
                        <div className="mx-auto flex h-40 w-full max-w-[240px] items-center justify-center text-[#2451C5]">
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 240 160"
                                className="h-full w-full"
                                fill="none"
                            >
                                <path
                                    d="M42 137h156"
                                    stroke="#DCE5F3"
                                    strokeLinecap="round"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M58 137V66h124v71"
                                    fill="#F5F8FC"
                                    stroke="#2451C5"
                                    strokeLinejoin="round"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M50 66h140l-10-27H60L50 66Z"
                                    fill="#EAF0FF"
                                    stroke="#2451C5"
                                    strokeLinejoin="round"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M50 66c0 9 8 16 18 16s18-7 18-16c0 9 8 16 18 16s18-7 18-16c0 9 8 16 18 16s18-7 18-16c0 9 8 16 18 16s18-7 18-16"
                                    fill="#DCE8FF"
                                    stroke="#2451C5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M91 137V99c0-5 4-9 9-9h20c5 0 9 4 9 9v38"
                                    fill="#FFF"
                                    stroke="#2451C5"
                                    strokeLinejoin="round"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M151 99h16M151 112h16"
                                    stroke="#9EB5E8"
                                    strokeLinecap="round"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M174 28c4-5 10-7 16-5M184 15c2-5 7-8 12-8"
                                    stroke="#A9BDEB"
                                    strokeLinecap="round"
                                    strokeWidth="4"
                                />
                                <circle cx="184" cy="25" r="3" fill="#A9BDEB" />
                            </svg>
                        </div>
                        <h1
                            id="business-not-found-title"
                            className="mt-6 font-display text-3xl leading-tight tracking-[-0.04em] text-[#10224A] sm:text-4xl"
                        >
                            Este menú ya no está disponible
                        </h1>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#65738A] sm:text-base">
                            Parece que el enlace cambió o el negocio dejó de publicar su menú en
                            Pedilo. Ponte en contacto directamente con el negocio para confirmar su
                            nuevo enlace o disponibilidad.
                        </p>
                    </section>
                </main>
            )
        }

        return (
            <main className="grid min-h-screen place-items-center bg-[#F5F8FC] p-6 text-center">
                <div>
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF0FF] text-[#2451C5]">
                        <AlertCircle />
                    </div>
                    <h1 className="mt-5 font-display text-3xl text-[#10224A]">
                        {friendlyError.title}
                    </h1>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[#65738A]">
                        {friendlyError.description}
                    </p>
                    {query.error instanceof ApiError && query.error.status !== 404 && (
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
        let whatsappWindow: Window | null = null
        try {
            whatsappWindow = window.open('about:blank', '_blank')
            if (whatsappWindow?.document) {
                whatsappWindow.document.title = 'Continuando en WhatsApp · Pedilo'
                whatsappWindow.document.body.innerHTML = getWhatsAppRedirectMarkup()
            }
        } catch {
            whatsappWindow?.close()
            whatsappWindow = null
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

            let redirected = false
            if (whatsappWindow?.document?.body) {
                try {
                    whatsappWindow.document.body.innerHTML = getWhatsAppRedirectMarkup(whatsappUrl)
                    whatsappWindow.location.href = whatsappUrl
                    redirected = true
                } catch {
                    whatsappWindow.close()
                    whatsappWindow = null
                }
            }
            if (!redirected) {
                setManualWhatsAppUrl(whatsappUrl)
            }

            cart.clear()
            setOrderOpen(false)
            setOrderConfirmed(true)
        } catch (error) {
            whatsappWindow?.close()
            setOrderError(
                getUserFriendlyError(error, {
                    fallback: {
                        title: 'No pudimos crear tu pedido',
                        description: 'No pudimos crear tu pedido. Inténtalo nuevamente.',
                    },
                }).description,
            )
            setManualWhatsAppUrl(null)
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
                                                    onSelect={() => {
                                                        setEditingLineKey(null)
                                                        setEditingSelections([])
                                                        setProduct(item)
                                                    }}
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
                onEditLine={(line) => {
                    setEditingLineKey(line.key)
                    setEditingSelections(line.selections)
                    setProduct(line.product)
                }}
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
                key={`${product?.id ?? 'empty'}:${editingLineKey ?? 'new'}`}
                product={product}
                initialSelections={editingSelections}
                editing={editingLineKey !== null}
                onClose={() => {
                    setProduct(null)
                    setEditingLineKey(null)
                    setEditingSelections([])
                }}
                onAdd={(selections) => {
                    if (!product) return
                    if (editingLineKey) cart.edit(editingLineKey, selections)
                    else cart.add(product, selections)
                }}
            />
            {orderConfirmed && (
                <OrderConfirmationModal
                    onClose={() => {
                        setOrderConfirmed(false)
                        setManualWhatsAppUrl(null)
                    }}
                    whatsappUrl={manualWhatsAppUrl}
                />
            )}
        </main>
    )
}
