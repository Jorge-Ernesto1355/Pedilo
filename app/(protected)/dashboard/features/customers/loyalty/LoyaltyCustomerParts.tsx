'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Eye, Gift, LoaderCircle, MessageCircle, Stamp } from 'lucide-react'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import type {
    LoyaltyCardFilter,
    LoyaltyCardListItem,
    LoyaltyProgram,
    LoyaltySummary,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import { displayedStamps } from '@/app/components/loyalty/loyaltyStorage'
import { sendLoyaltyCardByWhatsApp } from './sendLoyaltyCard'
import { useLoyaltyActions } from './useCustomerLoyalty'

/** Tres métricas sencillas arriba de Clientes. */
export function LoyaltyMetrics({
    summary,
    loading,
}: {
    summary?: LoyaltySummary
    loading: boolean
}) {
    const items = [
        { key: 'active', label: 'Tarjetas activas', value: summary?.activeCards },
        { key: 'week', label: 'Sellos de esta semana', value: summary?.stampsThisWeek },
        { key: 'pending', label: 'Premios por canjear', value: summary?.pendingRewards },
    ]
    return (
        <dl
            data-cy="loyalty-metrics"
            className="grid grid-cols-3 divide-x divide-[#E8EEF6] rounded-2xl border border-[#DCE5F3] bg-white"
        >
            {items.map((item) => (
                <div key={item.key} className="min-w-0 px-3 py-3 sm:px-5">
                    <dt className="text-[11px] font-semibold leading-4 text-[#65738A] sm:text-xs">
                        {item.label}
                    </dt>
                    <dd
                        data-cy={`loyalty-metric-${item.key}`}
                        className="mt-1 font-display text-xl tracking-[-.03em] text-[#12234A] sm:text-2xl"
                    >
                        {loading || item.value === undefined ? (
                            <span className="inline-block h-6 w-8 animate-pulse rounded bg-[#EEF2F8] motion-reduce:animate-none" />
                        ) : (
                            item.value
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    )
}

const FILTERS: { value: LoyaltyCardFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'near', label: 'Cerca del premio' },
    { value: 'reward', label: 'Con premio disponible' },
]

export function LoyaltyFilterTabs({
    value,
    onChange,
}: {
    value: LoyaltyCardFilter
    onChange: (value: LoyaltyCardFilter) => void
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Filtrar por tarjeta de lealtad"
            className="flex gap-1 overflow-x-auto rounded-xl bg-[#F1F4F9] p-1"
        >
            {FILTERS.map((filter) => (
                <button
                    key={filter.value}
                    type="button"
                    role="radio"
                    aria-checked={value === filter.value}
                    data-cy={`loyalty-filter-${filter.value}`}
                    onClick={() => onChange(filter.value)}
                    className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold transition ${
                        value === filter.value
                            ? 'bg-white text-[#12234A] shadow-[0_1px_3px_rgb(18_35_74/0.12)]'
                            : 'text-[#53647D] hover:text-[#12234A]'
                    }`}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    )
}

/** Avance compacto de un cliente ("5 de 8" con puntos) y etiqueta si tiene premio. */
export function LoyaltyProgress({
    card,
    program,
    restaurantName,
}: {
    card: LoyaltyCardListItem | null | undefined
    program: LoyaltyProgram
    restaurantName: string
}) {
    const rewardAvailable = (card?.availableRewards ?? 0) > 0
    const shown = card
        ? displayedStamps({
              stampsCount: card.stampsCount,
              stampsRequired: program.stampsRequired,
              cyclesCompleted: card.cyclesCompleted,
              rewardAvailable,
          })
        : 0
    return (
        <div data-cy="customer-loyalty-progress" className="flex min-w-0 items-center">
            <LoyaltyCard
                design={program.design}
                stampsCount={shown}
                stampsRequired={program.stampsRequired}
                rewardAvailable={rewardAvailable}
                restaurantName={restaurantName}
                variant="compact"
            />
        </div>
    )
}

const menuItem =
    'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#53647D] hover:bg-[#EEF3FF] disabled:cursor-not-allowed disabled:opacity-45'

/** Opciones de lealtad del menú de tres puntos de cada cliente. */
export function LoyaltyMenuActions({
    customer,
    card,
    program,
    restaurantName,
    onView,
    onDone,
}: {
    customer: { id: string; name: string | null; phone: string | null }
    card: LoyaltyCardListItem | null | undefined
    program: LoyaltyProgram
    restaurantName: string
    onView: () => void
    onDone: () => void
}) {
    const client = useQueryClient()
    const actions = useLoyaltyActions()
    const stamping = actions.stamp.isPending && actions.stamp.variables?.customerId === customer.id
    const rewardAvailable = (card?.availableRewards ?? 0) > 0
    return (
        <>
            <button
                type="button"
                role="menuitem"
                data-cy="customer-loyalty-view"
                onClick={onView}
                className={menuItem}
            >
                <Eye className="size-4" aria-hidden="true" /> Ver tarjeta
            </button>
            <button
                type="button"
                role="menuitem"
                data-cy="customer-loyalty-stamp"
                disabled={stamping}
                aria-busy={stamping}
                onClick={() => {
                    actions.stamp.mutate({ customerId: customer.id, note: null })
                    onDone()
                }}
                className={menuItem}
            >
                {stamping ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                    <Stamp className="size-4" aria-hidden="true" />
                )}{' '}
                Dar sello
            </button>
            <button
                type="button"
                role="menuitem"
                data-cy="customer-loyalty-whatsapp"
                disabled={!customer.phone}
                title={!customer.phone ? 'El cliente no tiene teléfono registrado' : undefined}
                onClick={() => {
                    void sendLoyaltyCardByWhatsApp(
                        client,
                        customer.id,
                        restaurantName,
                        program.rewardLabel,
                    )
                    onDone()
                }}
                className={menuItem}
            >
                <MessageCircle className="size-4" aria-hidden="true" /> Enviar tarjeta por WhatsApp
            </button>
            {rewardAvailable ? (
                <button
                    type="button"
                    role="menuitem"
                    data-cy="customer-loyalty-redeem"
                    onClick={onView}
                    className={menuItem}
                >
                    <Gift className="size-4" aria-hidden="true" /> Canjear premio
                </button>
            ) : null}
        </>
    )
}

/** Lista de "Cerca del premio" / "Con premio disponible" (viene de las tarjetas). */
export function LoyaltyFilteredList({
    cards,
    loading,
    error,
    onRetry,
    filter,
    program,
    restaurantName,
    onView,
}: {
    cards: LoyaltyCardListItem[] | undefined
    loading: boolean
    error: boolean
    onRetry: () => void
    filter: LoyaltyCardFilter
    program: LoyaltyProgram
    restaurantName: string
    onView: (customerId: string) => void
}) {
    if (loading) {
        return (
            <div role="status" aria-label="Cargando clientes" className="space-y-2">
                {[0, 1, 2].map((item) => (
                    <div
                        key={item}
                        className="h-16 animate-pulse rounded-2xl bg-[#F1F5FA] motion-reduce:animate-none"
                    />
                ))}
            </div>
        )
    }
    if (error) {
        return (
            <div role="alert" className="rounded-2xl bg-[#FFF5F4] p-4 text-sm text-[#B42318]">
                No pudimos cargar esta lista.{' '}
                <button type="button" onClick={onRetry} className="font-bold underline">
                    Intentar de nuevo
                </button>
            </div>
        )
    }
    if (!cards?.length) {
        return (
            <p
                data-cy="loyalty-filter-empty"
                className="rounded-2xl border border-dashed border-[#D7E1EF] bg-white p-6 text-center text-sm text-[#65738A]"
            >
                {filter === 'near'
                    ? 'Nadie está a 1 o 2 sellos de su premio por ahora.'
                    : 'No hay premios pendientes de canjear.'}
            </p>
        )
    }
    return (
        <ul
            data-cy="loyalty-filtered-list"
            className="divide-y divide-[#E8EEF6] rounded-2xl border border-[#DCE5F3] bg-white"
        >
            {cards.map((card) => (
                <li
                    key={card.id}
                    data-cy="loyalty-filtered-row"
                    className="flex flex-wrap items-center gap-3 p-4 sm:px-5"
                >
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#12234A]">
                            {card.customer.name ?? 'Cliente'}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-[#65738A]">
                            {card.customer.phone}
                        </p>
                    </div>
                    <LoyaltyProgress
                        card={card}
                        program={program}
                        restaurantName={restaurantName}
                    />
                    <button
                        type="button"
                        onClick={() => onView(card.customer.id)}
                        className="min-h-11 rounded-xl border border-[#D7E1EF] px-3 text-sm font-bold text-[#243556]"
                    >
                        Ver tarjeta
                    </button>
                </li>
            ))}
        </ul>
    )
}
