'use client'

import { Stamp } from 'lucide-react'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import { normalizeDesign } from '@/app/components/loyalty/loyaltyDesign'
import type { PublicLoyaltyProgram } from '@/app/components/loyalty/loyaltyPublicApi'

/**
 * Banda discreta del menú público: la promoción y, si este navegador tiene la tarjeta del
 * cliente, su avance. No estorba al pedir: es una sola línea con una mini vista.
 */
export function LoyaltyMenuBand({
    program,
    progress,
    rewardReady,
}: {
    program: PublicLoyaltyProgram
    progress: { stampsCount: number; stampsRequired: number } | null
    rewardReady: boolean
}) {
    const design = normalizeDesign(program.design, program.restaurant.name)
    const stamps = progress ? Math.min(progress.stampsCount, progress.stampsRequired) : 0
    return (
        <section
            data-cy="menu-loyalty-band"
            aria-label="Tarjeta de lealtad"
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#DCE5F3] bg-white px-4 py-3"
        >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EEF3FF] text-[#2451C5]">
                <Stamp className="size-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 text-sm text-[#243556]">
                <strong className="font-bold text-[#12234A]">
                    Junta {program.stampsRequired} sellos y gana {program.rewardLabel}
                </strong>
                <span className="block text-xs text-[#65738A]">
                    {rewardReady
                        ? 'Tienes un premio listo: úsalo al confirmar tu pedido.'
                        : progress
                          ? `Llevas ${stamps} de ${progress.stampsRequired} sellos.`
                          : program.minOrderAmount > 0
                            ? `Un sello por pedido desde $${program.minOrderAmount.toLocaleString('es-MX')}.`
                            : 'Un sello por cada pedido que recibas.'}
                </span>
            </p>
            <LoyaltyCard
                design={design}
                stampsCount={rewardReady ? program.stampsRequired : stamps}
                stampsRequired={program.stampsRequired}
                rewardAvailable={rewardReady}
                restaurantName={program.restaurant.name}
                variant="compact"
            />
        </section>
    )
}
