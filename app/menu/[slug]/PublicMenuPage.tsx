/* eslint-disable @next/next/no-img-element -- Product media comes from the public API and is not configured for next/image. */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowLeft, SearchX, Store, Utensils } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { createPublicOrder } from '@/src/lib/api/orderApi'
import { normalizePhone } from '@/src/lib/validation/phone'
import { CategoryTabs } from './features/public-menu/CategoryTabs'
import { MenuHeader } from './features/public-menu/MenuHeader'
import { OrderDrawer } from './features/public-menu/OrderDrawer'
import { OrderConfirmationModal } from './features/public-menu/OrderConfirmationModal'
import { ProductCard } from './features/public-menu/ProductCard'
import { ProductCustomizeDialog } from './features/public-menu/ProductCustomizeDialog'
import { useBusinessMenu } from './features/public-menu/useBusinessMenu'
import { useOrderCart } from './features/public-menu/useOrderCart'
import {
    createWhatsAppOrderMessage,
    normalizeBusinessWhatsAppNumber,
} from './features/public-menu/whatsapp'
import type { PublicProduct } from './features/public-menu/publicCatalog.types'

type FlyingProduct = {
    animationId: number
    id: string
    imageUrl: string | null
    from: { left: number; top: number; size: number }
    to: { left: number; top: number; width: number; height: number } | null
}

function FlyingProductAnimation({
    product,
    onComplete,
}: {
    product: FlyingProduct
    onComplete: () => void
}) {
    const reducedMotion = useReducedMotion()
    const targetSize = 30

    if (!product.to) return null

    const fromCenter = {
        left: product.from.left + product.from.size / 2,
        top: product.from.top + product.from.size / 2,
    }
    const targetCenter = {
        left: product.to.left + product.to.width / 2,
        top: product.to.top + product.to.height / 2,
    }
    const deltaX = targetCenter.left - fromCenter.left
    const deltaY = targetCenter.top - fromCenter.top

    return (
        <motion.div
            initial={{
                left: product.from.left,
                top: product.from.top,
                opacity: 0.95,
                scale: 1,
                x: 0,
                y: 0,
                rotate: 0,
            }}
            animate={
                reducedMotion
                    ? { opacity: 0 }
                    : {
                          x: [0, deltaX * 0.46, deltaX],
                          y: [0, deltaY * 0.46 - 26, deltaY],
                          opacity: [0.95, 0.9, 0.12],
                          scale: [1, 0.78, targetSize / product.from.size],
                          rotate: [0, -7, 0],
                      }
            }
            transition={{
                duration: reducedMotion ? 0.05 : 0.48,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.55, 1],
            }}
            onAnimationComplete={onComplete}
            style={{ width: product.from.size, height: product.from.size }}
            className="pointer-events-none fixed z-[80] overflow-hidden rounded-xl bg-[#EEF3FF] shadow-[0_10px_24px_rgba(19,49,117,.2)] will-change-transform"
            aria-hidden="true"
        >
            {product.imageUrl ? (
                <img width={112} height={112} src={product.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                <Utensils className="m-auto h-1/2 w-1/2 text-[#2451C5]" />
            )}
        </motion.div>
    )
}

function LoadingMenu() {
    return (
        <main id="main-content" className="min-h-screen bg-[#F5F8FC] p-4 sm:p-8">
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

function MissingBusinessState() {
    const reducedMotion = useReducedMotion()

    return (
        <main
            id="main-content"
            className="relative grid min-h-screen place-items-center overflow-hidden bg-[#F5F8FC] px-5 py-12 text-center text-[#12234A] sm:px-8"
        >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                    animate={reducedMotion ? undefined : { rotate: 360 }}
                    transition={reducedMotion ? undefined : { duration: 28, ease: 'linear', repeat: Infinity }}
                    className="absolute left-1/2 top-[18%] size-[min(76vw,30rem)] -translate-x-1/2 rounded-full border border-dashed border-[#BFD0F5]"
                />
                <motion.div
                    animate={reducedMotion ? undefined : { y: [0, -12, 0], opacity: [0.35, 0.7, 0.35] }}
                    transition={reducedMotion ? undefined : { duration: 4.5, ease: 'easeInOut', repeat: Infinity }}
                    className="absolute right-[12%] top-[22%] size-3 rounded-full bg-[#2451C5] shadow-[0_0_0_8px_rgba(36,81,197,.08)]"
                />
                <motion.div
                    animate={reducedMotion ? undefined : { y: [0, 10, 0], opacity: [0.25, 0.6, 0.25] }}
                    transition={reducedMotion ? undefined : { duration: 5.5, ease: 'easeInOut', repeat: Infinity, delay: 0.6 }}
                    className="absolute bottom-[24%] left-[13%] size-2 rounded-full bg-[#6D8EE2] shadow-[0_0_0_7px_rgba(109,142,226,.1)]"
                />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <Link href="/" className="mx-auto inline-flex items-center gap-2.5 text-lg font-bold tracking-[-.04em] text-[#10224A]">
                    <Image src="/logoPediloSinfondo.png" alt="Logo de Pedilo" width={42} height={42} className="size-10 object-contain" priority />
                    <span>pedilo</span>
                </Link>

                <motion.div
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.82, y: 18 }}
                    animate={reducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="relative mx-auto mt-12 grid size-32 place-items-center rounded-[2.25rem] border border-[#DCE5F3] bg-white shadow-[0_24px_65px_-30px_rgba(19,49,117,.45)] sm:size-36"
                >
                    <motion.div
                        animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], rotate: [0, -3, 3, 0] }}
                        transition={reducedMotion ? undefined : { duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.35 }}
                        className="grid size-20 place-items-center rounded-3xl bg-[#EAF0FF] text-[#2451C5] sm:size-24"
                    >
                        <Store className="size-10 stroke-[1.7] sm:size-11" aria-hidden="true" />
                    </motion.div>
                    <motion.span
                        initial={reducedMotion ? false : { scale: 0, rotate: -20 }}
                        animate={reducedMotion ? undefined : { scale: 1, rotate: 0 }}
                        transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 16 }}
                        className="absolute -right-2 -top-2 grid size-10 place-items-center rounded-2xl border-4 border-[#F5F8FC] bg-[#10224A] text-white shadow-lg"
                    >
                        <SearchX className="size-5" aria-hidden="true" />
                    </motion.span>
                </motion.div>

                <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ delay: 0.16, duration: 0.45 }}
                >
                    <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#2451C5]">Enlace no disponible</p>
                    <h1 className="mt-3 font-display text-3xl leading-tight tracking-[-.055em] text-[#10224A] sm:text-4xl">
                        Este negocio no existe aquí
                    </h1>
                    <p className="mx-auto mt-4 max-w-sm text-[15px] leading-7 text-[#65738A]">
                        El enlace pudo haber cambiado o el menú dejó de estar publicado. Regresa al inicio y encuentra tu próximo pedido.
                    </p>
                    <Link
                        href="/"
                        className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-5 text-sm font-bold text-white shadow-[0_12px_25px_-12px_rgba(30,64,175,.75)] transition hover:bg-[#17358F] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/20"
                    >
                        <ArrowLeft className="size-4" aria-hidden="true" />
                        Volver a Pedilo
                    </Link>
                </motion.div>
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
    const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
    const [orderError, setOrderError] = useState<string | null>(null)
    const [cartPulse, setCartPulse] = useState(0)
    const [flyingProducts, setFlyingProducts] = useState<FlyingProduct[]>([])
    const cartTargetRef = useRef<HTMLButtonElement>(null)
    const animationIdRef = useRef(0)
    const reducedMotion = useReducedMotion()
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

    useEffect(() => {
        if (reducedMotion) return
        const pendingFlights = flyingProducts.filter((flight) => !flight.to)
        if (pendingFlights.length === 0) return

        const frame = window.requestAnimationFrame(() => {
            const target = cartTargetRef.current?.getBoundingClientRect()
            if (!target) {
                setFlyingProducts((current) =>
                    current.filter((flight) => flight.to || !pendingFlights.includes(flight)),
                )
                return
            }
            setFlyingProducts((current) =>
                current.map((flight) =>
                    flight.to
                        ? flight
                        : {
                              ...flight,
                              to: {
                                  left: target.left,
                                  top: target.top,
                                  width: target.width,
                                  height: target.height,
                              },
                          },
                ),
            )
        })
        return () => window.cancelAnimationFrame(frame)
    }, [flyingProducts, reducedMotion])

    if (query.isLoading) return <LoadingMenu />
    if (query.isError || !query.data) {
        const notFound =
            query.error instanceof ApiError &&
            (query.error.status === 404 || query.error.code === 'PUBLIC_BUSINESS_NOT_FOUND')
        if (notFound) return <MissingBusinessState />

        return (
            <main id="main-content" className="grid min-h-screen place-items-center bg-[#F5F8FC] p-6 text-center">
                <div>
                    <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF0FF] text-[#2451C5]">
                        <AlertCircle />
                    </div>
                    <h1 className="mt-5 font-display text-3xl text-[#10224A]">
                        No pudimos cargar el menú
                    </h1>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[#65738A]">
                        Intenta nuevamente en unos momentos.
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

    function getProductImageElement(productId: string) {
        return Array.from(document.querySelectorAll<HTMLElement>('[data-product-image]')).find(
            (element) => element.dataset.productImage === productId,
        )
    }

    function finishFlyingProduct(animationId: number) {
        setFlyingProducts((current) =>
            current.filter((flight) => flight.animationId !== animationId),
        )
        setCartPulse((current) => current + 1)
    }

    function addProductToCart(
        productToAdd: PublicProduct,
        selections: Parameters<typeof cart.add>[1] = [],
        sourceElement?: HTMLElement | null,
    ) {
        cart.add(productToAdd, selections)
        const source = sourceElement ?? getProductImageElement(productToAdd.id)
        if (!source || reducedMotion) {
            setCartPulse((current) => current + 1)
            return
        }

        const sourceRect = source.getBoundingClientRect()
        const animationId = animationIdRef.current++
        setFlyingProducts((current) => [
            ...current,
            {
                animationId,
                id: productToAdd.id,
                imageUrl: productToAdd.imageUrl,
                from: { left: sourceRect.left, top: sourceRect.top, size: sourceRect.width },
                to: null,
            },
        ])
    }

    async function sendWhatsAppOrder(customerName: string, customerPhone: string, notes: string) {
        if (orderStatus === 'submitting') return
        const businessWhatsAppNumber = normalizeBusinessWhatsAppNumber(
            catalog.business.whatsappNumber,
        )
        if (!businessWhatsAppNumber) {
            setOrderError('Este negocio todavía no tiene un WhatsApp configurado.')
            return
        }

        const lines = cart.lines.map(
            (line) =>
                `${line.quantity}x ${line.product.name} — $${(line.unitPrice * line.quantity).toLocaleString('es-MX')}`,
        )
        setOrderError(null)
        setOrderStatus('submitting')
        // Reserve the tab while the order is being created. `noopener` can make
        // the returned window reference unusable, leaving the tab on about:blank.
        const whatsappWindow = window.open('about:blank', '_blank')

        try {
            await createPublicOrder(catalog.business.id, {
                customer: { name: customerName, phone: normalizePhone(customerPhone) },
                items: cart.lines.map((line) => ({
                    productId: line.product.id,
                    quantity: line.quantity,
                    optionIds: line.selections.map((selection) => selection.id),
                })),
                ...(notes ? { notes } : {}),
            })

            const message = createWhatsAppOrderMessage({
                businessName: catalog.business.name,
                customerName,
                customerPhone,
                lines,
                total: `$${cart.total.toLocaleString('es-MX')}`,
                notes,
            })
            const whatsappUrl = `https://wa.me/${businessWhatsAppNumber}?text=${encodeURIComponent(message)}`

            if (whatsappWindow && !whatsappWindow.closed) {
                whatsappWindow.opener = null
                whatsappWindow.location.replace(whatsappUrl)
            } else {
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
            }

            cart.clear()
            setOrderOpen(false)
            setOrderStatus('success')
        } catch (error) {
            whatsappWindow?.close()
            setOrderStatus('idle')
            setOrderError(
                error instanceof ApiError
                    ? error.message
                    : 'No pudimos crear tu pedido. Inténtalo nuevamente.',
            )
        }
    }

    return (
        <main id="main-content" className="min-h-screen bg-[#F5F8FC] text-[#12234A]">
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
                                                    onAdd={(sourceElement) =>
                                                        addProductToCart(item, [], sourceElement)
                                                    }
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
                isSubmitting={orderStatus === 'submitting'}
                orderError={orderError}
                cartTargetRef={cartTargetRef}
                cartPulse={cartPulse}
            />
            <ProductCustomizeDialog
                key={product?.id ?? 'empty'}
                product={product}
                onClose={() => setProduct(null)}
                onAdd={(selections) => {
                    if (product) addProductToCart(product, selections)
                }}
            />
            {flyingProducts.map((flight) => (
                <FlyingProductAnimation
                    key={flight.animationId}
                    product={flight}
                    onComplete={() => finishFlyingProduct(flight.animationId)}
                />
            ))}
            {orderStatus === 'success' && (
                <OrderConfirmationModal onClose={() => setOrderStatus('idle')} />
            )}
        </main>
    )
}
