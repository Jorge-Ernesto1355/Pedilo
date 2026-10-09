'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Pencil, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyFieldError } from '@/src/lib/errors/user-friendly-error'
import type { Customer } from '@/src/lib/api/order-types'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'
import { useCustomer, useCustomerMutations, useCustomers } from '../features/customers/useCustomers'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { CustomersSkeleton } from '../components/DashboardSkeletons'
import { EmptyState } from '../components/EmptyState'

export default function CustomersPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selected, setSelected] = useState<Customer | null>(null)
    const [editing, setEditing] = useState<Customer | null>(null)
    const [customerModalOpen, setCustomerModalOpen] = useState(false)
    const [form, setForm] = useState({ name: '', phone: '' })
    const [formError, setFormError] = useState('')
    const [showOrders, setShowOrders] = useState(false)
    const limit = 20
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1)
            setDebouncedSearch(search.trim())
        }, 350)
        return () => window.clearTimeout(timer)
    }, [search])
    const query = useCustomers({ page, limit, search: debouncedSearch })
    const detail = useCustomer(selected?.id ?? null)
    const mutations = useCustomerMutations()
    const customerMutationError = mutations.create.error ?? mutations.update.error
    const backendPhoneError =
        customerMutationError instanceof ApiError &&
        (customerMutationError.code === 'CUSTOMER_PHONE_ALREADY_EXISTS' ||
            customerMutationError.code === 'CUSTOMER_PHONE_CONFLICT')
            ? 'Este teléfono ya pertenece a otro cliente de este negocio.'
            : customerMutationError instanceof ApiError
              ? getUserFriendlyFieldError(
                    customerMutationError,
                    'phone',
                    'Ingresa un número de teléfono válido.',
                )
              : undefined
    const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / limit)) : 1

    if (query.isLoading) return <CustomersSkeleton />

    function openCreate() {
        setEditing(null)
        setCustomerModalOpen(true)
        setForm({ name: '', phone: '' })
        setFormError('')
        setShowOrders(false)
    }
    function openEdit(customer: Customer) {
        setEditing(customer)
        setCustomerModalOpen(true)
        setForm({ name: customer.name, phone: customer.phone ?? '' })
        setFormError('')
        setShowOrders(false)
    }
    function closeForm() {
        setCustomerModalOpen(false)
        setEditing(null)
        setFormError('')
    }
    function submit(event: React.FormEvent) {
        event.preventDefault()
        if (mutations.create.isPending || mutations.update.isPending) return
        if (!form.name.trim()) {
            setFormError('El nombre es obligatorio para identificar al cliente.')
            return
        }
        if (!isValidPhone(form.phone)) {
            setFormError(
                'El teléfono debe contener exactamente 10 números, sin letras ni símbolos.',
            )
            return
        }
        setFormError('')
        const payload = {
            name: form.name.trim(),
            phone: form.phone.trim(),
        }
        if (editing) mutations.update.mutate({ id: editing.id, payload }, { onSuccess: closeForm })
        else mutations.create.mutate(payload, { onSuccess: closeForm })
    }
    function remove(customer: Customer) {
        if (mutations.remove.isPending) return
        if (!window.confirm(`¿Eliminar a ${customer.name}?`)) return
        mutations.remove.mutate(customer.id)
    }
    return (
        <main className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm text-[#65738A]">Relación con tus clientes</p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A]">
                        Clientes
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-[#65738A]">
                        Consulta quién te compra, cuántos pedidos ha realizado y mantén sus datos de
                        contacto actualizados.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white"
                >
                    <Plus className="size-4" />
                    Nuevo cliente
                </button>
            </header>
            <div className="flex gap-2">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Busca por nombre o teléfono…"
                    aria-label="Buscar clientes por nombre o teléfono"
                    className="w-full max-w-md rounded-xl border border-[#D7E1EF] bg-white px-4 py-3 text-sm outline-none focus:border-[#2451C5]"
                />
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="grid size-11 place-items-center rounded-xl border border-[#D7E1EF] bg-white"
                    aria-label="Actualizar clientes"
                >
                    <RefreshCw className="size-4" />
                </button>
            </div>
            {query.isError ? (
                <DashboardErrorState
                    title="No pudimos cargar tus clientes"
                    description="No logramos obtener la lista de clientes. Revisa tu conexión e inténtalo nuevamente."
                    onRetry={() => void query.refetch()}
                />
            ) : query.data?.customers.length === 0 ? (
                search.trim() ? (
                    <EmptyState
                        icon={Users}
                        title="No encontramos resultados"
                        description="Prueba con otro término o cambia la búsqueda para encontrar clientes."
                    />
                ) : (
                    <EmptyState
                        icon={Users}
                        title="Aún no tienes clientes"
                        description="Crea tu primer cliente o deja que tus clientes lo creen por ti."
                        action={{ label: 'Crear cliente', onClick: openCreate }}
                    />
                )
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#DCE5F3] bg-white">
                    <div className="divide-y divide-[#E8EEF6]">
                        {query.data?.customers.map((customer) => (
                            <div
                                key={customer.id}
                                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelected(customer)}
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <p className="font-bold text-[#12234A]">{customer.name}</p>
                                    <p className="mt-1 text-sm text-[#65738A]">
                                        {customer.phone || 'Sin teléfono registrado'}
                                    </p>
                                </button>
                                <span className="text-xs text-[#8996A9]">
                                    {customer.orderCount} pedidos
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(customer)}
                                        aria-label={`Editar ${customer.name}`}
                                        className="grid size-9 place-items-center rounded-lg text-[#65738A] hover:bg-[#EEF3FF]"
                                    >
                                        <Pencil className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => remove(customer)}
                                        disabled={mutations.remove.isPending}
                                        aria-label={`Eliminar ${customer.name}`}
                                        className="grid size-9 place-items-center rounded-lg text-[#65738A] hover:bg-[#FFF0EF] hover:text-[#B42318] disabled:cursor-wait disabled:opacity-50"
                                    >
                                        {mutations.remove.isPending ? (
                                            <LoaderCircle className="size-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {query.data && totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-[#8996A9]">
                        Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((value) => value - 1)}
                            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((value) => value + 1)}
                            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
            {customerModalOpen && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#10224A]/25 p-4">
                    <section className="w-full max-w-md rounded-2xl bg-white p-6">
                        <div className="flex justify-between">
                            <h2 className="font-display text-xl text-[#12234A]">
                                {editing ? 'Editar cliente' : 'Nuevo cliente'}
                            </h2>
                            <button
                                type="button"
                                onClick={closeForm}
                                disabled={mutations.create.isPending || mutations.update.isPending}
                                aria-label="Cerrar"
                            >
                                <X />
                            </button>
                        </div>
                        <form onSubmit={submit} className="mt-5 space-y-4">
                            <p className="text-xs text-[#8996A9]">
                                El nombre permite identificar al cliente en tus pedidos.
                            </p>
                            <input
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder="Nombre"
                                className="w-full rounded-xl border px-3.5 py-3 text-sm"
                            />
                            <p className="-mt-2 text-xs text-[#8996A9]">
                                El teléfono es opcional y se usa para contactar al cliente. Si lo
                                agregas, escribe 9 o 10 números juntos.
                            </p>
                            <input
                                value={form.phone}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        phone: sanitizePhoneInput(event.target.value),
                                    })
                                }
                                placeholder="Teléfono"
                                inputMode="tel"
                                className="w-full rounded-xl border px-3.5 py-3 text-sm"
                            />
                            {backendPhoneError && (
                                <p role="alert" className="-mt-2 text-xs text-[#B42318]">
                                    {backendPhoneError}
                                </p>
                            )}
                            {formError && <p className="text-xs text-[#B42318]">{formError}</p>}
                            {(mutations.create.isError || mutations.update.isError) && (
                                <p className="text-xs text-[#B42318]">
                                    {backendPhoneError ??
                                        (customerMutationError instanceof ApiError &&
                                        customerMutationError.status === 400
                                            ? 'Revisa el nombre y el formato del teléfono.'
                                            : 'No pudimos guardar el cliente. Revisa los datos e inténtalo nuevamente.')}
                                </p>
                            )}
                            <button
                                type="submit"
                                disabled={mutations.create.isPending || mutations.update.isPending}
                                aria-busy={mutations.create.isPending || mutations.update.isPending}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-50"
                            >
                                {(mutations.create.isPending || mutations.update.isPending) && (
                                    <LoaderCircle className="size-4 animate-spin" />
                                )}
                                {mutations.create.isPending || mutations.update.isPending
                                    ? 'Guardando…'
                                    : 'Guardar'}
                            </button>
                        </form>
                    </section>
                </div>
            )}
            {selected && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#10224A]/25 p-4">
                    <section className="w-full max-w-md rounded-2xl bg-white p-6">
                        <div className="flex justify-between">
                            <h2 className="font-display text-xl text-[#12234A]">
                                Detalle del cliente
                            </h2>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                aria-label="Cerrar"
                            >
                                <X />
                            </button>
                        </div>
                        {detail.isLoading ? (
                            <p className="mt-5 text-sm text-[#65738A]">Cargando…</p>
                        ) : (
                            detail.data && (
                                <div className="mt-5 space-y-3 text-sm">
                                    <p>
                                        <strong>{detail.data.name}</strong>
                                    </p>
                                    <p className="text-[#65738A]">{detail.data.phone}</p>
                                    <p className="text-[#65738A]">
                                        Pedidos: {detail.data.orderCount}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowOrders((value) => !value)}
                                        className="mt-2 rounded-lg border border-[#C9D7EA] px-3 py-2 text-xs font-bold text-[#2451C5]"
                                    >
                                        {showOrders ? 'Ocultar pedidos' : 'Cargar pedidos'}
                                    </button>
                                    {showOrders && (
                                        <div className="mt-3 space-y-2 border-t border-[#E8EEF6] pt-3">
                                            {detail.data.orders?.length ? (
                                                detail.data.orders.map((order) => (
                                                    <div
                                                        key={order.id}
                                                        className="flex justify-between text-xs"
                                                    >
                                                        <span>
                                                            Pedido #{order.orderNumber} ·{' '}
                                                            {order.status}
                                                        </span>
                                                        <strong>
                                                            $
                                                            {order.total.toLocaleString('es-MX', {
                                                                minimumFractionDigits: 2,
                                                            })}
                                                        </strong>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-[#8996A9]">
                                                    El backend no devolvió pedidos para este
                                                    cliente.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </section>
                </div>
            )}
            {mutations.remove.isError && (
                <p role="alert" className="text-sm text-[#B42318]">
                    {mutations.remove.error instanceof ApiError &&
                    mutations.remove.error.code === 'CUSTOMER_HAS_ORDERS'
                        ? 'No puedes eliminar un cliente que tiene pedidos.'
                        : 'No pudimos eliminar el cliente.'}
                </p>
            )}
        </main>
    )
}
