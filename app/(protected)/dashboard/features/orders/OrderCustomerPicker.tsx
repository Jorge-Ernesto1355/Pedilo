'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '@/src/lib/api/orderApi'
import { useAuthStore } from '@/store/authStore'

export type PickedCustomer = {
    id: string
    name: string
    phone: string
}

/**
 * Buscador de clientes para una orden. Lo comparten el modal de edición y el de
 * asignar cliente, para que ambos se comporten igual.
 */
export function OrderCustomerPicker({
    selected,
    onSelect,
    onClear,
}: {
    selected: PickedCustomer | null
    onSelect: (customer: PickedCustomer) => void
    onClear: () => void
}) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const customers = useQuery({
        queryKey: ['customers', 'order-edit', businessId, debouncedSearch],
        queryFn: () =>
            getCustomers(businessId as string, {
                page: 1,
                limit: 8,
                search: debouncedSearch,
            }),
        enabled: Boolean(businessId && debouncedSearch.length >= 2),
        retry: false,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    })
    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
        return () => window.clearTimeout(timer)
    }, [search])

    const searching = search.trim().length >= 2

    return (
        <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-[#243556]">
                Buscar cliente existente
                <input
                    aria-label="Buscar cliente para la orden"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Busca por nombre o teléfono"
                    className="mt-1 h-11 w-full rounded-xl border border-[#C9D7EA] px-3 font-normal outline-none focus:border-[#2451C5]"
                />
            </label>
            {selected && (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-[#B9CDFD] bg-[#EEF3FF] px-3 py-2 text-sm text-[#243556]">
                    <span>
                        <strong>{selected.name}</strong> · {selected.phone || 'Sin teléfono'}
                    </span>
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-xs font-bold text-[#B42318]"
                    >
                        Quitar
                    </button>
                </div>
            )}
            {searching && (customers.isFetching || search.trim() !== debouncedSearch) && (
                <div
                    role="status"
                    aria-label="Buscando clientes"
                    className="mt-2 space-y-2 rounded-xl border border-[#DCE5F3] bg-white p-3"
                >
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-10 animate-pulse rounded-lg bg-[#F1F5FA]" />
                    ))}
                </div>
            )}
            {searching && customers.isError && (
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
            {searching && customers.isSuccess && customers.data.customers.length === 0 && (
                <p className="mt-2 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] p-3 text-center text-sm text-[#65738A]">
                    No hay ningún cliente que coincida con la búsqueda.
                </p>
            )}
            {customers.isSuccess &&
                !customers.isFetching &&
                customers.data?.customers &&
                customers.data.customers.length > 0 && (
                    <div className="mt-2 max-h-64 divide-y divide-[#E8EEF6] overflow-y-auto rounded-xl border border-[#DCE5F3] bg-white">
                        {customers.data.customers.slice(0, 8).map((customer) => (
                            <button
                                key={customer.id}
                                type="button"
                                onClick={() => {
                                    onSelect({
                                        id: customer.id,
                                        name: customer.name,
                                        phone: customer.phone,
                                    })
                                    setSearch('')
                                }}
                                className="block w-full px-3 py-2 text-left text-sm hover:bg-[#F8FAFE]"
                            >
                                <strong>{customer.name}</strong>
                                <span className="ml-2 text-[#71819A]">{customer.phone}</span>
                            </button>
                        ))}
                    </div>
                )}
        </div>
    )
}
