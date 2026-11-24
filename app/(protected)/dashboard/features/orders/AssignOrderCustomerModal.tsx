'use client'

import { useState } from 'react'
import { AlertTriangle, LoaderCircle, Save, X } from 'lucide-react'
import type { Order } from '@/src/lib/api/order-types'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { useOrderUpdateMutation } from './useOrders'
import { OrderCustomerPicker, type PickedCustomer } from './OrderCustomerPicker'

/**
 * Asigna un cliente a una orden que no tiene. Guarda con la misma mutación que
 * "Editar orden" y con los productos tal como están: solo cambia el cliente.
 */
export function AssignOrderCustomerModal({
    order,
    onClose,
    onSaved,
}: {
    order: Order
    onClose: () => void
    onSaved: (order: Order) => void
}) {
    const update = useOrderUpdateMutation()
    const [customer, setCustomer] = useState<PickedCustomer | null>(null)
    const [error, setError] = useState('')

    function save() {
        if (!customer) return
        setError('')
        update.mutate(
            {
                orderId: order.id,
                payload: {
                    expectedVersion: order.version ?? 1,
                    customerId: customer.id,
                    ...(order.paymentMethod ? { paymentMethod: order.paymentMethod } : {}),
                    items: order.items.map((item) => ({
                        id: item.id,
                        productId: item.productId,
                        quantity: item.quantity,
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
                              : 'No pudimos asignar el cliente. Inténtalo nuevamente.',
                    ),
            },
        )
    }

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#10224A]/40 p-4 pb-[calc(var(--mobile-nav-h)+1rem)] backdrop-blur-[2px]">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="assign-customer-title"
                data-cy="assign-order-customer-modal"
                className="flex max-h-[min(94svh,calc(100svh-var(--mobile-nav-h)-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#DCE5F3] bg-white shadow-[0_25px_80px_rgb(16_34_74_/_0.2)]"
            >
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                                Pedido #{String(order.orderNumber).padStart(3, '0')}
                            </p>
                            <h2
                                id="assign-customer-title"
                                className="mt-1 font-display text-2xl text-[#12234A]"
                            >
                                Seleccionar cliente
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="grid size-10 place-items-center rounded-xl text-[#65738A] hover:bg-[#F2F5FA]"
                            aria-label="Cerrar selección de cliente"
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
                    <div className="mt-6">
                        <OrderCustomerPicker
                            selected={customer}
                            onSelect={setCustomer}
                            onClear={() => setCustomer(null)}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#E8EEF6] px-5 py-4 sm:px-7">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 rounded-xl border border-[#D7E1EF] px-4 text-sm font-bold text-[#243556] hover:bg-[#F8FAFE]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        data-cy="assign-order-customer-save"
                        disabled={!customer || update.isPending}
                        onClick={save}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2451C5] px-4 text-sm font-bold text-white transition hover:bg-[#1D43A8] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {update.isPending ? (
                            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Save className="size-4" aria-hidden="true" />
                        )}
                        Guardar cliente
                    </button>
                </div>
            </section>
        </div>
    )
}
