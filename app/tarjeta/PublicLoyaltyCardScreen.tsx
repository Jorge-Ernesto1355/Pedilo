'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Gift, Stamp, Utensils } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import { normalizeDesign } from '@/app/components/loyalty/loyaltyDesign'
import {
    getPublicLoyaltyCard,
    isLoyaltyCardNotFound,
    type PublicLoyaltyCard,
} from '@/app/components/loyalty/loyaltyPublicApi'
import {
    computeAnimateFrom,
    displayedStamps,
    isCardToken,
    readSeenProgress,
    saveCardToken,
    seenFrom,
    writeSeenProgress,
} from '@/app/components/loyalty/loyaltyStorage'

const shell = 'min-h-[100svh] bg-[#F5F8FC] px-4 py-6 text-[#12234A] sm:py-10'
const primaryLink =
    'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-5 text-base font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25'

const longDate = (value: string) =>
    new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

function Skeleton() {
    return (
        <main className={shell}>
            <div
                data-cy="loyalty-public-skeleton"
                aria-busy="true"
                aria-label="Cargando tu tarjeta"
                className="mx-auto max-w-md animate-pulse space-y-4 motion-reduce:animate-none"
            >
                <div className="h-6 w-40 rounded bg-[#E8EEF6]" />
                <div className="h-56 rounded-3xl bg-[#E8EEF6]" />
                <div className="h-20 rounded-2xl bg-[#EEF2F8]" />
                <div className="h-12 rounded-xl bg-[#E8EEF6]" />
            </div>
        </main>
    )
}

function Message({
    testId,
    title,
    children,
    action,
}: {
    testId: string
    title: string
    children: ReactNode
    action?: ReactNode
}) {
    return (
        <main className={`${shell} grid place-items-center`}>
            <section
                data-cy={testId}
                className="w-full max-w-md rounded-[28px] border border-[#DCE5F3] bg-white p-7 text-center"
            >
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EEF3FF] text-[#2451C5]">
                    <Stamp className="size-6" aria-hidden="true" />
                </span>
                <h1 className="mt-5 font-display text-2xl tracking-[-.04em]">{title}</h1>
                <div className="mt-3 text-sm leading-6 text-[#65738A]">{children}</div>
                {action ? <div className="mt-6">{action}</div> : null}
            </section>
        </main>
    )
}

/** Animación de los sellos que el cliente aún no ha visto (una sola vez por sello). */
function useUnseenAnimation(
    token: string,
    data: Extract<PublicLoyaltyCard, { status: 'ACTIVE' }> | null,
) {
    const progress = data
        ? {
              stampsCount: data.card.stampsCount,
              stampsRequired: data.card.stampsRequired,
              cyclesCompleted: data.card.cyclesCompleted,
              rewardAvailable: data.card.rewards.length > 0,
          }
        : null
    const key = progress
        ? `${progress.cyclesCompleted}:${progress.stampsCount}:${progress.rewardAvailable}`
        : null
    const [animation, setAnimation] = useState<{ key: string; from: number } | null>(null)
    if (progress && key && animation?.key !== key) {
        // Se calcula una sola vez por estado de la tarjeta, antes de marcarlo como visto.
        setAnimation({ key, from: computeAnimateFrom(readSeenProgress(token), progress) })
    }
    useEffect(() => {
        // Se marca como visto de inmediato: recargar la página no repite la animación.
        if (progress) writeSeenProgress(token, seenFrom(progress))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, key])
    return animation?.key === key ? animation.from : null
}

export function PublicLoyaltyCardScreen({ token }: { token: string }) {
    const validFormat = isCardToken(token)
    const query = useQuery({
        queryKey: ['public-loyalty-card', token],
        queryFn: () => getPublicLoyaltyCard(token),
        enabled: validFormat,
        retry: false,
        staleTime: 0,
    })
    const active = query.data?.status === 'ACTIVE' ? query.data : null
    const animateFrom = useUnseenAnimation(token, active)

    // El cliente abrió su link: se recuerda la llave para usar su premio en el checkout.
    const slug = query.data?.restaurant.slug
    useEffect(() => {
        if (slug) saveCardToken(slug, token)
    }, [slug, token])

    if (!validFormat || (query.isError && isLoyaltyCardNotFound(query.error))) {
        return (
            <Message testId="loyalty-public-not-found" title="No encontramos esta tarjeta">
                Revisa que el link esté completo. Si el restaurante te mandó uno nuevo, usa ese.
            </Message>
        )
    }
    if (query.isError) {
        return (
            <Message
                testId="loyalty-public-error"
                title="No pudimos cargar tu tarjeta"
                action={
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className={primaryLink}
                    >
                        Intentar de nuevo
                    </button>
                }
            >
                Revisa tu conexión e intenta de nuevo.
            </Message>
        )
    }
    if (query.isPending || !query.data) return <Skeleton />

    const data = query.data
    if (data.status === 'PAUSED') {
        return (
            <Message
                testId="loyalty-public-paused"
                title={`${data.restaurant.name} pausó su tarjeta de lealtad`}
                action={
                    <Link href={`/${data.restaurant.slug}`} className={primaryLink}>
                        <Utensils className="size-5" aria-hidden="true" /> Ver el menú
                    </Link>
                }
            >
                Tus sellos y premios se conservan. Volverás a verlos cuando el restaurante la
                active.
            </Message>
        )
    }

    const { card, program, restaurant } = data
    const reward = card.rewards[0] ?? null
    const shown = displayedStamps({ ...card, rewardAvailable: Boolean(reward) })

    return (
        <main className={shell}>
            <div className="mx-auto max-w-md">
                <header className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#5F6E86]">
                            Tarjeta de lealtad
                        </p>
                        <h1 className="truncate font-display text-2xl tracking-[-.04em]">
                            {card.customerFirstName
                                ? `Hola, ${card.customerFirstName}`
                                : restaurant.name}
                        </h1>
                    </div>
                </header>

                <LoyaltyCard
                    design={normalizeDesign(data.design, restaurant.name)}
                    stampsCount={shown}
                    stampsRequired={card.stampsRequired}
                    rewardAvailable={Boolean(reward)}
                    rewardLabel={reward?.label ?? program.rewardLabel}
                    restaurantName={restaurant.name}
                    logoUrl={restaurant.logoUrl}
                    customerFirstName={card.customerFirstName}
                    variant="full"
                    animateFrom={animateFrom}
                    vibrate
                />

                {reward ? (
                    <section
                        data-cy="loyalty-public-reward"
                        className="mt-4 rounded-2xl border border-[#B8E2C8] bg-[#F3FAF5] p-4"
                    >
                        <p className="flex items-center gap-2 font-bold text-[#17643A]">
                            <Gift className="size-5" aria-hidden="true" /> Tienes un premio:{' '}
                            {reward.label}
                        </p>
                        <p className="mt-1 text-sm text-[#2F6B48]">
                            {reward.expiresAt
                                ? `Úsalo antes del ${longDate(reward.expiresAt)}.`
                                : 'No tiene fecha de vencimiento.'}{' '}
                            Actívalo al confirmar tu siguiente pedido.
                        </p>
                    </section>
                ) : null}

                <Link
                    href={`/${restaurant.slug}`}
                    data-cy="loyalty-public-order"
                    className={`${primaryLink} mt-4`}
                >
                    <Utensils className="size-5" aria-hidden="true" /> Hacer un pedido
                </Link>

                <section
                    aria-labelledby="loyalty-how-title"
                    className="mt-6 rounded-2xl border border-[#DCE5F3] bg-white p-5"
                >
                    <h2 id="loyalty-how-title" className="font-display text-lg tracking-[-.02em]">
                        Cómo funciona
                    </h2>
                    <ol className="mt-3 space-y-2 text-sm leading-6 text-[#53647D]">
                        <li>1. Haz tu pedido en el menú de {restaurant.name}.</li>
                        <li>
                            2. Cuando lo recibes, te dan un sello
                            {program.minOrderAmount > 0
                                ? ` (pedidos desde $${program.minOrderAmount.toLocaleString('es-MX')})`
                                : ''}
                            .
                        </li>
                        <li>
                            3. Con {program.stampsRequired} sellos ganas {program.rewardLabel} para
                            tu siguiente pedido.
                        </li>
                    </ol>
                </section>

                <section
                    aria-labelledby="loyalty-history-title"
                    className="mt-4 rounded-2xl border border-[#DCE5F3] bg-white p-5"
                >
                    <h2
                        id="loyalty-history-title"
                        className="font-display text-lg tracking-[-.02em]"
                    >
                        Sellos recientes
                    </h2>
                    {card.recentStamps.length === 0 ? (
                        <p className="mt-2 text-sm text-[#65738A]">
                            Aún no tienes sellos. Tu primer sello llega con tu siguiente pedido.
                        </p>
                    ) : (
                        <ul
                            data-cy="loyalty-public-history"
                            className="mt-2 divide-y divide-[#EEF2F7]"
                        >
                            {card.recentStamps.map((stamp, index) => (
                                <li
                                    key={`${stamp.createdAt}-${index}`}
                                    className="flex items-center gap-2 py-2 text-sm text-[#243556]"
                                >
                                    <CalendarCheck
                                        className="size-4 text-[#2451C5]"
                                        aria-hidden="true"
                                    />
                                    {longDate(stamp.createdAt)}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <p className="mt-6 text-center text-xs leading-5 text-[#5F6E86]">
                    Este link es personal: quien lo tenga puede ver tu tarjeta y usar tu premio. No
                    lo compartas.
                </p>
            </div>
        </main>
    )
}
