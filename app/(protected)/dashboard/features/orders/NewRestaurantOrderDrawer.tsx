'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    AlertCircle,
    ArrowLeft,
    Check,
    LoaderCircle,
    Minus,
    Plus,
    ShoppingBag,
    X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'
import { useAuthStore } from '@/store/authStore'
import type {
    PublicCatalog,
    PublicMenu,
    PublicProduct,
} from '@/app/menu/[slug]/features/public-menu/publicCatalog.types'
import { CategoryTabs } from '@/app/menu/[slug]/features/public-menu/CategoryTabs'
import { ProductCard } from '@/app/menu/[slug]/features/public-menu/ProductCard'
import { ProductCustomizeDialog } from '@/app/menu/[slug]/features/public-menu/ProductCustomizeDialog'
import { useOrderCart } from '@/app/menu/[slug]/features/public-menu/useOrderCart'
import type { CartSelection } from '@/app/menu/[slug]/features/public-menu/types'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'
import { useCreateRestaurantOrder } from './useCreateRestaurantOrder'
import type { Order } from '@/src/lib/api/order-types'
import { getMenus } from '@/app/(protected)/create-menu/features/category-management/menuApi'
import { getProductsPaged } from '@/app/(protected)/create-menu/features/product-management/productApi'

const CUSTOMER_NAME_MAX_LENGTH = 80
const CUSTOMER_NOTES_MAX_LENGTH = 500

function useRestaurantCatalog(enabled: boolean) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const catalog = useQuery<PublicCatalog>({
        queryKey: ['restaurant-order-catalog', businessId],
        queryFn: async () => {
            if (!businessId) throw new Error('No encontramos el negocio del usuario.')
            const [menus, productsResponse] = await Promise.all([
                getMenus(),
                getProductsPaged(businessId, {
                    page: 1,
                    limit: 100,
                    sortBy: 'sortOrder',
                    sortOrder: 'asc',
                }),
            ])
            const products = productsResponse.products
            const productsById = new Map(products.map((product) => [product.id, product]))
            const normalizedMenus: PublicMenu[] = menus.map((menu) => ({
                id: menu.id,
                businessId,
                name: menu.name,
                description: menu.description,
                isActive: menu.isActive,
                categories: menu.categories.map((category) => ({
                    id: category.id,
                    businessId,
                    menuId: menu.id,
                    name: category.name,
                    description: category.description,
                    sortOrder: category.sortOrder,
                    isActive: category.isActive,
                    products: (category.products.length > 0
                        ? category.products
                        : products
                              .filter((product) => product.categoryId === category.id)
                              .map((product) => ({
                                  id: product.id,
                                  categoryId: product.categoryId,
                                  name: product.name,
                                  price: product.price,
                              }))
                    ).map((menuProduct) => {
                        const product = productsById.get(menuProduct.id)
                        return {
                            id: menuProduct.id,
                            businessId,
                            categoryId:
                                product?.categoryId ?? menuProduct.categoryId ?? category.id,
                            name: product?.name ?? menuProduct.name,
                            description: product?.description ?? null,
                            price: Number(product?.price ?? menuProduct.price ?? 0),
                            imageUrl: product?.imageUrl ?? null,
                            sortOrder: product?.sortOrder ?? 0,
                            isAvailable: product?.isAvailable ?? product?.active !== false,
                            optionGroups: (product?.optionGroups ??
                                []) as PublicProduct['optionGroups'],
                        }
                    }),
                })),
            }))
            return {
                business: {
                    id: businessId,
                    name: 'Tu negocio',
                    slug: '',
                    description: null,
                    logoUrl: null,
                    logoBlurUrl: null,
                    coverUrl: null,
                    coverBlurUrl: null,
                    ubication: null,
                    ubicationMaps: null,
                    businessSchedule: null,
                },
                menus: normalizedMenus,
            } satisfies PublicCatalog
        },
        enabled: enabled && Boolean(businessId),
        staleTime: 5 * 60 * 1000,
    })
    return {
        ...catalog,
        isLoading: catalog.isLoading,
        error: catalog.error,
    }
}

function orderErrorMessage(error: unknown) {
    return getUserFriendlyError(error, {
        fallback: {
            title: 'No pudimos crear la orden',
            description: 'Revisa los datos e inténtalo nuevamente.',
        },
    }).description
}

export function NewRestaurantOrderDrawer({
    open,
    onClose,
    onViewOrder,
}: {
    open: boolean
    onClose: () => void
    onViewOrder: (order: Order) => void
}) {
    const catalog = useRestaurantCatalog(open)
    const router = useRouter()
    const cart = useOrderCart()
    const mutation = useCreateRestaurantOrder()
    const [step, setStep] = useState<1 | 2>(1)
    const [menuId, setMenuId] = useState('')
    const [activeCategory, setActiveCategory] = useState('')
    const [customizing, setCustomizing] = useState<PublicProduct | null>(null)
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
    const menus = useMemo(
        () => catalog.data?.menus.filter((menu) => menu.isActive) ?? [],
        [catalog.data],
    )
    const selectedMenu = menus.find((menu) => menu.id === menuId) ?? menus[0]
    const categories = useMemo(
        () =>
            selectedMenu?.categories
                .filter((category) => category.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
        [selectedMenu],
    )
    const selectedCategory =
        categories.find((category) => category.id === activeCategory) ?? categories[0]
    const phoneValid = !customerPhone || isValidPhone(customerPhone)

    function reset() {
        cart.clear()
        setStep(1)
        setCustomerName('')
        setCustomerPhone('')
        setNotes('')
        setError(null)
        setCreatedOrder(null)
        setCustomizing(null)
    }

    function close() {
        if (mutation.isPending) return
        onClose()
    }

    function addProduct(product: PublicProduct, selections: CartSelection[] = []) {
        cart.add(product, selections)
        setCustomizing(null)
    }

    function createOrder() {
        if (mutation.isPending || cart.lines.length === 0 || !phoneValid) return
        setError(null)
        mutation.mutate(
            {
                ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
                ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
                items: cart.lines.map((line) => ({
                    productId: line.product.id,
                    quantity: line.quantity,
                    optionIds: line.selections.map((selection) => selection.id),
                })),
            },
            {
                onSuccess: (order) => setCreatedOrder(order),
                onError: (requestError) => {
                    setError(orderErrorMessage(requestError))
                    if (
                        requestError instanceof ApiError &&
                        (requestError.status === 401 || requestError.code === 'NOT_AUTHENTICATED')
                    ) {
                        router.replace('/auth/login')
                    }
                },
            },
        )
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-[#10224A]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-restaurant-order-title"
                className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[24px] border border-[#DCE5F3] bg-[#F8FAFE] shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:max-w-6xl sm:rounded-[24px]"
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8EEF6] bg-white px-5 py-4 sm:px-7">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                            Captura rápida
                        </p>
                        <h2
                            id="new-restaurant-order-title"
                            className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A]"
                        >
                            Nueva orden
                        </h2>
                        <p className="mt-1 text-sm text-[#65738A]">
                            {step === 1
                                ? 'Selecciona los productos y revisa el carrito.'
                                : 'Completa los datos disponibles del cliente.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Cerrar nueva orden"
                        className="grid size-9 place-items-center rounded-lg text-[#8996A9] transition hover:bg-[#F5F8FC] hover:text-[#12234A]"
                    >
                        <X className="size-4" />
                    </button>
                </header>
                {createdOrder ? (
                    <div className="grid min-h-[360px] place-items-center overflow-y-auto p-8 text-center">
                        <div className="max-w-sm">
                            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#EEF8F2] text-[#23814C]">
                                <Check className="size-8" />
                            </div>
                            <h3 className="mt-5 font-display text-2xl text-[#12234A]">
                                Orden creada
                            </h3>
                            <p className="mt-2 text-sm text-[#65738A]">
                                La orden quedó como Nueva y ya aparece en tu cola de pedidos.
                            </p>
                            <p className="mt-5 text-lg font-bold text-[#12234A]">
                                Orden #{createdOrder.orderNumber}
                            </p>
                            <p className="mt-1 text-sm text-[#65738A]">
                                Total confirmado:{' '}
                                <strong className="text-[#2451C5]">
                                    $
                                    {createdOrder.total.toLocaleString('es-MX', {
                                        minimumFractionDigits: 2,
                                    })}
                                </strong>
                            </p>
                            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onViewOrder(createdOrder)
                                        reset()
                                    }}
                                    className="rounded-xl bg-[#2451C5] px-4 py-3 text-sm font-bold text-white hover:bg-[#1E40AF]"
                                >
                                    Ver orden
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        reset()
                                        onClose()
                                    }}
                                    className="rounded-xl border border-[#D7E1EF] bg-white px-4 py-3 text-sm font-bold text-[#243556] hover:border-[#B9CDFD]"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                ) : step === 1 ? (
                    <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 space-y-5 overflow-y-auto p-5 sm:p-7">
                            {catalog.isLoading ? (
                                <div className="flex items-center gap-2 p-8 text-sm text-[#65738A]">
                                    <LoaderCircle className="size-4 animate-spin" /> Cargando
                                    catálogo…
                                </div>
                            ) : catalog.isError ? (
                                <div className="rounded-2xl border border-[#F3C2BD] bg-[#FFF8F7] p-5 text-sm text-[#B42318]">
                                    <AlertCircle className="mb-2 size-5" />
                                    No pudimos cargar los productos de tu catálogo.
                                </div>
                            ) : menus.length === 0 ? (
                                <p className="rounded-2xl border border-[#DCE5F3] bg-white p-5 text-sm text-[#65738A]">
                                    Agrega productos a tu catálogo para crear una orden.
                                </p>
                            ) : (
                                <>
                                    <div
                                        className="flex items-center gap-2 overflow-x-auto pb-1"
                                        aria-label="Menús"
                                    >
                                        {menus.map((menu) => (
                                            <button
                                                key={menu.id}
                                                type="button"
                                                onClick={() => {
                                                    setMenuId(menu.id)
                                                    setActiveCategory('')
                                                }}
                                                className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${selectedMenu?.id === menu.id ? 'border-[#2451C5] bg-[#2451C5] text-white' : 'border-[#D7E1EF] bg-white text-[#65738A] hover:border-[#B9CDFD]'}`}
                                            >
                                                {menu.name}
                                            </button>
                                        ))}
                                    </div>
                                    {categories.length > 0 && (
                                        <CategoryTabs
                                            categories={categories}
                                            activeCategory={selectedCategory?.id ?? ''}
                                            onChange={setActiveCategory}
                                        />
                                    )}
                                    <div className="space-y-8">
                                        {categories.map((category) => (
                                            <section
                                                key={category.id}
                                                id={`restaurant-category-${category.id}`}
                                            >
                                                <div className="mb-3">
                                                    <h3 className="font-display text-xl text-[#12234A]">
                                                        {category.name}
                                                    </h3>
                                                    {category.description && (
                                                        <p className="mt-1 text-sm text-[#65738A]">
                                                            {category.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="rounded-2xl border border-[#DCE5F3] bg-white px-5">
                                                    <div className="divide-y divide-[#E8EEF6]">
                                                        {category.products
                                                            .filter(
                                                                (product) => product.isAvailable,
                                                            )
                                                            .map((product) => (
                                                                <ProductCard
                                                                    key={product.id}
                                                                    product={product}
                                                                    onSelect={() =>
                                                                        setCustomizing(product)
                                                                    }
                                                                    onAdd={() =>
                                                                        addProduct(product)
                                                                    }
                                                                />
                                                            ))}
                                                    </div>
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <CartSummary
                            cart={cart}
                            onChangeQuantity={cart.changeQuantity}
                            onContinue={() => cart.lines.length > 0 && setStep(2)}
                        />
                    </div>
                ) : (
                    <CustomerStep
                        customerName={customerName}
                        customerPhone={customerPhone}
                        notes={notes}
                        phoneValid={phoneValid}
                        error={error}
                        isSubmitting={mutation.isPending}
                        onNameChange={setCustomerName}
                        onPhoneChange={setCustomerPhone}
                        onNotesChange={setNotes}
                        onBack={() => setStep(1)}
                        onSubmit={createOrder}
                    />
                )}
                {customizing && (
                    <ProductCustomizeDialog
                        key={customizing.id}
                        product={customizing}
                        onClose={() => setCustomizing(null)}
                        onAdd={(selections) => addProduct(customizing, selections)}
                    />
                )}
            </section>
        </div>
    )
}

function CartSummary({
    cart,
    onChangeQuantity,
    onContinue,
}: {
    cart: ReturnType<typeof useOrderCart>
    onChangeQuantity: (key: string, delta: number) => void
    onContinue: () => void
}) {
    return (
        <aside className="border-t border-[#DCE5F3] bg-white p-5 sm:p-7 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-[#2451C5]" />
                <h3 className="font-display text-xl text-[#12234A]">Tu orden</h3>
            </div>
            <p className="mt-1 text-sm text-[#65738A]">
                {cart.totalItems} {cart.totalItems === 1 ? 'producto' : 'productos'}
            </p>
            <div className="mt-5 max-h-[32vh] space-y-3 overflow-y-auto">
                {cart.lines.length === 0 ? (
                    <p className="rounded-xl bg-[#F8FAFE] p-4 text-sm text-[#65738A]">
                        Agrega productos para comenzar.
                    </p>
                ) : (
                    cart.lines.map((line) => (
                        <div key={line.key} className="flex gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[#243556]">
                                    {line.product.name}
                                </p>
                                {line.selections.length > 0 && (
                                    <p className="mt-0.5 text-xs text-[#65738A]">
                                        {line.selections
                                            .map((selection) => selection.name)
                                            .join(', ')}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[#65738A]">
                                    ${line.unitPrice.toLocaleString('es-MX')} c/u
                                </p>
                            </div>
                            <div className="flex h-8 items-center gap-1 rounded-lg border border-[#DCE5F3] px-1">
                                <button
                                    type="button"
                                    onClick={() => onChangeQuantity(line.key, -1)}
                                    aria-label={`Quitar una unidad de ${line.product.name}`}
                                    className="grid size-6 place-items-center text-[#65738A]"
                                >
                                    <Minus className="size-3" />
                                </button>
                                <span className="w-4 text-center text-xs font-bold text-[#12234A]">
                                    {line.quantity}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChangeQuantity(line.key, 1)}
                                    aria-label={`Agregar una unidad de ${line.product.name}`}
                                    className="grid size-6 place-items-center text-[#2451C5]"
                                >
                                    <Plus className="size-3" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-6 border-t border-[#E8EEF6] pt-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[#65738A]">Total estimado</span>
                    <strong className="font-display text-xl text-[#12234A]">
                        ${cart.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </strong>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#8996A9]">
                    El total final lo confirma el backend al crear la orden.
                </p>
                <button
                    type="button"
                    disabled={cart.lines.length === 0}
                    onClick={onContinue}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2451C5] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    Continuar
                </button>
            </div>
        </aside>
    )
}

function CustomerStep({
    customerName,
    customerPhone,
    notes,
    phoneValid,
    error,
    isSubmitting,
    onNameChange,
    onPhoneChange,
    onNotesChange,
    onBack,
    onSubmit,
}: {
    customerName: string
    customerPhone: string
    notes: string
    phoneValid: boolean
    error: string | null
    isSubmitting: boolean
    onNameChange: (value: string) => void
    onPhoneChange: (value: string) => void
    onNotesChange: (value: string) => void
    onBack: () => void
    onSubmit: () => void
}) {
    const normalizedName = customerName.trim()
    const normalizedNotes = notes.trim()
    const nameFormatValid =
        normalizedName === '' || /^[\p{L}\p{M}0-9 .,'’-]+$/u.test(normalizedName)
    const nameValid = normalizedName.length <= CUSTOMER_NAME_MAX_LENGTH && nameFormatValid
    const notesValid = normalizedNotes.length <= CUSTOMER_NOTES_MAX_LENGTH
    const formValid = phoneValid && nameValid && notesValid

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-10">
            <div className="mx-auto max-w-2xl">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#2451C5]"
                >
                    <ArrowLeft className="size-4" /> Volver a productos
                </button>
                <h3 className="mt-7 font-display text-2xl text-[#12234A]">Datos del cliente</h3>
                <div className="mt-3 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] px-4 py-3 text-sm leading-6 text-[#65738A]">
                    <p className="font-semibold text-[#243556]">¿Para qué se usarán estos datos?</p>
                    <p className="mt-1">
                        El nombre ayuda a identificar la orden, el teléfono permite contactar al
                        cliente si hace falta y las notas sirven para comunicar indicaciones al
                        equipo. <strong className="text-[#243556]">Todos son opcionales.</strong>
                    </p>
                </div>
                <div className="mt-7 space-y-5">
                    <label className="block text-sm font-bold text-[#243556]">
                        Nombre <span className="font-normal text-[#8996A9]">(opcional)</span>
                        <input
                            value={customerName}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder="Ej. Jorge Pérez"
                            maxLength={CUSTOMER_NAME_MAX_LENGTH}
                            aria-invalid={!nameValid}
                            autoComplete="name"
                            className="mt-2 w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 font-normal text-[#12234A] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        />
                        {!nameValid && (
                            <span className="mt-1.5 block text-xs font-normal text-[#B42318]">
                                {normalizedName.length > CUSTOMER_NAME_MAX_LENGTH
                                    ? `El nombre no puede superar ${CUSTOMER_NAME_MAX_LENGTH} caracteres.`
                                    : 'Usa solo letras, números, espacios, guiones o apóstrofes.'}
                            </span>
                        )}
                    </label>
                    <label className="block text-sm font-bold text-[#243556]">
                        Teléfono <span className="font-normal text-[#8996A9]">(opcional)</span>
                        <input
                            value={customerPhone}
                            onChange={(event) =>
                                onPhoneChange(sanitizePhoneInput(event.target.value))
                            }
                            placeholder="Ej. 698119319"
                            maxLength={10}
                            aria-invalid={Boolean(customerPhone) && !phoneValid}
                            inputMode="tel"
                            autoComplete="tel"
                            className="mt-2 w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 font-normal text-[#12234A] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        />
                        {customerPhone && !phoneValid && (
                            <span className="mt-1.5 block text-xs font-normal text-[#B42318]">
                                Usa 9 o 10 números juntos, por ejemplo 698119319. No uses +52 ni
                                guiones.
                            </span>
                        )}
                    </label>
                    <label className="block text-sm font-bold text-[#243556]">
                        Notas <span className="font-normal text-[#8996A9]">(opcional)</span>
                        <textarea
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder="Ej. Sin cebolla"
                            maxLength={CUSTOMER_NOTES_MAX_LENGTH}
                            aria-invalid={!notesValid}
                            rows={4}
                            className="mt-2 w-full resize-none rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 font-normal text-[#12234A] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        />
                        <span className="mt-1 block text-right text-[11px] font-normal text-[#8996A9]">
                            {notes.length}/{CUSTOMER_NOTES_MAX_LENGTH}
                        </span>
                    </label>
                </div>
                {error && (
                    <p
                        role="alert"
                        className="mt-5 rounded-xl border border-[#F3C2BD] bg-[#FFF8F7] p-3 text-sm text-[#B42318]"
                    >
                        {error}
                    </p>
                )}
                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isSubmitting}
                        className="rounded-xl border border-[#D7E1EF] bg-white px-5 py-3 text-sm font-bold text-[#243556]"
                    >
                        Volver
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={isSubmitting || !formValid}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2451C5] px-5 py-3 text-sm font-bold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                        {isSubmitting ? 'Creando orden…' : 'Crear orden'}
                    </button>
                </div>
            </div>
        </div>
    )
}
