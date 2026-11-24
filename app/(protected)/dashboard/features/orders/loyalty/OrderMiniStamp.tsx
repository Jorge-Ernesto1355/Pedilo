'use client'

import type { CSSProperties } from 'react'
import { StampIconGlyph, StampShapePath } from '@/app/components/loyalty/LoyaltyGlyphs'
import { designCssVariables } from '@/app/components/loyalty/loyaltyDesign'
import type { LoyaltyProgram } from '@/app/components/loyalty/loyaltyOwnerApi'
import { usePrefersReducedMotion } from '@/app/components/loyalty/usePrefersReducedMotion'

/**
 * Sello en miniatura con el mismo efecto del diseño (micro animación al darlo). Se carga
 * de forma diferida: la comanda no descarga formas ni íconos hasta que hay un sello dado.
 */
export default function OrderMiniStamp({
    program,
    animate,
}: {
    program: LoyaltyProgram
    animate: boolean
}) {
    const reduced = usePrefersReducedMotion()
    const fx = reduced ? 'lc-fx-fade' : `lc-fx-${program.design.animation.stampEffect}`
    return (
        <span
            aria-hidden="true"
            data-cy="order-loyalty-mini-stamp"
            style={designCssVariables(program.design) as CSSProperties}
            className={`grid size-5 place-items-center ${animate ? `lc-slot--enter ${fx}` : ''}`}
        >
            <svg viewBox="0 0 48 48" className="size-5 overflow-visible">
                <g className="lc-ink">
                    <StampShapePath shape={program.design.stamp.shape} fill="var(--lc-stamp)" />
                    <g className="lc-ink-icon">
                        <StampIconGlyph
                            icon={program.design.stamp.icon}
                            color="var(--lc-icon)"
                            size={24}
                        />
                    </g>
                </g>
            </svg>
        </span>
    )
}
