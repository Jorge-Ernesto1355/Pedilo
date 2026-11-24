'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Ban,
    CircleX,
    Clock3,
    Link2Off,
    LoaderCircle,
    Navigation,
    PackageCheck,
    Phone,
    Store,
} from 'lucide-react'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import {
    completeCourierDelivery,
    type CourierDelivery,
    type CourierFailureReason,
    courierLinkProblem,
    failCourierDelivery,
    getCourierDelivery,
} from './courierApi'
import {
    addressLine,
    failureReasonLabel,
    failureReasonOptions,
    mapsDirectionsUrl,
    money,
    phoneLabel,
    telHref,
    timeLabel,
} from './courierFormat'
import {
    Card,
    CourierScreen,
    DeliverySkeleton,
    InlineError,
    secondaryButton,
    StateScreen,
    successButton,
    dangerButton,
    dangerOutlineButton,
    compactButton,
} from './CourierScreen'

const CourierDeliveryMap = dynamic(
    () => import('./CourierDeliveryMap').then((module) => module.CourierDeliveryMap),
    {
        ssr: false,
        loading: () => <div className="h-52 w-full animate-pulse bg-[#DCE5F3]" />,
    },
)

/** Mientras la entrega está activa se vuelve a leer para ver si el restaurante la entregó, liberó o canceló. */
const ACTIVE_REFRESH_MS = 20_000

export function CourierDeliveryPage({ token }: { token: string }) {
    const delivery = useQuery({
        queryKey: ['courier-delivery', token],
        queryFn: () => getCourierDelivery(token),
        retry: (count, error) => courierLinkProblem(error) === null && count < 2,
        refetchInterval: (query) => (query.state.data?.isActive ? ACTIVE_REFRESH_MS : false),
        refetchOnWindowFocus: true,
    })

    if (delivery.isPending) {
        return (
            <CourierScreen>
                <DeliverySkeleton />
            </CourierScreen>
        )
    }

    if (delivery.isError) {
        const problem = courierLinkProblem(delivery.error)
        return (
            <CourierScreen>
                {problem === 'expired' ? (
                    <StateScreen
                        cy="courier-delivery-expired"
                        icon={<Clock3 className="size-6" />}
                        tone="amber"
                        title="Este link expiró"
                        text="Las entregas cerradas solo se pueden ver unas horas después."
                    />
                ) : problem === 'not_found' ? (
                    <StateScreen
                        cy="courier-delivery-invalid"
                        icon={<Link2Off className="size-6" />}
                        tone="amber"
                        title="Este link ya no está activo"
                        text="El restaurante liberó la entrega o el link no es válido."
                    />
                ) : (
                    <StateScreen
                        cy="courier-delivery-error"
                        icon={<Link2Off className="size-6" />}
                        tone="amber"
                        title="No pudimos cargar la entrega"
                        text="Revisa tu conexión e intenta de nuevo."
                    >
                        <button
                            type="button"
                            onClick={() => void delivery.refetch()}
                            className={secondaryButton}
                        >
                            Reintentar
                        </button>
                    </StateScreen>
                )}
            </CourierScreen>
        )
    }

    const data = delivery.data
    if (data.status === 'DELIVERED') return <DeliveredScreen delivery={data} />
    if (data.status === 'FAILED') return <FailedScreen delivery={data} />
    if (data.status === 'CANCELLED' || data.status === 'PENDING')
        return <CancelledScreen delivery={data} />
    return <ActiveDelivery token={token} delivery={data} />
}

type Step = 'idle' | 'confirm-delivered' | 'choose-reason'

function ActiveDelivery({ token, delivery }: { token: string; delivery: CourierDelivery }) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState<Step>('idle')
    const [reason, setReason] = useState<CourierFailureReason | null>(null)
    const pickedUp = delivery.status === 'PICKED_UP'

    const action = useMutation({
        mutationFn: (
            input: { kind: 'delivered' } | { kind: 'failed'; reason: CourierFailureReason },
        ) =>
            input.kind === 'delivered'
                ? completeCourierDelivery(token)
                : failCourierDelivery(token, input.reason),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['courier-delivery', token] }),
        onError: () => setStep('idle'),
    })

    const actionError = action.isError ? normalizeApiError(action.error) : null
    const changedMeanwhile =
        actionError?.code === 'DELIVERY_INVALID_TRANSITION' ||
        courierLinkProblem(action.error) !== null

    const footer = pickedUp ? (
        step === 'confirm-delivered' ? (
            <div role="group" aria-label="Confirmar entrega" className="space-y-2">
                <p className="text-base font-semibold text-[#12234A]">
                    {delivery.money.amountCourierCollects > 0
                        ? `¿Entregaste el pedido y cobraste ${money(delivery.money.amountCourierCollects)}?`
                        : '¿Entregaste el pedido?'}
                </p>
                <button
                    type="button"
                    data-cy="courier-confirm-delivered"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ kind: 'delivered' })}
                    className={successButton}
                >
                    {action.isPending && (
                        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    )}
                    Sí, entregado
                </button>
                <button
                    type="button"
                    disabled={action.isPending}
                    onClick={() => setStep('idle')}
                    className={secondaryButton}
                >
                    No
                </button>
            </div>
        ) : step === 'choose-reason' ? (
            <fieldset className="space-y-2">
                <legend className="mb-2 text-base font-semibold text-[#12234A]">
                    ¿Por qué no se pudo entregar?
                </legend>
                <div className="grid grid-cols-2 gap-2">
                    {failureReasonOptions.map((option) => (
                        <label
                            key={option.value}
                            data-cy={`courier-reason-${option.value}`}
                            className={`flex min-h-12 cursor-pointer items-center rounded-xl border px-3 text-sm font-semibold leading-5 transition ${reason === option.value ? 'border-[#B42318] bg-[#FDECEA] text-[#8F1D14]' : 'border-[#D7E1EF] bg-white text-[#243556]'}`}
                        >
                            <input
                                type="radio"
                                name="failure-reason"
                                value={option.value}
                                checked={reason === option.value}
                                onChange={() => setReason(option.value)}
                                className="sr-only"
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
                <button
                    type="button"
                    data-cy="courier-confirm-failed"
                    disabled={!reason || action.isPending}
                    onClick={() => reason && action.mutate({ kind: 'failed', reason })}
                    className={dangerButton}
                >
                    {action.isPending && (
                        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                    )}
                    Confirmar: no se pudo entregar
                </button>
                <button
                    type="button"
                    disabled={action.isPending}
                    onClick={() => {
                        setStep('idle')
                        setReason(null)
                    }}
                    className={secondaryButton}
                >
                    Volver
                </button>
            </fieldset>
        ) : (
            <>
                {actionError && (
                    <InlineError cy="courier-action-error">
                        {changedMeanwhile
                            ? 'La entrega cambió. Revisa su estado.'
                            : 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.'}
                    </InlineError>
                )}
                <button
                    type="button"
                    data-cy="courier-delivered"
                    onClick={() => setStep('confirm-delivered')}
                    className={successButton}
                >
                    <PackageCheck className="size-5" aria-hidden="true" />
                    Entregado
                </button>
                <button
                    type="button"
                    data-cy="courier-failed"
                    onClick={() => setStep('choose-reason')}
                    className={dangerOutlineButton}
                >
                    <CircleX className="size-5" aria-hidden="true" />
                    No se pudo entregar
                </button>
            </>
        )
    ) : undefined

    return (
        <CourierScreen footer={footer}>
            <Card cy="courier-delivery-header" className="space-y-3" padding="p-5">
                <p className="text-sm font-semibold text-[#53647D]">
                    Pedido #{String(delivery.orderNumber).padStart(3, '0')} ·{' '}
                    {delivery.restaurant.name}
                </p>
                <h1
                    data-cy="courier-delivery-title"
                    className="font-display text-2xl font-bold leading-tight"
                >
                    {pickedUp ? 'Lleva el pedido al cliente' : 'Recoge el pedido'}
                </h1>
                {!pickedUp && (
                    <div data-cy="courier-pickup" className="space-y-3">
                        {delivery.restaurant.address && (
                            <p className="flex items-start gap-2 text-base leading-6 text-[#243556]">
                                <Store
                                    className="mt-1 size-4 shrink-0 text-[#2438A8]"
                                    aria-hidden="true"
                                />
                                {delivery.restaurant.address}
                            </p>
                        )}
                        {delivery.restaurant.location && (
                            <a
                                href={mapsDirectionsUrl(delivery.restaurant.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-cy="courier-restaurant-maps"
                                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#2451C5]"
                            >
                                <Navigation className="size-4" aria-hidden="true" />
                                Cómo llegar al restaurante
                            </a>
                        )}
                        <p
                            data-cy="courier-pickup-note"
                            className="rounded-xl bg-[#EEF3FF] px-3.5 py-3 text-sm leading-5 text-[#243556]"
                        >
                            {delivery.money.amountCourierAdvances > 0
                                ? `Al recoger, paga ${money(delivery.money.amountCourierAdvances)} al restaurante. `
                                : 'No tienes que pagar nada al recoger. '}
                            Cuando el restaurante te entregue el pedido, aquí podrás marcarlo como
                            entregado.
                        </p>
                    </div>
                )}
            </Card>

            <Card cy="courier-customer" className="space-y-4 overflow-hidden" padding="p-0">
                <div className="space-y-2 px-4 pt-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7A90]">
                        Entregar a
                    </h2>
                    {delivery.customer.name && (
                        <p data-cy="courier-customer-name" className="text-lg font-bold">
                            {delivery.customer.name}
                        </p>
                    )}
                    <p data-cy="courier-address" className="text-base leading-6 text-[#243556]">
                        {addressLine(delivery.address, delivery.neighborhood)}
                    </p>
                    {delivery.reference && (
                        <p data-cy="courier-reference" className="text-sm leading-5 text-[#53647D]">
                            Referencia: {delivery.reference}
                        </p>
                    )}
                    <p className="text-sm text-[#6B7A90]">
                        {delivery.distanceKm.toLocaleString('es-MX', { maximumFractionDigits: 1 })}{' '}
                        km del restaurante
                    </p>
                </div>
                <div data-cy="courier-map" className="relative z-0 border-y border-[#E8EEF6]">
                    <CourierDeliveryMap
                        destination={delivery.destination}
                        restaurant={pickedUp ? null : delivery.restaurant.location}
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <a
                        href={mapsDirectionsUrl(delivery.destination)}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cy="courier-open-maps"
                        className={compactButton}
                    >
                        <Navigation className="size-4" aria-hidden="true" />
                        Abrir en Maps
                    </a>
                    {delivery.customer.phone ? (
                        <a
                            href={telHref(delivery.customer.phone)}
                            data-cy="courier-call-customer"
                            aria-label={`Llamar al cliente al ${phoneLabel(delivery.customer.phone)}`}
                            className={compactButton}
                        >
                            <Phone className="size-4" aria-hidden="true" />
                            Llamar al cliente
                        </a>
                    ) : (
                        <span />
                    )}
                </div>
            </Card>

            <MoneyCard delivery={delivery} />

            <Card cy="courier-items" className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7A90]">
                    Pedido
                </h2>
                <ul className="divide-y divide-[#E8EEF6]">
                    {delivery.items.map((item, index) => (
                        <li key={`${item.name}-${index}`} className="py-2.5 text-base">
                            <span className="font-bold">{item.quantity}×</span> {item.name}
                            {item.options.length > 0 && (
                                <span className="block text-sm text-[#53647D]">
                                    {item.options.join(' · ')}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
                {delivery.notes && (
                    <p
                        data-cy="courier-notes"
                        className="rounded-xl bg-[#F7F9FC] px-3.5 py-3 text-sm leading-5 text-[#243556]"
                    >
                        Nota: {delivery.notes}
                    </p>
                )}
            </Card>
        </CourierScreen>
    )
}

function MoneyCard({ delivery }: { delivery: CourierDelivery }) {
    const { money: amounts } = delivery
    return (
        <Card cy="courier-money" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6B7A90]">
                Dinero
            </h2>
            <dl className="divide-y divide-[#E8EEF6] text-base">
                <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-[#53647D]">Pagas al restaurante</dt>
                    <dd data-cy="courier-money-advances" className="font-bold">
                        {money(amounts.amountCourierAdvances)}
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-[#53647D]">Cobras al cliente</dt>
                    <dd data-cy="courier-money-collects" className="font-bold">
                        {money(amounts.amountCourierCollects)}
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="font-semibold text-[#1D6B3F]">Tu ganancia</dt>
                    <dd
                        data-cy="courier-money-earnings"
                        className="text-lg font-bold text-[#17643A]"
                    >
                        {money(amounts.courierEarnings)}
                    </dd>
                </div>
            </dl>
            {amounts.paymentMethod === 'TRANSFER' && (
                <p data-cy="courier-money-transfer" className="text-sm leading-5 text-[#53647D]">
                    El cliente ya pagó la comida por transferencia.
                </p>
            )}
        </Card>
    )
}

function closedTitle(delivery: CourierDelivery) {
    return `Pedido #${String(delivery.orderNumber).padStart(3, '0')} de ${delivery.restaurant.name}`
}

function DeliveredScreen({ delivery }: { delivery: CourierDelivery }) {
    const at = timeLabel(delivery.deliveredAt)
    return (
        <CourierScreen>
            <StateScreen
                cy="courier-delivered-state"
                icon={<PackageCheck className="size-6" />}
                tone="green"
                title="Entrega completada"
                text={`${closedTitle(delivery)}${at ? ` · entregado a las ${at}` : ''}`}
            />
            <MoneyCard delivery={delivery} />
        </CourierScreen>
    )
}

function FailedScreen({ delivery }: { delivery: CourierDelivery }) {
    const reason = failureReasonLabel(delivery.failureReason)
    return (
        <CourierScreen>
            <StateScreen
                cy="courier-failed-state"
                icon={<CircleX className="size-6" />}
                tone="red"
                title="No se pudo entregar"
                text={
                    <>
                        {closedTitle(delivery)}.
                        {reason && (
                            <span data-cy="courier-failed-reason" className="block">
                                Motivo: {reason}.
                            </span>
                        )}
                        <span className="block">El restaurante ya lo ve en sus pedidos.</span>
                    </>
                }
            />
        </CourierScreen>
    )
}

function CancelledScreen({ delivery }: { delivery: CourierDelivery }) {
    return (
        <CourierScreen>
            <StateScreen
                cy="courier-cancelled-state"
                icon={<Ban className="size-6" />}
                tone="amber"
                title="El restaurante canceló esta entrega"
                text={`${closedTitle(delivery)}. Ya no tienes que llevarlo.`}
            />
        </CourierScreen>
    )
}
