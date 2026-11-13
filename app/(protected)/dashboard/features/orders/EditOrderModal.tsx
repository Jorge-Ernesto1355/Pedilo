'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
    AlertTriangle,
    Banknote,
    LoaderCircle,
    Minus,
    Plus,
    Receipt,
    Save,
    Search,
    ShoppingBag,
    Trash2,
    Utensils,
    X,
} from 'lucide-react'
import type { Order, OrderFulfillmentType, OrderPaymentMethod } from '@/src/lib/api/order-types'
import type { MenuProduct } from '@/app/(protected)/create-menu/features/category-management/menu.types'
import { getMenus } from '@/app/(protected)/create-menu/features/category-management/menuApi'
import { getCustomers } from '@/src/lib/api/orderApi'
import { useAuthStore } from '@/store/authStore'
import { formatMoney } from '../dashboard-data/formatters'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { useOrderUpdateMutation } from './useOrders'
import { getOptionGroups } from '@/app/(protected)/create-menu/features/option-management/optionApi'
import type { OptionGroup } from '@/app/(protected)/create-menu/features/option-management/option.types'
import { getCombo } from '@/app/(protected)/create-menu/features/product-management/comboApi'
import type { ComboOptionGroup } from '@/app/(protected)/create-menu/features/product-management/comboApi'

type DraftItem = {
    id?: string
    productId: string
    name: string
    quantity: number
    optionIds?: string[]
    optionText: string
    originalOptions?: Order['items'][number]['options']
    comboChoiceIds?: string[]
    baseUnitPrice: number
    unitPrice: number
}

function productsFromMenus(menus: Awaited<ReturnType<typeof getMenus>> | undefined): MenuProduct[] {
    return menus?.flatMap((menu) => menu.categories.flatMap((category) => category.products)) ?? []
}

export function EditOrderModal({
    order,
    onClose,
    onSaved,
}: {
    order: Order
    onClose: () => void
    onSaved: (order: Order) => void
}) {
    const [productPickerOpen, setProductPickerOpen] = useState(false)
    const [productSearch, setProductSearch] = useState('')
    const [pendingComboProduct, setPendingComboProduct] = useState<MenuProduct | null>(null)
    const menus = useQuery({
        queryKey: ['menus', 'order-edit'],
        queryFn: getMenus,
        enabled: productPickerOpen,
        retry: false,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    })
    const pendingCombo = useQuery({
        queryKey: ['order-edit-pending-combo', pendingComboProduct?.id],
        queryFn: () => getCombo(pendingComboProduct!.id),
        enabled: Boolean(pendingComboProduct),
        retry: false,
        staleTime: 60_000,
    })
    const update = useOrderUpdateMutation()
    const businessId = useAuthStore((state) => state.user?.businessId)
    const products = productsFromMenus(menus.data)
    const [customerSearch, setCustomerSearch] = useState('')
    const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<{
        id: string
        name: string
        phone: string
    } | null>(
        order.customerId && order.customerName
            ? { id: order.customerId, name: order.customerName, phone: order.customerPhone ?? '' }
            : null,
    )
    const customers = useQuery({
        queryKey: ['customers', 'order-edit', businessId, debouncedCustomerSearch],
        queryFn: () =>
            getCustomers(businessId as string, {
                page: 1,
                limit: 8,
                search: debouncedCustomerSearch,
            }),
        enabled: Boolean(businessId && debouncedCustomerSearch.length >= 2),
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    })
    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedCustomerSearch(customerSearch.trim()),
            350,
        )
        return () => window.clearTimeout(timer)
    }, [customerSearch])
    const [fulfillmentType, setFulfillmentType] = useState<OrderFulfillmentType>(
        order.fulfillmentType,
    )
    const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>(
        order.paymentMethod ?? 'CASH',
    )
    const [draftItems, setDraftItems] = useState<DraftItem[]>(() =>
        order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            name: item.productName ?? item.name ?? item.productId,
            quantity: item.quantity,
            optionIds: undefined,
            optionText: item.options?.map((option) => option.name).join(', ') ?? '',
            originalOptions: item.options,
            baseUnitPrice: Math.max(
                0,
                (item.unitPriceFinal ?? item.unitPrice ?? 0) -
                    (item.options?.reduce((sum, option) => sum + (option.price ?? 0), 0) ?? 0),
            ),
            unitPrice: item.unitPriceFinal ?? item.unitPrice ?? 0,
        })),
    )
    const optionQueries = useQueries({
        queries: draftItems.map((item) => ({
            queryKey: ['order-edit-options', item.productId],
            queryFn: () => getOptionGroups(item.productId),
            staleTime: 60_000,
        })),
    })
    const comboQueries = useQueries({
        queries: draftItems.map((item) => ({
            queryKey: ['order-edit-combo', item.productId],
            queryFn: () => getCombo(item.productId),
            enabled: true,
            retry: false,
            staleTime: 60_000,
        })),
    })
    const [reviewing, setReviewing] = useState(false)
    const [error, setError] = useState('')
    const beforeTotal = order.total
    const draftSubtotal = useMemo(
        () => draftItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
        [draftItems],
    )
    const draftTotal = Math.max(0, draftSubtotal - (order.discountAmount ?? 0))
    const changed =
        selectedCustomer?.id !== order.customerId ||
        fulfillmentType !== order.fulfillmentType ||
        paymentMethod !== (order.paymentMethod ?? 'CASH') ||
        draftItems.length !== order.items.length ||
        draftItems.some(
            (item, index) =>
                item.productId !== order.items[index]?.productId ||
                item.quantity !== order.items[index]?.quantity ||
                item.unitPrice !==
                    (order.items[index]?.unitPriceFinal ?? order.items[index]?.unitPrice ?? 0) ||
                item.optionIds !== undefined ||
                item.comboChoiceIds !== undefined,
        )

    function appendProduct(product: MenuProduct, comboChoiceIds: string[] = []) {
        setDraftItems((current) => {
            return [
                ...current,
                {
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    optionIds: [],
                    comboChoiceIds,
                    optionText:
                        pendingComboProduct && comboChoiceIds.length > 0
                            ? (pendingCombo.data?.optionGroups ?? [])
                                  .flatMap((group) =>
                                      group.products
                                          .filter((choice) => comboChoiceIds.includes(choice.id))
                                          .map((choice) => `${group.name}: ${choice.product.name}`),
                                  )
                                  .join(', ')
                            : '',
                    baseUnitPrice: Number(product.price ?? 0),
                    unitPrice: Number(product.price ?? 0),
                },
            ]
        })
    }

    function addProduct(product: MenuProduct) {
        if (product.type === 'COMBO' || (product.comboOptionGroups?.length ?? 0) > 0) {
            setPendingComboProduct(product)
            return
        }
        appendProduct(product)
    }

    function toggleOptionQuantity(itemIndex: number, optionId: string, delta: number) {
        setDraftItems((current) =>
            current.map((item, index) => {
                if (index !== itemIndex) return item
                const ids = item.optionIds ?? []
                const currentQuantity = ids.filter((id) => id === optionId).length
                const nextQuantity = Math.max(0, currentQuantity + delta)
                const nextIds = ids.filter((id) => id !== optionId)
                nextIds.push(...Array.from({ length: nextQuantity }, () => optionId))
                const optionPrice =
                    optionQueries[itemIndex]?.data
                        ?.flatMap((group) => group.options ?? [])
                        .reduce(
                            (sum, option) =>
                                sum +
                                nextIds.filter((id) => id === option.id).length *
                                    Number(option.price),
                            0,
                        ) ?? 0
                return {
                    ...item,
                    optionIds: nextIds,
                    unitPrice: item.baseUnitPrice + optionPrice,
                }
            }),
        )
    }

    function enableOptionEditing(itemIndex: number) {
        const item = draftItems[itemIndex]
        const optionGroups = optionQueries[itemIndex]?.data ?? []
        const comboGroups = comboQueries[itemIndex]?.data?.optionGroups ?? []
        const originalOptions = item?.originalOptions ?? []
        const optionIds = optionGroups.flatMap((group) =>
            (group.options ?? [])
                .filter((option) =>
                    originalOptions.some(
                        (selected) =>
                            selected?.name === option.name &&
                            (selected.groupName === null || selected.groupName === group.name),
                    ),
                )
                .map((option) => option.id),
        )
        const comboChoiceIds = comboGroups.flatMap((group) =>
            group.products
                .filter((choice) =>
                    originalOptions.some(
                        (selected) =>
                            selected?.groupName === group.name &&
                            selected.name?.replace(/^\d+×\s*/, '') === choice.product.name,
                    ),
                )
                .map((choice) => choice.id),
        )
        const optionPrice = optionGroups
            .flatMap((group) => group.options ?? [])
            .reduce(
                (sum, option) =>
                    sum + optionIds.filter((id) => id === option.id).length * Number(option.price),
                0,
            )
        setDraftItems((current) =>
            current.map((item, index) =>
                index === itemIndex
                    ? {
                          ...item,
                          optionIds,
                          comboChoiceIds,
                          unitPrice: item.baseUnitPrice + optionPrice,
                      }
                    : item,
            ),
        )
    }

    function cancelOptionEditing(itemIndex: number) {
        setDraftItems((current) =>
            current.map((item, index) =>
                index === itemIndex
                    ? {
                          ...item,
                          optionIds: undefined,
                          comboChoiceIds: undefined,
                          unitPrice:
                              order.items[index]?.unitPriceFinal ??
                              order.items[index]?.unitPrice ??
                              item.unitPrice,
                      }
                    : item,
            ),
        )
    }

    function changeComboChoice(itemIndex: number, groupId: string, choiceId: string) {
        const groups = comboQueries[itemIndex]?.data?.optionGroups ?? []
        setDraftItems((current) =>
            current.map((item, index) => {
                if (index !== itemIndex) return item
                const selectedByGroup = new Map<string, string>()
                for (const selectedId of item.comboChoiceIds ?? []) {
                    const group = groups.find((entry) =>
                        entry.products.some((choice) => choice.id === selectedId),
                    )
                    if (group) selectedByGroup.set(group.id, selectedId)
                }
                selectedByGroup.set(groupId, choiceId)
                const selectedComboIds = [...selectedByGroup.values()]
                const comboText = groups.flatMap((group) =>
                    group.products
                        .filter((choice) => selectedComboIds.includes(choice.id))
                        .map((choice) => `${group.name}: ${choice.product.name}`),
                )
                const nonComboText = (item.originalOptions ?? [])
                    .filter((option) => !groups.some((group) => group.name === option.groupName))
                    .map((option) => option.name)
                    .filter((name): name is string => Boolean(name))
                return {
                    ...item,
                    comboChoiceIds: selectedComboIds,
                    optionText: [...nonComboText, ...comboText].join(', '),
                }
            }),
        )
    }

    function save() {
        setError('')
        const incompleteCombo = draftItems.find((item, index) => {
            const groups = comboQueries[index]?.data?.optionGroups ?? []
            return groups.some(
                (group) =>
                    group.minSelections >
                    (item.comboChoiceIds ?? []).filter((choiceId) =>
                        group.products.some((choice) => choice.id === choiceId),
                    ).length,
            )
        })
        if (incompleteCombo) {
            setError(
                `Selecciona las opciones del combo “${incompleteCombo.name}” antes de guardar.`,
            )
            return
        }
        update.mutate(
            {
                orderId: order.id,
                payload: {
                    expectedVersion: order.version ?? 1,
                    customerId: selectedCustomer?.id ?? null,
                    fulfillmentType,
                    paymentMethod,
                    items: draftItems.map((item) => ({
                        id: item.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        optionIds: item.optionIds,
                        comboChoiceIds: item.comboChoiceIds,
                    })),
                },
            },
            {
                onSuccess: (updated) => {
                    onSaved(updated)
                    onClose()
                },
                onError: (cause) =>
                    setError(
                        cause instanceof ApiError && cause.code === 'ORDER_VERSION_CONFLICT'
                            ? 'La orden fue modificada en otra sesión. Vuelve a abrir el detalle para cargar la versión más reciente.'
                            : cause instanceof ApiError && cause.code === 'ORDER_NOT_EDITABLE'
                              ? 'La orden ya no se puede editar porque cambió de estado.'
                              : 'No pudimos guardar los cambios. Revisa los datos e inténtalo nuevamente.',
                    ),
            },
        )
    }

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#10224A]/40 p-4 backdrop-blur-[2px]">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-order-title"
                data-cy="edit-order-modal"
                className="max-h-[94svh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#DCE5F3] bg-white p-5 shadow-[0_25px_80px_rgb(16_34_74_/_0.2)] sm:p-7"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                            Editar orden
                        </p>
                        <h2
                            id="edit-order-title"
                            className="mt-1 font-display text-2xl text-[#12234A]"
                        >
                            Pedido #{String(order.orderNumber).padStart(3, '0')}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid size-10 place-items-center rounded-xl text-[#65738A] hover:bg-[#F2F5FA]"
                        aria-label="Cerrar edición"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                {error && (
                    <div
                        role="alert"
                        className="mt-5 flex gap-2 rounded-xl border border-[#F3C2BD] bg-[#FFF5F3] p-3 text-sm text-[#B42318]"
                    >
                        <AlertTriangle className="size-4 shrink-0" />
                        {error}
                    </div>
                )}
                {!reviewing ? (
                    <div className="mt-6 space-y-6">
                        <section className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="text-sm font-semibold text-[#243556]">
                                    Buscar cliente existente
                                    <input
                                        aria-label="Buscar cliente para la orden"
                                        value={customerSearch}
                                        onChange={(event) => setCustomerSearch(event.target.value)}
                                        placeholder="Busca por nombre o teléfono"
                                        className="mt-1 h-11 w-full rounded-xl border border-[#C9D7EA] px-3 font-normal outline-none focus:border-[#2451C5]"
                                    />
                                </label>
                                {selectedCustomer && (
                                    <div className="mt-2 flex items-center justify-between rounded-xl border border-[#B9CDFD] bg-[#EEF3FF] px-3 py-2 text-sm text-[#243556]">
                                        <span>
                                            <strong>{selectedCustomer.name}</strong> ·{' '}
                                            {selectedCustomer.phone || 'Sin teléfono'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCustomer(null)}
                                            className="text-xs font-bold text-[#B42318]"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                )}
                                {customerSearch.trim().length >= 2 &&
                                    (customers.isFetching ||
                                        customerSearch.trim() !== debouncedCustomerSearch) && (
                                        <div
                                            role="status"
                                            aria-label="Buscando clientes"
                                            className="mt-2 space-y-2 rounded-xl border border-[#DCE5F3] bg-white p-3"
                                        >
                                            {[1, 2, 3].map((item) => (
                                                <div
                                                    key={item}
                                                    className="h-10 animate-pulse rounded-lg bg-[#F1F5FA]"
                                                />
                                            ))}
                                        </div>
                                    )}
                                {customerSearch.trim().length >= 2 && customers.isError && (
                                    <div
                                        role="alert"
                                        className="mt-2 rounded-xl border border-[#F3C2BD] bg-[#FFF5F3] p-3 text-sm text-[#B42318]"
                                    >
                                        No pudimos cargar los clientes.{' '}
                                        <button
                                            type="button"
                                            data-cy="edit-order-customer-retry"
                                            onClick={() => void customers.refetch()}
                                            className="font-bold underline"
                                        >
                                            Intentar de nuevo
                                        </button>
                                    </div>
                                )}
                                {customerSearch.trim().length >= 2 &&
                                    customers.isSuccess &&
                                    customers.data.customers.length === 0 && (
                                        <p className="mt-2 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] p-3 text-center text-sm text-[#65738A]">
                                            No hay ningún cliente que coincida con la búsqueda.
                                        </p>
                                    )}
                                {customers.isSuccess &&
                                    !customers.isFetching &&
                                    customers.data?.customers &&
                                    customers.data.customers.length > 0 && (
                                        <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-[#E8EEF6] rounded-xl border border-[#DCE5F3] bg-white">
                                            {customers.data.customers
                                                .slice(0, 8)
                                                .map((customer) => (
                                                    <button
                                                        key={customer.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCustomer({
                                                                id: customer.id,
                                                                name: customer.name,
                                                                phone: customer.phone,
                                                            })
                                                            setCustomerSearch('')
                                                        }}
                                                        className="block w-full px-3 py-2 text-left text-sm hover:bg-[#F8FAFE]"
                                                    >
                                                        <strong>{customer.name}</strong>
                                                        <span className="ml-2 text-[#71819A]">
                                                            {customer.phone}
                                                        </span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                            </div>
                            <ChoiceField label="Modalidad">
                                <ChoiceButton
                                    active={fulfillmentType === 'DINE_IN'}
                                    onClick={() => setFulfillmentType('DINE_IN')}
                                    icon={<Utensils className="size-4" />}
                                    title="Comer aquí"
                                    description="Consumo en el restaurante"
                                />
                                <ChoiceButton
                                    active={fulfillmentType === 'PICKUP'}
                                    onClick={() => setFulfillmentType('PICKUP')}
                                    icon={<ShoppingBag className="size-4" />}
                                    title="Para llevar"
                                    description="El cliente recoge el pedido"
                                />
                            </ChoiceField>
                            <ChoiceField label="Método de pago">
                                <ChoiceButton
                                    active={paymentMethod === 'CASH'}
                                    onClick={() => setPaymentMethod('CASH')}
                                    icon={<Banknote className="size-4" />}
                                    title="Efectivo"
                                    description="Pago al entregar"
                                />
                                <ChoiceButton
                                    active={paymentMethod === 'TRANSFER'}
                                    onClick={() => setPaymentMethod('TRANSFER')}
                                    icon={<Receipt className="size-4" />}
                                    title="Transferencia"
                                    description="Pago por transferencia"
                                />
                            </ChoiceField>
                        </section>
                        <section>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-display text-lg text-[#12234A]">Productos</h3>
                                <span className="text-sm text-[#65738A]">
                                    {formatMoney(draftSubtotal, 'MXN')}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {draftItems.map((item, index) => (
                                    <article
                                        key={item.id ?? `${item.productId}-${index}`}
                                        data-cy="edit-order-item"
                                        className="rounded-2xl border border-[#E8EEF6] p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-[#243556]">
                                                    {item.name}
                                                </p>
                                                {item.optionText && (
                                                    <p className="text-xs text-[#71819A]">
                                                        Extras actuales: {item.optionText}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDraftItems((current) =>
                                                        current.filter(
                                                            (_, itemIndex) => itemIndex !== index,
                                                        ),
                                                    )
                                                }
                                                className="grid size-9 place-items-center rounded-lg text-[#B42318] hover:bg-[#FFF3F1]"
                                                aria-label={`Eliminar ${item.name}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDraftItems((current) =>
                                                            current.map((value, itemIndex) =>
                                                                itemIndex === index
                                                                    ? {
                                                                          ...value,
                                                                          quantity: Math.max(
                                                                              1,
                                                                              value.quantity - 1,
                                                                          ),
                                                                      }
                                                                    : value,
                                                            ),
                                                        )
                                                    }
                                                    className="grid size-8 place-items-center rounded-lg border border-[#D7E1EF]"
                                                    aria-label={`Disminuir cantidad de ${item.name}`}
                                                >
                                                    <Minus className="size-4" />
                                                </button>
                                                <span className="w-6 text-center font-bold">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDraftItems((current) =>
                                                            current.map((value, itemIndex) =>
                                                                itemIndex === index
                                                                    ? {
                                                                          ...value,
                                                                          quantity:
                                                                              value.quantity + 1,
                                                                      }
                                                                    : value,
                                                            ),
                                                        )
                                                    }
                                                    className="grid size-8 place-items-center rounded-lg border border-[#D7E1EF]"
                                                    aria-label={`Aumentar cantidad de ${item.name}`}
                                                >
                                                    <Plus className="size-4" />
                                                </button>
                                            </div>
                                            <span className="w-24 text-right font-semibold text-[#243556]">
                                                {formatMoney(item.unitPrice * item.quantity, 'MXN')}
                                            </span>
                                        </div>
                                        {((optionQueries[index]?.data?.length ?? 0) > 0 ||
                                            (comboQueries[index]?.data?.optionGroups.length ?? 0) >
                                                0) && (
                                            <OptionEditor
                                                itemIndex={index}
                                                groups={optionQueries[index]?.data ?? []}
                                                comboGroups={
                                                    comboQueries[index]?.data?.optionGroups ?? []
                                                }
                                                selectedIds={item.optionIds}
                                                comboChoiceIds={item.comboChoiceIds}
                                                onEnable={() => enableOptionEditing(index)}
                                                onCancel={() => cancelOptionEditing(index)}
                                                onChange={(optionId, delta) =>
                                                    toggleOptionQuantity(index, optionId, delta)
                                                }
                                                onComboChange={(groupId, choiceId) =>
                                                    changeComboChoice(index, groupId, choiceId)
                                                }
                                            />
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>
                        <section className="rounded-2xl border border-dashed border-[#B9CDFD] bg-[#F8FAFE] p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="font-semibold text-[#243556]">
                                        Agregar producto
                                    </h4>
                                    <p className="mt-1 text-xs text-[#71819A]">
                                        Busca un producto y agrégalo a la orden. Cada selección se
                                        conserva como una línea independiente.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    data-cy="edit-order-product-picker-toggle"
                                    onClick={() => setProductPickerOpen((value) => !value)}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2451C5] px-4 text-sm font-bold text-white hover:bg-[#1D43A5]"
                                >
                                    <Plus className="size-4" />
                                    {productPickerOpen ? 'Cerrar' : 'Seleccionar'}
                                </button>
                            </div>
                            {productPickerOpen && (
                                <div className="mt-4">
                                    {menus.isLoading ? (
                                        <div
                                            role="status"
                                            aria-label="Cargando productos"
                                            className="grid gap-2 sm:grid-cols-2"
                                        >
                                            {[1, 2, 3, 4].map((item) => (
                                                <div
                                                    key={item}
                                                    className="h-16 animate-pulse rounded-xl bg-[#E8EEF8]"
                                                />
                                            ))}
                                        </div>
                                    ) : menus.isError ? (
                                        <div
                                            role="alert"
                                            className="rounded-xl border border-[#F3C2BD] bg-[#FFF5F3] p-3 text-sm text-[#B42318]"
                                        >
                                            No pudimos cargar los productos.{' '}
                                            <button
                                                type="button"
                                                data-cy="edit-order-catalog-retry"
                                                onClick={() => void menus.refetch()}
                                                className="font-bold underline"
                                            >
                                                Intentar de nuevo
                                            </button>
                                        </div>
                                    ) : products.length === 0 ? (
                                        <p className="rounded-xl border border-[#DCE5F3] bg-white p-4 text-center text-sm text-[#65738A]">
                                            No hay productos disponibles para agregar.
                                        </p>
                                    ) : (
                                        <>
                                            <label className="relative block">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8996A9]" />
                                                <input
                                                    aria-label="Buscar producto para agregar"
                                                    value={productSearch}
                                                    onChange={(event) =>
                                                        setProductSearch(event.target.value)
                                                    }
                                                    placeholder="Buscar producto"
                                                    className="h-10 w-full rounded-xl border border-[#C9D7EA] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#2451C5]"
                                                />
                                            </label>
                                            <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                                {products
                                                    .filter((product) =>
                                                        product.name
                                                            .toLowerCase()
                                                            .includes(
                                                                productSearch.trim().toLowerCase(),
                                                            ),
                                                    )
                                                    .map((product) => (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            data-cy="edit-order-product"
                                                            data-product-id={product.id}
                                                            onClick={() => addProduct(product)}
                                                            className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[#E0E8F4] bg-white px-3 text-left transition hover:border-[#B9CDFD] hover:bg-[#EEF3FF]"
                                                        >
                                                            <span className="min-w-0">
                                                                <span className="block truncate text-sm font-semibold text-[#243556]">
                                                                    {product.name}
                                                                </span>
                                                                <span className="mt-1 block text-xs text-[#71819A]">
                                                                    Agregar a la orden
                                                                </span>
                                                            </span>
                                                            <span className="shrink-0 text-sm font-bold text-[#2451C5]">
                                                                {formatMoney(
                                                                    Number(product.price ?? 0),
                                                                    'MXN',
                                                                )}
                                                            </span>
                                                        </button>
                                                    ))}
                                            </div>
                                            {products.filter((product) =>
                                                product.name
                                                    .toLowerCase()
                                                    .includes(productSearch.trim().toLowerCase()),
                                            ).length === 0 && (
                                                <p className="mt-3 rounded-xl bg-white p-3 text-center text-sm text-[#65738A]">
                                                    No encontramos productos con esa búsqueda.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                ) : (
                    <section className="mt-6 rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] p-5">
                        <h3 className="font-display text-xl text-[#12234A]">
                            Confirma los cambios
                        </h3>
                        <p className="mt-1 text-sm text-[#65738A]">
                            Revisa el resumen antes de guardar la nueva versión.
                        </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-white p-4">
                                <p className="text-xs font-bold uppercase text-[#8996A9]">
                                    Total actual
                                </p>
                                <p className="mt-2 font-display text-2xl text-[#65738A]">
                                    {formatMoney(beforeTotal, 'MXN')}
                                </p>
                            </div>
                            <div className="rounded-xl border border-[#B9CDFD] bg-[#EEF3FF] p-4">
                                <p className="text-xs font-bold uppercase text-[#2451C5]">
                                    Total después
                                </p>
                                <p className="mt-2 font-display text-2xl text-[#12234A]">
                                    {formatMoney(draftTotal, 'MXN')}
                                </p>
                            </div>
                        </div>
                        <ul className="mt-5 space-y-2 text-sm text-[#243556]">
                            <li>• {draftItems.length} producto(s) en la orden</li>
                            <li>
                                •{' '}
                                {selectedCustomer
                                    ? `${selectedCustomer.name} · ${selectedCustomer.phone}`
                                    : 'Sin cliente asignado'}{' '}
                                · {fulfillmentType === 'PICKUP' ? 'Para llevar' : 'Comer aquí'}
                            </li>
                            <li>• Los totales serán recalculados por el backend.</li>
                        </ul>
                    </section>
                )}
                <div className="mt-7 flex flex-wrap justify-end gap-2 border-t border-[#E8EEF6] pt-5">
                    <button
                        type="button"
                        onClick={reviewing ? () => setReviewing(false) : onClose}
                        className="min-h-11 rounded-xl border border-[#D7E1EF] px-4 text-sm font-bold text-[#53647D]"
                    >
                        {reviewing ? 'Volver a editar' : 'Cancelar'}
                    </button>
                    {!reviewing ? (
                        <button
                            type="button"
                            data-cy="edit-order-review"
                            disabled={!changed || !draftItems.length}
                            onClick={() => setReviewing(true)}
                            className="min-h-11 rounded-xl bg-[#2451C5] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Revisar cambios
                        </button>
                    ) : (
                        <button
                            type="button"
                            data-cy="edit-order-save"
                            disabled={update.isPending}
                            onClick={save}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#23814C] px-5 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {update.isPending ? (
                                'Guardando…'
                            ) : (
                                <>
                                    <Save className="size-4" />
                                    Confirmar y guardar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </section>
            {pendingComboProduct && (
                <ComboSelectionDialog
                    key={pendingComboProduct.id}
                    productName={pendingComboProduct.name}
                    groups={pendingCombo.data?.optionGroups ?? []}
                    isLoading={pendingCombo.isLoading}
                    isError={pendingCombo.isError}
                    onClose={() => setPendingComboProduct(null)}
                    onRetry={() => void pendingCombo.refetch()}
                    onConfirm={(choiceIds) => {
                        appendProduct(pendingComboProduct, choiceIds)
                        setPendingComboProduct(null)
                    }}
                />
            )}
        </div>
    )
}

function ComboSelectionDialog({
    productName,
    groups,
    isLoading,
    isError,
    onClose,
    onRetry,
    onConfirm,
}: {
    productName: string
    groups: ComboOptionGroup[]
    isLoading: boolean
    isError: boolean
    onClose: () => void
    onRetry: () => void
    onConfirm: (choiceIds: string[]) => void
}) {
    const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>({})
    const canConfirm = groups.every((group) => {
        const selected = selectedByGroup[group.id]
        return group.minSelections === 0 || Boolean(selected)
    })

    return (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#10224A]/35 p-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="combo-selection-title"
                className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#DCE5F3] bg-white p-5 shadow-[0_25px_80px_rgb(16_34_74_/_0.24)] sm:p-6"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                            Personaliza el combo
                        </p>
                        <h3
                            id="combo-selection-title"
                            className="mt-1 font-display text-xl text-[#12234A]"
                        >
                            {productName}
                        </h3>
                        <p className="mt-1 text-sm text-[#65738A]">
                            Elige el acompañamiento antes de agregar esta línea a la orden.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cancelar selección del combo"
                        className="grid size-9 place-items-center rounded-xl text-[#65738A] hover:bg-[#F2F5FA]"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                {isLoading ? (
                    <div
                        role="status"
                        aria-label="Cargando opciones del combo"
                        className="mt-6 space-y-3"
                    >
                        {[1, 2, 3].map((item) => (
                            <div
                                key={item}
                                className="h-14 animate-pulse rounded-xl bg-[#EEF3F9]"
                            />
                        ))}
                    </div>
                ) : isError ? (
                    <div
                        role="alert"
                        className="mt-6 rounded-xl border border-[#F3C2BD] bg-[#FFF5F3] p-4 text-sm text-[#B42318]"
                    >
                        No pudimos cargar los grupos de este combo.{' '}
                        <button type="button" onClick={onRetry} className="font-bold underline">
                            Intentar de nuevo
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 space-y-5">
                        {groups.map((group) => (
                            <fieldset key={group.id}>
                                <legend className="text-sm font-bold text-[#243556]">
                                    {group.name}{' '}
                                    <span className="font-normal text-[#8996A9]">
                                        Elige una opción
                                    </span>
                                </legend>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {group.products
                                        .filter((choice) => choice.product.isAvailable)
                                        .map((choice) => (
                                            <label
                                                key={choice.id}
                                                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${selectedByGroup[group.id] === choice.id ? 'border-[#2451C5] bg-[#EEF3FF]' : 'border-[#E0E8F4] bg-white hover:border-[#B9CDFD]'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`new-combo-${group.id}`}
                                                    checked={
                                                        selectedByGroup[group.id] === choice.id
                                                    }
                                                    onChange={() =>
                                                        setSelectedByGroup((current) => ({
                                                            ...current,
                                                            [group.id]: choice.id,
                                                        }))
                                                    }
                                                    className="size-4 accent-[#2451C5]"
                                                />
                                                <span className="font-semibold text-[#243556]">
                                                    {choice.product.name}
                                                </span>
                                            </label>
                                        ))}
                                </div>
                            </fieldset>
                        ))}
                    </div>
                )}
                <div className="mt-7 flex justify-end gap-2 border-t border-[#E8EEF6] pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-10 rounded-xl border border-[#D7E1EF] px-4 text-sm font-bold text-[#53647D]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={isLoading || isError || !canConfirm}
                        onClick={() => onConfirm(Object.values(selectedByGroup))}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2451C5] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isLoading && <LoaderCircle className="size-4 animate-spin" />}
                        Agregar combo
                    </button>
                </div>
            </section>
        </div>
    )
}

function OptionEditor({
    itemIndex,
    groups,
    comboGroups,
    selectedIds,
    comboChoiceIds,
    onEnable,
    onCancel,
    onChange,
    onComboChange,
}: {
    itemIndex: number
    groups: OptionGroup[]
    comboGroups: ComboOptionGroup[]
    selectedIds?: string[]
    comboChoiceIds?: string[]
    onEnable: () => void
    onCancel: () => void
    onChange: (optionId: string, delta: number) => void
    onComboChange: (groupId: string, choiceId: string) => void
}) {
    if (selectedIds === undefined)
        return (
            <button
                type="button"
                onClick={onEnable}
                className="mt-3 text-xs font-bold text-[#2451C5] hover:underline"
            >
                Editar variantes y extras
            </button>
        )
    return (
        <div className="mt-3 space-y-3 rounded-xl bg-[#F8FAFE] p-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#65738A]">
                    Variantes y extras
                </p>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Cancelar edición de variantes"
                    title="Cancelar edición"
                    className="grid size-6 place-items-center rounded-full text-[#8996A9] hover:bg-white hover:text-[#B42318]"
                >
                    ×
                </button>
            </div>
            {comboGroups.map((group) => {
                const selectedChoiceId = comboChoiceIds?.find((choiceId) =>
                    group.products.some((choice) => choice.id === choiceId),
                )
                return (
                    <fieldset key={group.id}>
                        <legend className="text-xs font-bold text-[#243556]">
                            {group.name}{' '}
                            <span className="font-normal text-[#8996A9]">Elige una opción</span>
                        </legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {group.products
                                .filter((choice) => choice.product.isAvailable)
                                .map((choice) => (
                                    <label
                                        key={choice.id}
                                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs ${selectedChoiceId === choice.id ? 'border-[#2451C5] bg-[#EEF3FF]' : 'border-[#E0E8F4] bg-white'}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`edit-combo-${itemIndex}-${group.id}`}
                                            checked={selectedChoiceId === choice.id}
                                            onChange={() => onComboChange(group.id, choice.id)}
                                            className="size-3.5 accent-[#2451C5]"
                                        />
                                        <span className="font-semibold text-[#243556]">
                                            {choice.product.name}
                                        </span>
                                    </label>
                                ))}
                        </div>
                    </fieldset>
                )
            })}
            {groups
                .filter((group) => group.isActive)
                .map((group) => (
                    <fieldset key={group.id}>
                        <legend className="text-xs font-semibold text-[#243556]">
                            {group.name}
                        </legend>
                        <div className="mt-1 grid gap-1 sm:grid-cols-2">
                            {(group.options ?? [])
                                .filter((option) => option.isAvailable)
                                .map((option) => {
                                    const quantity = selectedIds.filter(
                                        (id) => id === option.id,
                                    ).length
                                    return (
                                        <div
                                            key={option.id}
                                            className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs text-[#53647D]"
                                        >
                                            <span className="min-w-0 truncate">
                                                {option.name} · +
                                                {formatMoney(Number(option.price), 'MXN')}
                                            </span>
                                            <span className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onChange(option.id, -1)}
                                                    disabled={quantity === 0}
                                                    aria-label={`Quitar ${option.name}`}
                                                    className="grid size-7 place-items-center rounded-full border border-[#D7E1EF] text-[#53647D] disabled:opacity-35"
                                                >
                                                    −
                                                </button>
                                                <span className="w-4 text-center font-bold text-[#243556]">
                                                    {quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => onChange(option.id, 1)}
                                                    disabled={quantity >= option.maxSelections}
                                                    aria-label={`Agregar ${option.name}`}
                                                    className="grid size-7 place-items-center rounded-full bg-[#2451C5] text-white disabled:opacity-35"
                                                >
                                                    +
                                                </button>
                                            </span>
                                        </div>
                                    )
                                })}
                        </div>
                    </fieldset>
                ))}
        </div>
    )
}

function ChoiceField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <fieldset className="text-sm font-semibold text-[#243556]">
            <legend>{label}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">{children}</div>
        </fieldset>
    )
}

function ChoiceButton({
    active,
    onClick,
    icon,
    title,
    description,
}: {
    active: boolean
    onClick: () => void
    icon: ReactNode
    title: string
    description: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex min-h-[72px] items-start gap-3 rounded-xl border p-3 text-left transition ${
                active
                    ? 'border-[#2451C5] bg-[#EEF3FF] text-[#12234A] ring-2 ring-[#2451C5]/10'
                    : 'border-[#E0E8F4] bg-white text-[#53647D] hover:border-[#B9CDFD]'
            }`}
        >
            <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                    active ? 'bg-[#2451C5] text-white' : 'bg-[#F1F5FA] text-[#71819A]'
                }`}
            >
                {icon}
            </span>
            <span>
                <span className="block text-sm font-bold">{title}</span>
                <span className="mt-1 block text-xs font-normal text-[#71819A]">{description}</span>
            </span>
        </button>
    )
}
