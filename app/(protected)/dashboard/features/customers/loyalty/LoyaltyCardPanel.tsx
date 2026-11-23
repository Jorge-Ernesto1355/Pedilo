'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Gift, KeyRound, LoaderCircle, MessageCircle, Stamp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import type {
    LoyaltyProgram,
    LoyaltyHistoryReward,
    LoyaltyHistoryStamp,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import { displayedStamps } from '@/app/components/loyalty/loyaltyStorage'
import { sendLoyaltyCardByWhatsApp } from './sendLoyaltyCard'
import { useLoyaltyActions, useLoyaltyCardDetail } from './useCustomerLoyalty'

const SOURCE_LABELS: Record<LoyaltyHistoryStamp['source'], string> = {
    ORDER_MANUAL: 'Pedido · manual',
    ORDER_AUTO: 'Pedido · automático',
    WALK_IN: 'En el local',
}

const REWARD_STATUS: Record<LoyaltyHistoryReward['status'], { label: string; className: string }> =
    {
        AVAILABLE: { label: 'Disponible', className: 'bg-[#EAF8EF] text-[#16803D]' },
        REDEEMED: { label: 'Canjeado', className: 'bg-[#EEF3FF] text-[#1E40AF]' },
        EXPIRED: { label: 'Vencido', className: 'bg-[#F1F4F9] text-[#53647D]' },
        VOID: { label: 'Anulado', className: 'bg-[#FFF0EF] text-[#B42318]' },
    }

const dateTime = (value: string) =>
    new Date(value).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })

const button =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-50'

export function LoyaltyCardPanel({
    customerId,
    program,
    restaurantName,
    logoUrl,
    onClose,
}: {
    customerId: string
    program: LoyaltyProgram
    restaurantName: string
    logoUrl: string | null
    onClose: () => void
}) {
    const client = useQueryClient()
    const detail = useLoyaltyCardDetail(customerId)
    const actions = useLoyaltyActions()
    const [note, setNote] = useState('')
    const [noteOpen, setNoteOpen] = useState(false)
    const [voiding, setVoiding] = useState<{ id: string; reason: string } | null>(null)
    const [confirmRotate, setConfirmRotate] = useState(false)
    const [animateFrom, setAnimateFrom] = useState<number | null>(null)
    const [replayKey, setReplayKey] = useState(0)
    const closeRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLElement>(null)

    useEffect(() => {
        closeRef.current?.focus()
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
            if (event.key !== 'Tab') return
            const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            )
            if (!focusable?.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [onClose])

    const data = detail.data
    const available = data?.rewards.find((reward) => reward.status === 'AVAILABLE') ?? null
    const shown = data ? displayedStamps({ ...data.card, rewardAvailable: Boolean(available) }) : 0

    const giveStamp = () => {
        if (!data || actions.stamp.isPending) return
        actions.stamp.mutate(
            { customerId, note: note.trim() || null },
            {
                onSuccess: (result) => {
                    // Se reproduce la animación del sello nuevo en vivo.
                    setAnimateFrom(
                        result.reward ? result.stamp.position - 1 : result.card.stampsCount - 1,
                    )
                    setReplayKey((key) => key + 1)
                    setNote('')
                    setNoteOpen(false)
                },
            },
        )
    }

    const customerName = data?.card.customer.name ?? 'Cliente'

    return (
        <div
            className="fixed inset-0 z-50 bg-[#10224A]/25"
            role="presentation"
            onMouseDown={(event) => {
                if (event.currentTarget === event.target) onClose()
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="loyalty-panel-title"
                data-cy="loyalty-card-panel"
                className="fixed inset-x-0 bottom-[var(--mobile-nav-h,0px)] flex max-h-[min(88svh,calc(100svh-var(--mobile-nav-h,0px)-1rem))] flex-col overflow-hidden rounded-t-[24px] border border-[#DCE5F3] bg-white shadow-[0_-18px_60px_-30px_rgba(13,36,87,.45)] sm:inset-y-0 sm:bottom-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-[24px]"
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8EEF6] px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5F6E86]">
                            Tarjeta de lealtad
                        </p>
                        <h2
                            id="loyalty-panel-title"
                            className="mt-1 truncate font-display text-xl tracking-[-.03em] text-[#12234A]"
                        >
                            {customerName}
                        </h2>
                        {data?.card.customer.phone ? (
                            <p className="text-sm text-[#65738A]">{data.card.customer.phone}</p>
                        ) : null}
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="grid size-11 shrink-0 place-items-center rounded-xl text-[#65738A] hover:bg-[#F1F5FA]"
                    >
                        <X className="size-5" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                    {detail.isLoading ? (
                        <div role="status" aria-label="Cargando tarjeta" className="space-y-3">
                            <div className="h-48 animate-pulse rounded-2xl bg-[#EEF2F8] motion-reduce:animate-none" />
                            <div className="h-11 animate-pulse rounded-xl bg-[#F1F5FA] motion-reduce:animate-none" />
                        </div>
                    ) : detail.isError || !data ? (
                        <div
                            role="alert"
                            className="rounded-xl bg-[#FFF5F4] p-4 text-sm text-[#B42318]"
                        >
                            No pudimos cargar la tarjeta.{' '}
                            <button
                                type="button"
                                onClick={() => void detail.refetch()}
                                className="font-bold underline"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    ) : (
                        <>
                            <LoyaltyCard
                                design={program.design}
                                stampsCount={shown}
                                stampsRequired={data.card.stampsRequired}
                                rewardAvailable={Boolean(available)}
                                rewardLabel={available?.label ?? program.rewardLabel}
                                restaurantName={restaurantName}
                                logoUrl={logoUrl}
                                customerFirstName={customerName.split(' ')[0]}
                                variant="full"
                                animateFrom={animateFrom}
                                replayKey={replayKey}
                            />

                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    data-cy="loyalty-panel-stamp"
                                    onClick={giveStamp}
                                    disabled={actions.stamp.isPending}
                                    aria-busy={actions.stamp.isPending}
                                    className={`${button} bg-[#1E40AF] text-white hover:bg-[#1B3A9E]`}
                                >
                                    {actions.stamp.isPending ? (
                                        <LoaderCircle
                                            aria-hidden="true"
                                            className="size-4 animate-spin"
                                        />
                                    ) : (
                                        <Stamp aria-hidden="true" className="size-4" />
                                    )}
                                    Dar sello
                                </button>
                                <button
                                    type="button"
                                    data-cy="loyalty-panel-whatsapp"
                                    disabled={!data.card.customer.phone}
                                    onClick={() =>
                                        void sendLoyaltyCardByWhatsApp(
                                            client,
                                            customerId,
                                            restaurantName,
                                            program.rewardLabel,
                                        )
                                    }
                                    className={`${button} border border-[#CFE9D9] bg-[#F0FDF7] text-[#17643A]`}
                                >
                                    <MessageCircle aria-hidden="true" className="size-4" />
                                    Enviar por WhatsApp
                                </button>
                            </div>
                            {noteOpen ? (
                                <div className="mt-2">
                                    <label
                                        htmlFor="loyalty-stamp-note"
                                        className="text-sm font-bold text-[#243556]"
                                    >
                                        Nota del sello (opcional)
                                    </label>
                                    <input
                                        id="loyalty-stamp-note"
                                        data-cy="loyalty-panel-note"
                                        value={note}
                                        maxLength={140}
                                        onChange={(event) => setNote(event.target.value)}
                                        placeholder="Ej. compra en caja"
                                        className="mt-1 min-h-11 w-full rounded-xl border border-[#D7E1EF] px-3 py-2.5 text-sm"
                                    />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    data-cy="loyalty-panel-add-note"
                                    onClick={() => setNoteOpen(true)}
                                    className="mt-2 min-h-11 text-sm font-semibold text-[#2451C5]"
                                >
                                    Agregar nota al sello
                                </button>
                            )}
                            <p className="mt-1 text-xs text-[#5F6E86]">
                                Sellos en el local hoy: {data.walkInStampsToday} de{' '}
                                {program.walkInDailyLimit}
                            </p>

                            <section aria-labelledby="loyalty-rewards-title" className="mt-6">
                                <h3
                                    id="loyalty-rewards-title"
                                    className="flex items-center gap-2 text-sm font-bold text-[#12234A]"
                                >
                                    <Gift aria-hidden="true" className="size-4 text-[#2451C5]" />{' '}
                                    Premios
                                </h3>
                                {data.rewards.length === 0 ? (
                                    <p className="mt-2 text-sm text-[#65738A]">
                                        Todavía no completa su tarjeta.
                                    </p>
                                ) : (
                                    <ul className="mt-2 space-y-2">
                                        {data.rewards.map((reward) => (
                                            <li
                                                key={reward.id}
                                                data-cy="loyalty-panel-reward"
                                                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8EEF6] p-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-[#12234A]">
                                                        {reward.label}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-[#65738A]">
                                                        Ganado el {dateTime(reward.createdAt)}
                                                        {reward.expiresAt &&
                                                        reward.status === 'AVAILABLE'
                                                            ? ` · vence el ${new Date(reward.expiresAt).toLocaleDateString('es-MX')}`
                                                            : ''}
                                                        {reward.redeemedAt
                                                            ? ` · canjeado el ${dateTime(reward.redeemedAt)}`
                                                            : ''}
                                                        {reward.redeemedOrderNumber
                                                            ? ` · pedido #${reward.redeemedOrderNumber}`
                                                            : ''}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-2">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${REWARD_STATUS[reward.status].className}`}
                                                    >
                                                        {REWARD_STATUS[reward.status].label}
                                                    </span>
                                                    {reward.status === 'AVAILABLE' ? (
                                                        <button
                                                            type="button"
                                                            data-cy="loyalty-panel-redeem"
                                                            disabled={actions.redeem.isPending}
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        `¿Canjear "${reward.label}" en el local?`,
                                                                    )
                                                                ) {
                                                                    actions.redeem.mutate({
                                                                        rewardId: reward.id,
                                                                        customerId,
                                                                    })
                                                                }
                                                            }}
                                                            className="min-h-9 rounded-lg border border-[#D7E1EF] px-2.5 text-xs font-bold text-[#243556]"
                                                        >
                                                            Canjear
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section aria-labelledby="loyalty-history-title" className="mt-6">
                                <h3
                                    id="loyalty-history-title"
                                    className="text-sm font-bold text-[#12234A]"
                                >
                                    Historial de sellos
                                </h3>
                                {data.stamps.length === 0 ? (
                                    <p className="mt-2 text-sm text-[#65738A]">
                                        Aún no tiene sellos. Dale el primero.
                                    </p>
                                ) : (
                                    <ol className="mt-2 divide-y divide-[#EEF2F7] rounded-xl border border-[#E8EEF6]">
                                        {data.stamps.map((stamp) => (
                                            <li
                                                key={stamp.id}
                                                data-cy="loyalty-history-stamp"
                                                data-voided={stamp.voidedAt ? 'true' : 'false'}
                                                className="p-3"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div
                                                        className={`min-w-0 text-sm ${stamp.voidedAt ? 'text-[#5F6E86]' : 'text-[#243556]'}`}
                                                    >
                                                        <p
                                                            className={`font-semibold ${stamp.voidedAt ? 'line-through' : ''}`}
                                                        >
                                                            {SOURCE_LABELS[stamp.source]}
                                                            {stamp.orderNumber
                                                                ? ` #${stamp.orderNumber}`
                                                                : ''}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-[#65738A]">
                                                            {dateTime(stamp.createdAt)} ·{' '}
                                                            {stamp.createdBy ?? 'Automático'}
                                                        </p>
                                                        {stamp.note ? (
                                                            <p className="mt-0.5 text-xs text-[#65738A]">
                                                                Nota: {stamp.note}
                                                            </p>
                                                        ) : null}
                                                        {stamp.voidedAt ? (
                                                            <p className="mt-0.5 text-xs font-semibold text-[#B42318]">
                                                                Anulado el{' '}
                                                                {dateTime(stamp.voidedAt)}
                                                                {stamp.voidedBy
                                                                    ? ` por ${stamp.voidedBy}`
                                                                    : ''}
                                                                : {stamp.voidedReason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    {!stamp.voidedAt && voiding?.id !== stamp.id ? (
                                                        <button
                                                            type="button"
                                                            data-cy="loyalty-history-void"
                                                            onClick={() =>
                                                                setVoiding({
                                                                    id: stamp.id,
                                                                    reason: '',
                                                                })
                                                            }
                                                            className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-bold text-[#B42318] hover:bg-[#FFF0EF]"
                                                        >
                                                            Anular
                                                        </button>
                                                    ) : null}
                                                </div>
                                                {voiding?.id === stamp.id ? (
                                                    <form
                                                        className="mt-2 grid gap-2"
                                                        onSubmit={(event) => {
                                                            event.preventDefault()
                                                            if (voiding.reason.trim().length < 3)
                                                                return
                                                            actions.voidStamp.mutate(
                                                                {
                                                                    stampId: stamp.id,
                                                                    reason: voiding.reason.trim(),
                                                                    customerId,
                                                                },
                                                                {
                                                                    onSuccess: () =>
                                                                        setVoiding(null),
                                                                },
                                                            )
                                                        }}
                                                    >
                                                        <label
                                                            htmlFor={`void-${stamp.id}`}
                                                            className="text-xs font-bold text-[#243556]"
                                                        >
                                                            Motivo de la anulación
                                                        </label>
                                                        <input
                                                            id={`void-${stamp.id}`}
                                                            data-cy="loyalty-void-reason"
                                                            value={voiding.reason}
                                                            maxLength={140}
                                                            autoFocus
                                                            onChange={(event) =>
                                                                setVoiding({
                                                                    id: stamp.id,
                                                                    reason: event.target.value,
                                                                })
                                                            }
                                                            className="min-h-11 rounded-xl border border-[#D7E1EF] px-3 text-sm"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="submit"
                                                                data-cy="loyalty-void-confirm"
                                                                disabled={
                                                                    voiding.reason.trim().length <
                                                                        3 ||
                                                                    actions.voidStamp.isPending
                                                                }
                                                                className={`${button} bg-[#B42318] text-white`}
                                                            >
                                                                Anular sello
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setVoiding(null)}
                                                                className={`${button} border border-[#D7E1EF] text-[#243556]`}
                                                            >
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>

                            <section className="mt-6 rounded-xl bg-[#F7F9FD] p-3 text-xs text-[#53647D]">
                                <p>
                                    El link de la tarjeta es privado: quien lo tiene puede ver la
                                    tarjeta y usar el premio.
                                </p>
                                {confirmRotate ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            data-cy="loyalty-rotate-confirm"
                                            disabled={actions.rotate.isPending}
                                            onClick={() =>
                                                actions.rotate.mutate(
                                                    { customerId },
                                                    { onSuccess: () => setConfirmRotate(false) },
                                                )
                                            }
                                            className={`${button} bg-[#12234A] text-white`}
                                        >
                                            Sí, regenerar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmRotate(false)}
                                            className={`${button} border border-[#D7E1EF] text-[#243556]`}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        data-cy="loyalty-rotate"
                                        onClick={() => setConfirmRotate(true)}
                                        className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-[#2451C5]"
                                    >
                                        <KeyRound aria-hidden="true" className="size-4" /> Regenerar
                                        link (el anterior deja de funcionar)
                                    </button>
                                )}
                            </section>
                        </>
                    )}
                </div>
            </section>
        </div>
    )
}
