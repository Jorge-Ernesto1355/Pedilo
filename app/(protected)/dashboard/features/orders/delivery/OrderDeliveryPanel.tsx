'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
    BadgeCheck,
    Bike,
    CircleX,
    HandCoins,
    LoaderCircle,
    MessageCircle,
    PackageCheck,
    Phone,
    Share2,
    TriangleAlert,
    Undo2,
} from 'lucide-react'
import type { Order } from '@/src/lib/api/order-types'
import { formatBusinessTime, formatMoney } from '../../dashboard-data/formatters'
import {
    canFindCourier,
    courierOfferLink,
    courierOfferMessage,
    customerWhatsAppUrl,
    failureReasonLabels,
    isOfferUntakenTooLong,
    needsTransferConfirmation,
    onTheWayMessage,
    shareCourierOffer,
} from './deliveryDispatch'
import {
    deliveryActionErrorMessage,
    useDeliveryActions,
    useOfferTokenStore,
    type DeliveryAction,
} from './useDeliveryActions'
import { useLoyaltyMessageLine } from '../loyalty/useLoyaltyMessageLine'

type Variant = 'card' | 'detail'

type Props = {
    order: Order
    businessName: string
    currency: string
    timezone: string
    variant?: Variant
}

/** Re-render periódico solo mientras hace falta (aviso de oferta sin tomar). */
function useNow(active: boolean, intervalMs = 30_000) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!active) return
        const tick = () => setNow(Date.now())
        const first = window.setTimeout(tick, 0)
        const timer = window.setInterval(tick, intervalMs)
        return () => {
            window.clearTimeout(first)
            window.clearInterval(timer)
        }
    }, [active, intervalMs])
    return now
}

function minutesAgo(iso: string, now: number) {
    const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
    if (!Number.isFinite(minutes) || minutes < 1) return 'hace un momento'
    return minutes === 1 ? 'hace 1 min' : `hace ${minutes} min`
}

function phoneLabel(phone: string) {
    const digits = phone.replace(/\D/g, '')
    return digits.length === 10
        ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
        : phone
}

/**
 * Estado y acciones de la entrega con repartidor en la comanda. Solo pedidos a domicilio.
 * El restaurante ve nombre y teléfono únicamente del repartidor que tomó SU entrega.
 */
export function OrderDeliveryPanel({
    order,
    businessName,
    currency,
    timezone,
    variant = 'card',
}: Props) {
    const dispatch = order.dispatch ?? null
    const mutation = useDeliveryActions(order.id)
    const offerToken = useOfferTokenStore((state) => state.tokens[order.id])
    const [confirming, setConfirming] = useState<'handOff' | 'release' | null>(null)
    const now = useNow(dispatch?.status === 'PENDING')
    const deliveryFee = dispatch?.deliveryFee ?? order.deliveryFee ?? 0
    const money = (value: number) => formatMoney(value, currency)
    const buttonSize = variant === 'detail' ? 'min-h-11 px-4 text-sm' : 'min-h-10 px-3 text-xs'
    const busy = mutation.isPending
    // Tarjeta de lealtad: se suma una línea al aviso "En camino" (solo si ya tiene tarjeta).
    const loyaltyLine = useLoyaltyMessageLine(
        dispatch?.status === 'PICKED_UP' ? order.customerId : null,
    )

    if (order.fulfillmentType !== 'DELIVERY' || order.status === 'CANCELLED') return null

    function share(token: string) {
        const link = courierOfferLink(window.location.origin, token)
        void shareCourierOffer(courierOfferMessage({ businessName, deliveryFee, link }))
    }

    function run(action: DeliveryAction, onDone?: (result: { offerToken?: string }) => void) {
        setConfirming(null)
        mutation.mutate(action, { onSuccess: (result) => onDone?.(result) })
    }

    const primaryButton = `inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1D5BFF] font-bold text-white transition hover:bg-[#174BD4] focus:outline-none focus:ring-2 focus:ring-[#1D5BFF]/30 disabled:cursor-wait disabled:opacity-60 ${buttonSize}`
    const secondaryButton = `inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D7E1EF] bg-white font-bold text-[#243556] transition hover:border-[#B9CDFD] focus:outline-none focus:ring-2 focus:ring-[#1D5BFF]/20 disabled:cursor-wait disabled:opacity-60 ${buttonSize}`
    const spinner = <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />

    let body: ReactNode = null

    if (needsTransferConfirmation(order)) {
        body = (
            <>
                <StatusLine icon={<HandCoins className="size-4" />} tone="amber">
                    Confirma que recibiste la transferencia para buscar repartidor.
                </StatusLine>
                <Actions>
                    <button
                        type="button"
                        data-cy="delivery-confirm-transfer"
                        disabled={busy}
                        onClick={() => run('confirmTransfer')}
                        className={secondaryButton}
                    >
                        {busy ? spinner : <BadgeCheck className="size-3.5" aria-hidden="true" />}
                        Marcar transferencia recibida
                    </button>
                </Actions>
            </>
        )
    } else if (!dispatch && order.status === 'PENDING') {
        body = (
            <StatusLine icon={<Bike className="size-4" />}>
                Acepta el pedido para buscar repartidor.
            </StatusLine>
        )
    } else if (!dispatch && canFindCourier(order)) {
        body = (
            <>
                <StatusLine icon={<Bike className="size-4" />}>
                    Sin repartidor. Quien lo tome gana {money(deliveryFee)} de envío.
                </StatusLine>
                <Actions>
                    <button
                        type="button"
                        data-cy="delivery-find-courier"
                        disabled={busy}
                        onClick={() =>
                            run('findCourier', (result) => {
                                if (result.offerToken) share(result.offerToken)
                            })
                        }
                        className={primaryButton}
                    >
                        {busy ? spinner : <Share2 className="size-3.5" aria-hidden="true" />}
                        Buscar repartidor
                    </button>
                </Actions>
            </>
        )
    } else if (dispatch?.status === 'PENDING') {
        const untaken = isOfferUntakenTooLong(dispatch, now)
        body = (
            <>
                <StatusLine icon={<Bike className="size-4" />}>
                    Buscando repartidor · publicada {minutesAgo(dispatch.offerCreatedAt, now)}
                </StatusLine>
                {untaken && (
                    <p
                        data-cy="delivery-untaken-warning"
                        role="status"
                        className="flex items-start gap-1.5 rounded-lg bg-[#FFF8E6] px-2.5 py-2 text-xs leading-5 text-[#8A5A00]"
                    >
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        Nadie la ha tomado en más de 5 minutos. Compártela con más repartidores.
                    </p>
                )}
                <Actions>
                    {offerToken ? (
                        <button
                            type="button"
                            data-cy="delivery-share"
                            onClick={() => share(offerToken)}
                            className={untaken ? primaryButton : secondaryButton}
                        >
                            <Share2 className="size-3.5" aria-hidden="true" />
                            Compartir
                        </button>
                    ) : (
                        <button
                            type="button"
                            data-cy="delivery-share-again"
                            disabled={busy}
                            onClick={() =>
                                run('findCourier', (result) => {
                                    if (result.offerToken) share(result.offerToken)
                                })
                            }
                            title="Genera un link nuevo; el anterior deja de funcionar"
                            className={untaken ? primaryButton : secondaryButton}
                        >
                            {busy ? spinner : <Share2 className="size-3.5" aria-hidden="true" />}
                            Compartir de nuevo
                        </button>
                    )}
                </Actions>
            </>
        )
    } else if (dispatch?.status === 'ACCEPTED' && dispatch.courier) {
        const advance = dispatch.amountCourierAdvances
        body = (
            <>
                <CourierLine
                    label="Tomó la entrega"
                    courier={dispatch.courier}
                    icon={<Bike className="size-4" />}
                />
                <p className="text-xs leading-5 text-[#53647D]">
                    {advance > 0
                        ? `Al recoger te paga ${money(advance)} (la comida).`
                        : 'No te paga nada al recoger: la comida ya se pagó por transferencia.'}
                </p>
                {confirming === 'handOff' ? (
                    <Confirm
                        text={
                            advance > 0
                                ? `¿Ya recibiste ${money(advance)} del repartidor y le entregaste el pedido?`
                                : '¿Ya le entregaste el pedido al repartidor?'
                        }
                        confirmLabel="Sí, ya se lo di"
                        confirmCy="delivery-handoff-confirm"
                        onConfirm={() => run('handOff')}
                        onCancel={() => setConfirming(null)}
                        busy={busy}
                        buttonSize={buttonSize}
                    />
                ) : confirming === 'release' ? (
                    <Confirm
                        text={`¿Quitarle la entrega a ${dispatch.courier.name}? Su link deja de funcionar y la oferta se publica de nuevo.`}
                        confirmLabel="Sí, liberar"
                        confirmCy="delivery-release-confirm"
                        onConfirm={() => run('release')}
                        onCancel={() => setConfirming(null)}
                        busy={busy}
                        buttonSize={buttonSize}
                        tone="danger"
                    />
                ) : (
                    <Actions>
                        <button
                            type="button"
                            data-cy="delivery-handoff"
                            disabled={busy}
                            onClick={() => setConfirming('handOff')}
                            className={primaryButton}
                        >
                            <PackageCheck className="size-3.5" aria-hidden="true" />
                            {advance > 0
                                ? `Entregado al repartidor (recibí ${money(advance)})`
                                : 'Entregado al repartidor'}
                        </button>
                        <button
                            type="button"
                            data-cy="delivery-release"
                            disabled={busy}
                            onClick={() => setConfirming('release')}
                            className={secondaryButton}
                        >
                            <Undo2 className="size-3.5" aria-hidden="true" />
                            Liberar
                        </button>
                    </Actions>
                )}
            </>
        )
    } else if (dispatch?.status === 'PICKED_UP' && dispatch.courier) {
        const notifyUrl = customerWhatsAppUrl(
            order.customerPhone,
            [
                onTheWayMessage({
                    customerName: order.customerName,
                    businessName,
                    orderNumber: order.orderNumber,
                    courierName: dispatch.courier.name,
                    amountToPay: dispatch.amountCourierCollects,
                }),
                ...(loyaltyLine ? [loyaltyLine] : []),
            ].join('\n'),
        )
        body = (
            <>
                <CourierLine
                    label="En camino con"
                    courier={dispatch.courier}
                    icon={<Bike className="size-4" />}
                />
                {dispatch.amountCourierCollects > 0 && (
                    <p className="text-xs leading-5 text-[#53647D]">
                        Le cobra al cliente {money(dispatch.amountCourierCollects)}.
                    </p>
                )}
                {notifyUrl && (
                    <Actions>
                        <a
                            href={notifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cy="delivery-notify-customer"
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#B8DDC6] bg-[#F3FBF5] font-bold text-[#17643A] transition hover:bg-[#E8F6EE] focus:outline-none focus:ring-2 focus:ring-[#23814C]/25 ${buttonSize}`}
                        >
                            <MessageCircle className="size-3.5" aria-hidden="true" />
                            Avisar al cliente
                        </a>
                    </Actions>
                )}
            </>
        )
    } else if (dispatch?.status === 'DELIVERED') {
        body = (
            <StatusLine icon={<PackageCheck className="size-4" />} tone="green">
                Entregado
                {dispatch.courier ? ` por ${dispatch.courier.name}` : ''}
                {dispatch.deliveredAt
                    ? ` a las ${formatBusinessTime(dispatch.deliveredAt, timezone)}`
                    : ''}
            </StatusLine>
        )
    } else if (dispatch?.status === 'FAILED') {
        body = (
            <>
                <StatusLine icon={<CircleX className="size-4" />} tone="red">
                    No se pudo entregar
                    {dispatch.failureReason
                        ? ` · ${failureReasonLabels[dispatch.failureReason]}`
                        : ''}
                </StatusLine>
                <p className="text-xs leading-5 text-[#53647D]">
                    Si ya no se va a entregar, cancela el pedido.
                </p>
            </>
        )
    }

    if (!body) return null

    return (
        <section
            data-cy="delivery-panel"
            data-dispatch-status={dispatch?.status ?? 'NONE'}
            aria-label="Entrega a domicilio"
            className={
                variant === 'detail'
                    ? 'space-y-2.5 rounded-2xl border border-[#E8EEF6] p-4'
                    : 'space-y-2 border-t border-[#E8EEF6] px-4 py-3'
            }
        >
            {body}
            {mutation.isError && (
                <p
                    data-cy="delivery-error"
                    role="alert"
                    className="text-xs font-medium text-[#B42318]"
                >
                    {deliveryActionErrorMessage(mutation.error)}
                </p>
            )}
        </section>
    )
}

function StatusLine({
    icon,
    tone = 'neutral',
    children,
}: {
    icon: ReactNode
    tone?: 'neutral' | 'amber' | 'green' | 'red'
    children: ReactNode
}) {
    const color = {
        neutral: 'text-[#243556]',
        amber: 'text-[#8A5A00]',
        green: 'text-[#1D6B3F]',
        red: 'text-[#B42318]',
    }[tone]
    return (
        <p
            data-cy="delivery-status"
            className={`flex items-start gap-2 text-sm font-semibold ${color}`}
        >
            <span className="mt-0.5 shrink-0" aria-hidden="true">
                {icon}
            </span>
            <span className="min-w-0">{children}</span>
        </p>
    )
}

function CourierLine({
    label,
    courier,
    icon,
}: {
    label: string
    courier: { name: string; phone: string }
    icon: ReactNode
}) {
    return (
        <div data-cy="delivery-courier" className="flex items-start gap-2 text-sm text-[#243556]">
            <span className="mt-0.5 shrink-0" aria-hidden="true">
                {icon}
            </span>
            <p className="min-w-0">
                <span className="text-[#53647D]">{label} </span>
                <strong className="font-semibold">{courier.name}</strong>
                <a
                    href={`tel:+52${courier.phone.replace(/\D/g, '').slice(-10)}`}
                    className="ml-2 inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[#2451C5] underline-offset-2 hover:underline"
                >
                    <Phone className="size-3" aria-hidden="true" />
                    {phoneLabel(courier.phone)}
                </a>
            </p>
        </div>
    )
}

function Actions({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

export function Confirm({
    text,
    confirmLabel,
    confirmCy,
    onConfirm,
    onCancel,
    busy,
    buttonSize,
    tone = 'primary',
}: {
    text: string
    confirmLabel: string
    confirmCy: string
    onConfirm: () => void
    onCancel: () => void
    busy: boolean
    buttonSize: string
    tone?: 'primary' | 'danger'
}) {
    return (
        <div
            role="group"
            aria-label="Confirmar acción"
            className="space-y-2 rounded-xl border border-[#D7E1EF] bg-[#F7F9FC] p-3"
        >
            <p className="text-xs font-semibold leading-5 text-[#243556]">{text}</p>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    data-cy={confirmCy}
                    disabled={busy}
                    onClick={onConfirm}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold text-white transition disabled:cursor-wait disabled:opacity-60 ${tone === 'danger' ? 'bg-[#B42318] hover:bg-[#962014]' : 'bg-[#23814C] hover:bg-[#1D6B3F]'} ${buttonSize}`}
                >
                    {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
                    {confirmLabel}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                    className={`inline-flex items-center justify-center rounded-xl border border-[#D7E1EF] bg-white font-bold text-[#53647D] transition hover:border-[#B9CDFD] ${buttonSize}`}
                >
                    No
                </button>
            </div>
        </div>
    )
}
