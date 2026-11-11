'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    AlertCircle,
    ArrowLeft,
    FolderOpen,
    LoaderCircle,
    Minus,
    PackageOpen,
    Plus,
    ShoppingBag,
    X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { useAuthStore } from '@/store/authStore'
import type {
    PublicCatalog,
    PublicDiscountPrice,
    PublicMenu,
    PublicProduct,
} from '@/app/menu/[slug]/features/public-menu/publicCatalog.types'
import { CategoryTabs } from '@/app/menu/[slug]/features/public-menu/CategoryTabs'
import { ProductCard } from '@/app/menu/[slug]/features/public-menu/ProductCard'
import { ProductCustomizeDialog } from '@/app/menu/[slug]/features/public-menu/ProductCustomizeDialog'
import { useOrderCart } from '@/app/menu/[slug]/features/public-menu/useOrderCart'
import type { CartLine, CartSelection } from '@/app/menu/[slug]/features/public-menu/types'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'
import { useCreateRestaurantOrder } from './useCreateRestaurantOrder'
import type { Order } from '@/src/lib/api/order-types'
import { getMenus } from '@/app/(protected)/create-menu/features/category-management/menuApi'
import { getProductsPaged } from '@/app/(protected)/create-menu/features/product-management/productApi'
import type { MenuProduct } from '@/app/(protected)/create-menu/features/category-management/menu.types'
import type { Product } from '@/app/(protected)/create-menu/features/product-management/product.types'
import { apiClient } from '@/src/lib/api/client'

const CUSTOMER_NAME_MAX_LENGTH = 80
const CUSTOMER_NOTES_MAX_LENGTH = 200

type RestaurantDiscount = {
    id: string
    name: string
    type: 'PERCENT' | 'FIXED'
    value: number
    scope: 'MENU' | 'PRODUCTS' | 'CATEGORIES'
    status: string
    startsAt?: string
    endsAt: string
    createdAt?: string
    product_ids?: string[]
    category_ids?: string[]
    menu_ids?: string[]
}

function discountForProduct(
    product: { id: string; categoryId: string; price: number },
    menuId: string,
    discounts: RestaurantDiscount[],
) {
    const now = Date.now()
    const candidates = discounts.filter((discount) => {
        if (discount.status !== 'ACTIVE') return false
        if (discount.startsAt && new Date(discount.startsAt).getTime() > now) return false
        if (new Date(discount.endsAt).getTime() <= now) return false
        if (discount.scope === 'PRODUCTS')
            return discount.product_ids?.includes(product.id) ?? false
        if (discount.scope === 'CATEGORIES')
            return discount.category_ids?.includes(product.categoryId) ?? false
        return discount.menu_ids?.includes(menuId) ?? false
    })
    return (
        candidates.sort(
            (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )[0] ?? null
    )
}

function priceWithRestaurantDiscount(price: number, discount: RestaurantDiscount | null) {
    if (!discount) return price
    if (discount.type === 'PERCENT') return Math.round(price * (100 - discount.value)) / 100
    return Math.max(0, Math.round((price - discount.value) * 100) / 100)
}

function catalogDiscountPrices(catalog: PublicCatalog | undefined): PublicDiscountPrice[] {
    return (
        catalog?.menus.flatMap((menu) =>
            menu.categories.flatMap((category) =>
                category.products.map((product) => {
                    const original = Number(
                        product.priceOriginal ?? product.price_original ?? product.price,
                    )
                    const final = Number(product.priceFinal ?? product.price_final ?? product.price)
                    return {
                        productId: product.id,
                        priceOriginal: original,
                        priceFinal: final,
                        price_original: original,
                        price_final: final,
                        discount: product.discount ?? null,
                    }
                }),
            ),
        ) ?? []
    )
}

function lineUnitPrice(product: PublicProduct, selections: CartSelection[]) {
    return (
        Number(product.priceFinal ?? product.price_final ?? product.price) +
        selections.reduce((total, selection) => total + selection.price * selection.quantity, 0)
    )
}

function useRestaurantCatalog(enabled: boolean) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const catalog = useQuery<PublicCatalog>({
        queryKey: ['restaurant-order-catalog', businessId],
        queryFn: async () => {
            if (!businessId) throw new Error('No encontramos el negocio del usuario.')
            const [menus, productsResponse, discountsResponse] = await Promise.all([
                getMenus(),
                getProductsPaged(businessId, {
                    page: 1,
                    limit: 100,
                    sortBy: 'sortOrder',
                    sortOrder: 'asc',
                }),
                apiClient
                    .get<{ discounts: RestaurantDiscount[] }>(`/businesses/${businessId}/discounts`)
                    .catch(() => ({ data: { discounts: [] } })),
            ])
            const products = productsResponse.products
            const discounts = discountsResponse.data.discounts
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
                                  type: product.type,
                                  includedProducts: undefined,
                                  comboOptionGroups: undefined,
                              }))
                    ).map((menuProduct) => {
                        const product = productsById.get(menuProduct.id)
                        const comboProduct = product as
                            | (Product &
                                  Pick<MenuProduct, 'includedProducts' | 'comboOptionGroups'>)
                            | undefined
                        const basePrice = Number(product?.price ?? menuProduct.price ?? 0)
                        const discount = discountForProduct(
                            {
                                id: menuProduct.id,
                                categoryId:
                                    product?.categoryId ?? menuProduct.categoryId ?? category.id,
                                price: basePrice,
                            },
                            menu.id,
                            discounts,
                        )
                        const finalPrice = priceWithRestaurantDiscount(basePrice, discount)
                        return {
                            id: menuProduct.id,
                            businessId,
                            categoryId:
                                product?.categoryId ?? menuProduct.categoryId ?? category.id,
                            name: product?.name ?? menuProduct.name,
                            description: product?.description ?? null,
                            price: finalPrice,
                            priceOriginal: basePrice,
                            priceFinal: finalPrice,
                            price_original: basePrice,
                            price_final: finalPrice,
                            discount: discount
                                ? {
                                      id: discount.id,
                                      name: discount.name,
                                      type: discount.type,
                                      value: discount.value,
                                      label:
                                          discount.type === 'PERCENT'
                                              ? `-${discount.value}%`
                                              : `-$${discount.value.toFixed(2)}`,
                                      endsAt: discount.endsAt,
                                  }
                                : null,
                            imageUrl: product?.imageUrl ?? null,
                            sortOrder: product?.sortOrder ?? 0,
                            isAvailable: product?.isAvailable ?? product?.active !== false,
                            type: product?.type ?? menuProduct.type,
                            includedProducts:
                                comboProduct?.includedProducts ?? menuProduct.includedProducts,
                            comboOptionGroups:
                                comboProduct?.comboOptionGroups ?? menuProduct.comboOptionGroups,
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
        staleTime: 0,
        refetchOnMount: 'always',
    })
    return {
        ...catalog,
        isLoading: catalog.isLoading,
        error: catalog.error,
    }
}

export function NewRestaurantOrderDrawer({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
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
    const [priceChange, setPriceChange] = useState<{
        expectedSubtotal: number
        currentSubtotal: number
        difference: number
    } | null>(null)
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
        setPriceChange(null)
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

    async function createOrder(skipPriceValidation = false) {
        if (mutation.isPending || cart.lines.length === 0 || !phoneValid) return
        setError(null)
        if (!skipPriceValidation && cart.lines.some((line) => line.product.discount)) {
            try {
                const refreshedCatalog = await catalog.refetch()
                const refreshedPrices = catalogDiscountPrices(refreshedCatalog.data)
                const refreshedByProduct = new Map(
                    refreshedPrices.map((product) => [product.productId, product]),
                )
                const currentSubtotal = cart.lines.reduce((total, line) => {
                    const refreshedProduct = refreshedByProduct.get(line.product.id)
                    if (!refreshedProduct) return total + line.unitPrice * line.quantity
                    return (
                        total +
                        lineUnitPrice(
                            {
                                ...line.product,
                                price: refreshedProduct.priceFinal,
                                priceFinal: refreshedProduct.priceFinal,
                                price_final: refreshedProduct.price_final,
                            },
                            line.selections,
                        ) *
                            line.quantity
                    )
                }, 0)
                if (Math.abs(currentSubtotal - cart.total) > 0.001) {
                    cart.syncDiscounts(refreshedPrices)
                    setPriceChange({
                        expectedSubtotal: cart.total,
                        currentSubtotal,
                        difference: currentSubtotal - cart.total,
                    })
                    return
                }
            } catch {
                setError('No pudimos verificar los descuentos actuales. Inténtalo nuevamente.')
                return
            }
        }
        setPriceChange(null)
        const createdAt = new Date().toISOString()
        const idempotencyKey = crypto.randomUUID()
        const optimisticOrder: Order = {
            id: `optimistic-${idempotencyKey}`,
            businessId: useAuthStore.getState().user?.businessId ?? undefined,
            orderNumber: 0,
            status: 'PENDING',
            source: 'RESTAURANT',
            customerId: null,
            subtotal: cart.total,
            discountAmount: 0,
            total: cart.total,
            customerName: customerName.trim() || null,
            customerPhone: customerPhone.trim() || null,
            notes: notes.trim() || null,
            fulfillmentType: 'DINE_IN',
            items: cart.lines.map((line) => ({
                id: `${idempotencyKey}-${line.key}`,
                productId: line.product.id,
                productName: line.product.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                subtotal: line.unitPrice * line.quantity,
                options: line.selections.map((selection) => ({
                    id: selection.id,
                    name: selection.name,
                    price: selection.price,
                })),
            })),
            statusHistory: [{ status: 'PENDING', createdAt }],
            createdAt,
            updatedAt: createdAt,
            creationState: 'pending',
        }
        const payload = {
            ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
            ...(customerPhone.trim() ? { customerPhone: customerPhone.trim() } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            items: cart.lines.map((line) => ({
                productId: line.product.id,
                quantity: line.quantity,
                optionIds: line.selections.flatMap((selection) =>
                    selection.kind !== 'combo-choice'
                        ? Array.from({ length: selection.quantity }, () => selection.id)
                        : [],
                ),
                ...(line.selections.some((selection) => selection.kind === 'combo-choice')
                    ? {
                          comboChoiceIds: line.selections
                              .filter((selection) => selection.kind === 'combo-choice')
                              .flatMap((selection) =>
                                  Array.from({ length: selection.quantity }, () => selection.id),
                              ),
                      }
                    : {}),
            })),
        }
        mutation.mutate(
            {
                payload,
                optimisticOrder,
                idempotencyKey,
            },
            {
                onError: (requestError) => {
                    if (
                        requestError instanceof ApiError &&
                        (requestError.status === 401 || requestError.code === 'NOT_AUTHENTICATED')
                    ) {
                        router.replace('/auth/login')
                    }
                },
            },
        )
        reset()
        onClose()
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
                className="flex max-h-[94svh] w-full flex-col overflow-hidden rounded-t-[24px] border border-[#DCE5F3] bg-[#F8FAFE] shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:max-w-6xl sm:rounded-[24px]"
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
                {step === 1 ? (
                    <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 space-y-5 overflow-y-auto p-5 sm:p-7">
                            {catalog.isLoading ? (
                                <RestaurantCatalogSkeleton />
                            ) : catalog.isError ? (
                                <div className="rounded-2xl border border-[#F3C2BD] bg-[#FFF8F7] p-5 text-sm text-[#B42318]">
                                    <AlertCircle className="mb-2 size-5" />
                                    No pudimos cargar los productos de tu catálogo.
                                </div>
                            ) : menus.length === 0 ? (
                                <EmptyCatalogState
                                    icon={FolderOpen}
                                    title="Tu catálogo está vacío"
                                    description="Agrega un menú y sus categorías para empezar a crear la orden."
                                />
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
                                    {categories.length === 0 ? (
                                        <EmptyCatalogState
                                            icon={FolderOpen}
                                            title="Este menú aún no tiene categorías"
                                            description="Agrega una categoría para empezar a crear la orden."
                                        />
                                    ) : (
                                        <div className="space-y-8">
                                            {categories.map((category) => {
                                                const availableProducts = category.products.filter(
                                                    (product) => product.isAvailable,
                                                )
                                                return (
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
                                                        <div className="rounded-2xl border border-[#DCE5F3] bg-white px-5 py-5">
                                                            {availableProducts.length === 0 ? (
                                                                <EmptyCatalogState
                                                                    icon={PackageOpen}
                                                                    title="Esta categoría está vacía"
                                                                    description="Cuando agregues productos disponibles aparecerán aquí."
                                                                    compact
                                                                />
                                                            ) : (
                                                                <div className="divide-y divide-[#E8EEF6]">
                                                                    {availableProducts.map(
                                                                        (product) => (
                                                                            <ProductCard
                                                                                key={product.id}
                                                                                product={product}
                                                                                onSelect={() =>
                                                                                    setCustomizing(
                                                                                        product,
                                                                                    )
                                                                                }
                                                                                onAdd={() =>
                                                                                    addProduct(
                                                                                        product,
                                                                                    )
                                                                                }
                                                                            />
                                                                        ),
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </section>
                                                )
                                            })}
                                        </div>
                                    )}
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
                        priceChange={priceChange}
                        isSubmitting={mutation.isPending}
                        onNameChange={setCustomerName}
                        onPhoneChange={setCustomerPhone}
                        onNotesChange={setNotes}
                        onBack={() => setStep(1)}
                        onSubmit={() => void createOrder()}
                        onCancelPriceChange={() => setPriceChange(null)}
                        onContinueAfterPriceChange={() => void createOrder(true)}
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

function RestaurantCatalogSkeleton() {
    return (
        <div
            className="space-y-5"
            role="status"
            aria-label="Cargando catálogo"
            data-testid="restaurant-catalog-skeleton"
        >
            <span className="sr-only">Cargando catálogo…</span>
            <div className="flex gap-2 overflow-hidden" aria-hidden="true">
                {[1, 2, 3].map((item) => (
                    <span
                        key={item}
                        className="h-10 w-28 shrink-0 animate-pulse rounded-xl bg-[#E8EEF8]"
                    />
                ))}
            </div>
            <div
                className="flex gap-2 overflow-hidden rounded-xl border border-[#DCE5F3] bg-white p-1"
                aria-hidden="true"
            >
                {[1, 2, 3, 4].map((item) => (
                    <span
                        key={item}
                        className="h-10 w-24 shrink-0 animate-pulse rounded-lg bg-[#EEF3FF]"
                    />
                ))}
            </div>
            <section
                className="rounded-2xl border border-[#DCE5F3] bg-white px-5 py-5"
                aria-hidden="true"
            >
                <div className="mb-5 h-7 w-44 animate-pulse rounded-lg bg-[#E8EEF8]" />
                <div className="divide-y divide-[#E8EEF6]">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                            <div className="size-24 shrink-0 animate-pulse rounded-xl bg-[#EEF3FF] sm:size-28" />
                            <div className="min-w-0 flex-1 space-y-3 py-1">
                                <div className="h-5 w-3/5 animate-pulse rounded-md bg-[#E8EEF8]" />
                                <div className="h-4 w-11/12 animate-pulse rounded-md bg-[#F0F3F8]" />
                                <div className="h-10 w-32 animate-pulse rounded-lg bg-[#EEF3FF] sm:h-8" />
                            </div>
                            <div className="h-6 w-20 shrink-0 animate-pulse rounded-md bg-[#E8EEF8]" />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

function EmptyCatalogState({
    icon: Icon,
    title,
    description,
    compact = false,
}: {
    icon: LucideIcon
    title: string
    description: string
    compact?: boolean
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] text-center ${compact ? 'px-4 py-8' : 'px-6 py-12'}`}
            role="status"
        >
            <span className="pointer-events-none absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-b-full bg-[#1D5BFF]" />
            <span
                className={`mx-auto grid place-items-center rounded-2xl bg-[#E5EEFF] text-[#1D5BFF] shadow-[0_8px_20px_rgb(29_91_255_/_0.12)] ${compact ? 'size-12' : 'size-14'}`}
            >
                <Icon className={compact ? 'size-5' : 'size-6'} aria-hidden="true" />
            </span>
            <h4 className="mt-4 font-display text-lg font-bold tracking-[-.02em] text-[#12234A]">
                {title}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#65738A]">{description}</p>
        </div>
    )
}

function originalUnitPrice(line: CartLine) {
    const original = line.product.priceOriginal ?? line.product.price_original ?? line.product.price
    const final = line.product.priceFinal ?? line.product.price_final ?? line.product.price
    return line.unitPrice + Math.max(0, original - final)
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
                                <p className="mt-1 text-xs font-semibold text-[#65738A]">
                                    {line.product.discount &&
                                        originalUnitPrice(line) > line.unitPrice && (
                                            <span className="mr-1 text-[#8996A9] line-through">
                                                $
                                                {originalUnitPrice(line).toLocaleString('es-MX', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        )}
                                    <span
                                        className={
                                            line.product.discount ? 'text-[#16803D]' : undefined
                                        }
                                    >
                                        $
                                        {line.unitPrice.toLocaleString('es-MX', {
                                            minimumFractionDigits: 2,
                                        })}{' '}
                                        c/u
                                    </span>
                                    {line.product.discount && (
                                        <span className="ml-1 text-[11px] font-bold text-[#16803D]">
                                            {line.product.discount.label}
                                        </span>
                                    )}
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
    priceChange,
    isSubmitting,
    onNameChange,
    onPhoneChange,
    onNotesChange,
    onBack,
    onSubmit,
    onCancelPriceChange,
    onContinueAfterPriceChange,
}: {
    customerName: string
    customerPhone: string
    notes: string
    phoneValid: boolean
    error: string | null
    priceChange: { expectedSubtotal: number; currentSubtotal: number; difference: number } | null
    isSubmitting: boolean
    onNameChange: (value: string) => void
    onPhoneChange: (value: string) => void
    onNotesChange: (value: string) => void
    onBack: () => void
    onSubmit: () => void
    onCancelPriceChange: () => void
    onContinueAfterPriceChange: () => void
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
                            id="restaurant-order-notes"
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder="Ej. Sin cebolla"
                            maxLength={CUSTOMER_NOTES_MAX_LENGTH}
                            aria-invalid={!notesValid}
                            aria-describedby="restaurant-order-notes-counter"
                            rows={4}
                            className="mt-2 w-full resize-none rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 font-normal text-[#12234A] outline-none focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        />
                        <span
                            id="restaurant-order-notes-counter"
                            className={`mt-1 flex items-center justify-between text-[11px] font-normal ${notes.length >= CUSTOMER_NOTES_MAX_LENGTH - 20 ? 'text-[#B42318]' : 'text-[#8996A9]'}`}
                        >
                            <span>Máximo {CUSTOMER_NOTES_MAX_LENGTH} caracteres</span>
                            <span className="font-semibold">
                                {notes.length}/{CUSTOMER_NOTES_MAX_LENGTH}
                            </span>
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
                {priceChange && (
                    <div
                        className="mt-5 rounded-xl border border-[#F1C46A] bg-[#FFF9E8] px-3 py-3"
                        data-testid="restaurant-price-change-warning"
                    >
                        <p className="text-sm font-bold text-[#8A5A00]">
                            El descuento cambió mientras preparabas la orden
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#8A5A00]">
                            El subtotal ahora es $
                            {priceChange.currentSubtotal.toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                            })}{' '}
                            ({priceChange.difference > 0 ? 'subió' : 'bajó'} $
                            {Math.abs(priceChange.difference).toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                            })}
                            ). El descuento ya no está disponible con el precio anterior.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={onCancelPriceChange}
                                className="min-h-9 flex-1 rounded-lg border border-[#D7B35A] px-2 text-xs font-bold text-[#8A5A00]"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={onContinueAfterPriceChange}
                                className="min-h-9 flex-1 rounded-lg bg-[#B77900] px-2 text-xs font-bold text-white"
                            >
                                Continuar con precio actualizado
                            </button>
                        </div>
                    </div>
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
                        disabled={isSubmitting || !formValid || Boolean(priceChange)}
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
