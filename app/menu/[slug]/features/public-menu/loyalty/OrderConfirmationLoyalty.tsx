'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import { normalizeDesign } from '@/app/components/loyalty/loyaltyDesign'
import {
    getPublicLoyaltyCard,
    type PublicLoyaltyProgram,
} from '@/app/components/loyalty/loyaltyPublicApi'
import { displayedStamps } from '@/app/components/loyalty/loyaltyStorage'

/**
 * Bloque secundario de "Pedido realizado": la tarjeta del cliente con su estado actual
 * (si este navegador la tiene) o la promoción del restaurante. El pago no pierde protagonismo.
 */
export function OrderConfirmationLoyalty({
    program,
    token,
}: {
    program: PublicLoyaltyProgram
    token: string | null
}) {
    const card = useQuery({
        queryKey: ['public-loyalty-card', token],
        queryFn: () => getPublicLoyaltyCard(token!),
        enabled: Boolean(token),
        retry: false,
        staleTime: 0,
    })
    const data = card.data?.status === 'ACTIVE' ? card.data : null

    return (
        <section
            data-cy="order-confirmation-loyalty"
            aria-label="Tu tarjeta de lealtad"
            className="mt-6 border-t border-[#E8EEF6] pt-6 text-left"
        >
            {token && card.isPending ? (
                <div
                    role="status"
                    aria-label="Cargando tu tarjeta"
                    className="h-40 animate-pulse rounded-2xl bg-[#EEF2F8] motion-reduce:animate-none"
                />
            ) : data ? (
                <>
                    <LoyaltyCard
                        design={normalizeDesign(data.design, data.restaurant.name)}
                        stampsCount={displayedStamps({
                            ...data.card,
                            rewardAvailable: data.card.rewards.length > 0,
                        })}
                        stampsRequired={data.card.stampsRequired}
                        rewardAvailable={data.card.rewards.length > 0}
                        rewardLabel={data.card.rewards[0]?.label ?? data.program.rewardLabel}
                        restaurantName={data.restaurant.name}
                        logoUrl={data.restaurant.logoUrl}
                        customerFirstName={data.card.customerFirstName}
                        variant="full"
                    />
                    <p className="mt-3 text-sm text-[#53647D]">
                        Tu sello se agrega cuando recibas tu pedido.
                    </p>
                    <Link
                        href={`/tarjeta/${encodeURIComponent(token!)}`}
                        data-cy="order-confirmation-loyalty-link"
                        className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-[#2451C5] underline underline-offset-2"
                    >
                        Ver mi tarjeta
                    </Link>
                </>
            ) : (
                <p className="text-sm text-[#53647D]">
                    <strong className="font-bold text-[#12234A]">
                        Junta {program.stampsRequired} sellos y gana {program.rewardLabel}.
                    </strong>{' '}
                    Tu sello se agrega cuando recibas tu pedido; el restaurante puede enviarte tu
                    tarjeta por WhatsApp.
                </p>
            )}
        </section>
    )
}
