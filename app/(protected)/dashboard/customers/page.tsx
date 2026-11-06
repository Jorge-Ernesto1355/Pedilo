'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import posthog from 'posthog-js'
import {
    LoaderCircle,
    Ban,
    CheckCircle2,
    MessageCircle,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    ShoppingBag,
    Trash2,
    Users,
    Wallet,
    X,
    CreditCard,
} from 'lucide-react'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { getUserFriendlyFieldError } from '@/src/lib/errors/user-friendly-error'
import type { Customer } from '@/src/lib/api/order-types'
import { isValidPhone, sanitizePhoneInput } from '@/src/lib/validation/phone'
import { useCustomer, useCustomerMutations, useCustomers } from '../features/customers/useCustomers'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { CustomersSkeleton } from '../components/DashboardSkeletons'
import { EmptyState } from '../components/EmptyState'
import { CustomerDetailPanel } from '../features/customers/CustomerDetailPanel'
import { getPaymentCard } from '../../create-menu/features/payment-card/paymentCardApi'
import { useCurrentBusiness } from '../../create-menu/features/business-profile/useCurrentBusiness'
import { createTransferCardMessage, normalizeMexicanWhatsAppNumber } from '../../../menu/[slug]/features/public-menu/whatsapp'

const CUSTOMER_NAME_MAX_LENGTH = 20

export default function CustomersPage() {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selected, setSelected] = useState<Customer | null>(null)
    const [editing, setEditing] = useState<Customer | null>(null)
    const [customerModalOpen, setCustomerModalOpen] = useState(false)
    const [form, setForm] = useState({ name: '', phone: '' })
    const [formError, setFormError] = useState('')
    const [openCustomerMenu, setOpenCustomerMenu] = useState<string | null>(null)
    useEffect(() => {
        if (!openCustomerMenu) return

        function closeMenu(event: Event) {
            if (event instanceof KeyboardEvent) {
                if (event.key === 'Escape') setOpenCustomerMenu(null)
                return
            }
            const target = event.target
            if (
                target instanceof Element &&
                !target.closest(`[data-customer-actions="${openCustomerMenu}"]`)
            ) {
                setOpenCustomerMenu(null)
            }
        }

        document.addEventListener('pointerdown', closeMenu)
        document.addEventListener('keydown', closeMenu)
        return () => {
            document.removeEventListener('pointerdown', closeMenu)
            document.removeEventListener('keydown', closeMenu)
        }
    }, [openCustomerMenu])
    const limit = 10
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1)
            setDebouncedSearch(search.trim())
        }, 350)
        return () => window.clearTimeout(timer)
    }, [search])
    const query = useCustomers({ page, limit, search: debouncedSearch })
    const paymentCardQuery = useQuery({ queryKey: ['payment-card'], queryFn: getPaymentCard, staleTime: 60_000 })
    const business = useCurrentBusiness()
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
        setOpenCustomerMenu(null)
        setEditing(null)
        setCustomerModalOpen(true)
        setForm({ name: '', phone: '' })
        setFormError('')
    }
    function openEdit(customer: Customer) {
        setOpenCustomerMenu(null)
        setEditing(customer)
        setCustomerModalOpen(true)
        setForm({ name: customer.name, phone: customer.phone ?? '' })
        setFormError('')
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
        if (editing) {
            mutations.update.mutate(
                { id: editing.id, payload },
                {
                    onSuccess: () => {
                        posthog.capture('customer_updated')
                        closeForm()
                    },
                },
            )
        } else {
            mutations.create.mutate(payload, {
                onSuccess: () => {
                    posthog.capture('customer_created')
                    closeForm()
                },
            })
        }
    }
    function remove(customer: Customer) {
        if (mutations.remove.isPending) return
        if (!window.confirm(`¿Eliminar a ${customer.name}?`)) return
        setOpenCustomerMenu(null)
        mutations.remove.mutate(customer.id)
    }
    function toggleDisabled(customer: Customer) {
        if (mutations.toggleDisabled.isPending) return
        setOpenCustomerMenu(null)
        mutations.toggleDisabled.mutate({ id: customer.id, disabled: !customer.isDisabled })
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
            <div className="flex gap-2 rounded-2xl border border-[#DCE5F3] bg-white p-2 shadow-[0_8px_24px_rgb(18_35_74/0.04)]">
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Busca por nombre o teléfono…"
                    aria-label="Buscar clientes por nombre o teléfono"
                    className="min-w-0 flex-1 rounded-xl border border-transparent bg-[#F7F9FD] px-4 py-3 text-sm outline-none transition focus:border-[#2451C5] focus:bg-white"
                />
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-[#2451C5] transition hover:bg-[#EEF3FF]"
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
                <div className="overflow-visible rounded-2xl border border-[#DCE5F3] bg-white shadow-[0_12px_30px_rgb(18_35_74/0.05)]">
                    <div className="divide-y divide-[#E8EEF6]">
                        {query.data?.customers.map((customer) => (
                            <div
                                key={customer.id}
                                className="flex flex-col gap-4 p-4 transition hover:bg-[#FBFCFF] sm:flex-row sm:items-center sm:px-5"
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelected(customer)}
                                    className="min-w-0 flex-1 text-left"
                                >
                                    <p className="truncate font-bold text-[#12234A]">
                                        {customer.name}
                                    </p>
                                    <p className="mt-1 truncate text-sm text-[#65738A]">
                                        {customer.phone || 'Sin teléfono registrado'}
                                    </p>
                                </button>
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[#F7F9FD] px-3 py-2 sm:min-w-[112px]">
                                        <ShoppingBag className="size-4 shrink-0 text-[#2451C5]" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8996A9]">
                                                Pedidos
                                            </p>
                                            <p className="font-bold text-[#12234A]">
                                                {customer.orderCount}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[#F0FDF7] px-3 py-2 sm:min-w-[132px]">
                                        <Wallet className="size-4 shrink-0 text-[#23814C]" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#6B8A78]">
                                                Gastado
                                            </p>
                                            <p className="truncate font-bold text-[#17643A]">
                                                $
                                                {customer.totalSpent.toLocaleString('es-MX', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="relative flex justify-end border-t border-[#EEF2F7] pt-2 sm:border-0 sm:pt-0"
                                    data-customer-actions={customer.id}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenCustomerMenu((current) =>
                                                current === customer.id ? null : customer.id,
                                            )
                                        }
                                        aria-label={`Acciones de ${customer.name}`}
                                        aria-expanded={openCustomerMenu === customer.id}
                                        aria-haspopup="menu"
                                        className="grid size-9 place-items-center rounded-lg text-[#65738A] hover:bg-[#EEF3FF]"
                                    >
                                        <MoreHorizontal className="size-5" />
                                    </button>
                                    {openCustomerMenu === customer.id && (
                                        <div
                                            role="menu"
                                            aria-label={`Acciones para ${customer.name}`}
                                            className="absolute right-0 top-11 z-20 min-w-48 rounded-xl border border-[#DCE5F3] bg-white p-1.5 shadow-[0_14px_36px_rgb(18_35_74/0.16)]"
                                        >
                                            {customer.phone && (
                                                <a
                                                    href={`https://wa.me/52${customer.phone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    role="menuitem"
                                                    aria-label={`Enviar WhatsApp a ${customer.name}`}
                                                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#17643A] hover:bg-[#F0FDF7]"
                                                >
                                                    <MessageCircle className="size-4" />
                                                    Enviar WhatsApp
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                role="menuitem"
                                                data-cy="customer-send-transfer-card"
                                                disabled={!paymentCardQuery.data?.paymentCard?.isActive || !normalizeMexicanWhatsAppNumber(customer.phone)}
                                                title={!customer.phone ? 'El cliente no tiene teléfono registrado' : !paymentCardQuery.data?.paymentCard?.isActive ? 'Configura una tarjeta activa para transferencias' : undefined}
                                                onClick={() => {
                                                    const card = paymentCardQuery.data?.paymentCard
                                                    const phone = normalizeMexicanWhatsAppNumber(customer.phone)
                                                    if (!card?.isActive || !phone) return
                                                    const message = createTransferCardMessage({ customerName: customer.name, businessName: business.data?.name ?? 'Restaurante', bankName: card.bankName, clabe: card.clabe, beneficiaryName: card.beneficiaryName })
                                                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
                                                    setOpenCustomerMenu(null)
                                                }}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#53647D] hover:bg-[#EEF3FF] disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                <CreditCard className="size-4" />
                                                Enviar tarjeta
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => openEdit(customer)}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#53647D] hover:bg-[#EEF3FF]"
                                            >
                                                <Pencil className="size-4" />
                                                Editar cliente
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => toggleDisabled(customer)}
                                                disabled={mutations.toggleDisabled.isPending}
                                                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#FFF7ED] disabled:cursor-wait disabled:opacity-50"
                                            >
                                                {mutations.toggleDisabled.isPending ? (
                                                    <LoaderCircle className="mt-0.5 size-4 animate-spin text-[#B45309]" />
                                                ) : customer.isDisabled ? (
                                                    <CheckCircle2 className="mt-0.5 size-4 text-[#17643A]" />
                                                ) : (
                                                    <Ban className="mt-0.5 size-4 text-[#B45309]" />
                                                )}
                                                <span>
                                                    <span className="block text-sm font-semibold text-[#53647D]">
                                                        {customer.isDisabled ? 'Habilitar cliente' : 'Deshabilitar cliente'}
                                                    </span>
                                                    <span className="block text-[11px] font-normal leading-4 text-[#8996A9]">
                                                        {customer.isDisabled ? 'Podrá volver a hacer pedidos' : 'Ya no podrá hacer pedidos'}
                                                    </span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => remove(customer)}
                                                disabled={mutations.remove.isPending}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#B42318] hover:bg-[#FFF0EF] disabled:cursor-wait disabled:opacity-50"
                                            >
                                                {mutations.remove.isPending ? (
                                                    <LoaderCircle className="size-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="size-4" />
                                                )}
                                                Eliminar cliente
                                            </button>
                                        </div>
                                    )}
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
                                maxLength={CUSTOMER_NAME_MAX_LENGTH}
                                aria-describedby="customer-name-counter"
                                className="w-full rounded-xl border px-3.5 py-3 text-sm"
                            />
                            <p id="customer-name-counter" className="-mt-2 text-right text-xs text-[#8996A9]">
                                {form.name.length}/{CUSTOMER_NAME_MAX_LENGTH}
                            </p>
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
                            {(mutations.create.isError || mutations.update.isError) && !backendPhoneError && (
                                <p className="text-xs text-[#B42318]">
                                    {customerMutationError instanceof ApiError &&
                                        customerMutationError.status === 400
                                        ? 'Revisa el nombre y el formato del teléfono.'
                                        : 'No pudimos guardar el cliente. Revisa los datos e inténtalo nuevamente.'}
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
            {selected && (detail.isLoading || detail.data ? (
                detail.data ? <CustomerDetailPanel customer={detail.data} onClose={() => setSelected(null)} /> : null
            ) : null)}
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
