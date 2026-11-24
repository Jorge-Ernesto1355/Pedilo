'use client'

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { ProgressiveImage } from '@/app/(protected)/create-menu/features/business-profile/ProgressiveImage'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import { GiftGlyph, StampIconGlyph, StampShapePath } from './LoyaltyGlyphs'
import {
    designCssVariables,
    EFFECT_DURATION_MS,
    gridColumns,
    progressText,
    SPEED_MULTIPLIER,
    type LoyaltyDesign,
} from './loyaltyDesign'

export { usePrefersReducedMotion }

export type LoyaltyCardVariant = 'full' | 'compact' | 'preview'

export type LoyaltyCardProps = {
    design: LoyaltyDesign
    stampsCount: number
    stampsRequired: number
    rewardAvailable: boolean
    rewardLabel?: string | null
    restaurantName: string
    logoUrl?: string | null
    customerFirstName?: string | null
    variant?: LoyaltyCardVariant
    /** Anima los sellos desde este número (los que el cliente aún no ha visto). */
    animateFrom?: number | null
    /** Cambiarlo fuerza la reproducción (botón "Probar animación" del editor). */
    replayKey?: number
    /** Vibración corta al sellar (solo página pública, si el navegador la soporta). */
    vibrate?: boolean
    onAnimationEnd?: () => void
    className?: string
}

/** Retraso entre sellos nuevos consecutivos (ms, antes del multiplicador de velocidad). */
const STAGGER_MS = 220
const CELEBRATION_MS = { confetti: 1500, sparkles: 1100, glow: 1200, none: 0 } as const
const REDUCED_FADE_MS = 200

type Phase = 'stamping' | 'celebrating' | 'done'

export function LoyaltyCard({
    design,
    stampsCount,
    stampsRequired,
    rewardAvailable,
    rewardLabel,
    restaurantName,
    logoUrl,
    customerFirstName,
    variant = 'full',
    animateFrom = null,
    replayKey = 0,
    vibrate = false,
    onAnimationEnd,
    className = '',
}: LoyaltyCardProps) {
    const uid = useId().replace(/:/g, '')
    const reduced = usePrefersReducedMotion()
    const required = Math.max(1, stampsRequired)
    const filled = Math.min(Math.max(0, stampsCount), required)
    const complete = filled >= required
    const from =
        animateFrom === null || animateFrom === undefined
            ? filled
            : Math.min(Math.max(0, animateFrom), filled)
    const animating = variant !== 'compact' && from < filled
    const runKey = animating ? `${from}-${filled}-${replayKey}` : null
    const speed = SPEED_MULTIPLIER[design.animation.speed]
    const effect = design.animation.stampEffect
    const completion = reduced ? 'none' : design.animation.completionEffect
    const [progress, setProgress] = useState<{ key: string | null; phase: Phase }>({
        key: null,
        phase: 'done',
    })
    const [announcement, setAnnouncement] = useState('')
    const phase: Phase = runKey && progress.key !== runKey ? 'stamping' : progress.phase

    // Encadena: primero los sellos nuevos y, si completan la tarjeta, la celebración.
    useEffect(() => {
        if (!runKey) return
        const stampMs = reduced
            ? REDUCED_FADE_MS
            : ((filled - from - 1) * STAGGER_MS + EFFECT_DURATION_MS[effect]) * speed
        const celebrate = complete && completion !== 'none'
        const celebrationMs = celebrate ? CELEBRATION_MS[completion] * speed : 0
        const timers: number[] = []
        timers.push(
            window.setTimeout(() => {
                setAnnouncement(complete ? 'Completaste tu tarjeta' : 'Ganaste un sello')
                if (
                    vibrate &&
                    !reduced &&
                    typeof navigator !== 'undefined' &&
                    'vibrate' in navigator &&
                    // Sin un toque previo el navegador bloquea la vibración y avisa en consola.
                    (navigator.userActivation?.hasBeenActive ?? true)
                ) {
                    try {
                        navigator.vibrate(35)
                    } catch {
                        // Algunos navegadores bloquean la vibración sin interacción: se ignora.
                    }
                }
            }, 40),
        )
        timers.push(
            window.setTimeout(() => {
                if (!celebrate) {
                    setProgress({ key: runKey, phase: 'done' })
                    onAnimationEnd?.()
                    return
                }
                setProgress({ key: runKey, phase: 'celebrating' })
                timers.push(
                    window.setTimeout(() => {
                        setProgress({ key: runKey, phase: 'done' })
                        onAnimationEnd?.()
                    }, celebrationMs),
                )
            }, stampMs),
        )
        return () => timers.forEach((timer) => window.clearTimeout(timer))
        // onAnimationEnd puede cambiar en cada render del padre; la corrida depende de runKey.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runKey])

    // Confeti: se carga de forma diferida SOLO cuando se dispara y se limpia al terminar.
    const [confettiHost, setConfettiHost] = useState<HTMLDivElement | null>(null)
    useEffect(() => {
        if (phase !== 'celebrating' || completion !== 'confetti' || !confettiHost) return
        let cleanup: (() => void) | undefined
        let cancelled = false
        void import('./loyaltyConfetti').then(({ launchConfetti }) => {
            if (cancelled) return
            cleanup = launchConfetti(confettiHost, {
                colors: [
                    design.stamp.filledColor,
                    design.text.primaryColor,
                    design.stamp.emptyColor,
                    design.text.secondaryColor,
                ],
                durationMs: CELEBRATION_MS.confetti * speed,
            })
        })
        return () => {
            cancelled = true
            cleanup?.()
        }
    }, [phase, completion, confettiHost, design, speed])

    const style = designCssVariables(design) as CSSProperties
    const label = `Tarjeta de lealtad: ${filled} de ${required} sellos${rewardAvailable ? ', premio disponible' : ''}`

    if (variant === 'compact') {
        return (
            <div
                data-testid="loyalty-card"
                data-variant="compact"
                role="img"
                aria-label={label}
                style={style}
                className={`lc lc--compact ${className}`}
            >
                <span className="lc-compact-dots" aria-hidden="true">
                    {Array.from({ length: required }, (_, index) => (
                        <span
                            key={index}
                            data-testid={`loyalty-stamp-${index + 1}`}
                            data-filled={index < filled ? 'true' : 'false'}
                            className={index < filled ? 'lc-dot lc-dot--filled' : 'lc-dot'}
                        />
                    ))}
                </span>
                <span data-testid="loyalty-progress-text" className="lc-compact-text">
                    {filled} de {required}
                </span>
                {rewardAvailable && (
                    <span
                        data-testid="loyalty-reward"
                        data-available="true"
                        className="lc-compact-reward"
                    >
                        Premio
                    </span>
                )}
            </div>
        )
    }

    const columns = gridColumns(design, required)
    const rewardSlot = design.layout.rewardSlot === 'icon'
    const rewardLit = complete || rewardAvailable
    const fxClass = reduced ? 'lc-fx-fade' : `lc-fx-${effect}`

    return (
        <div className={`lc-wrap ${className}`}>
            <div
                data-testid="loyalty-card"
                data-variant={variant}
                data-phase={runKey ? phase : 'idle'}
                data-reduced-motion={reduced ? 'true' : 'false'}
                role="img"
                aria-label={label}
                style={style}
                className={[
                    'lc',
                    `lc--${variant}`,
                    design.card.shadow === 'soft' ? 'lc--shadow' : '',
                    design.background.type === 'gradient' ? 'lc--gradient' : '',
                ].join(' ')}
            >
                {design.background.type === 'pattern' && design.background.pattern !== 'none' && (
                    <LoyaltyPattern pattern={design.background.pattern} id={`${uid}-pattern`} />
                )}
                <div className="lc-body">
                    <div className="lc-header">
                        {design.text.showLogo && logoUrl ? (
                            <span className="lc-logo">
                                <ProgressiveImage
                                    src={logoUrl}
                                    alt=""
                                    sizes="40px"
                                    width={80}
                                    height={80}
                                    className="h-full w-full object-cover"
                                />
                            </span>
                        ) : null}
                        <span className="min-w-0">
                            <span className="lc-title">{design.text.title || restaurantName}</span>
                            {design.text.subtitle ? (
                                <span className="lc-subtitle">{design.text.subtitle}</span>
                            ) : null}
                        </span>
                        {customerFirstName ? (
                            <span className="lc-owner">{customerFirstName}</span>
                        ) : null}
                    </div>

                    <div
                        className="lc-grid"
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                    >
                        {Array.from({ length: required }, (_, index) => {
                            const isFilled = index < filled
                            const entering =
                                runKey !== null &&
                                phase === 'stamping' &&
                                index >= from &&
                                index < filled
                            const isRewardSlot = rewardSlot && index === required - 1
                            return (
                                <span
                                    key={index}
                                    data-testid={`loyalty-stamp-${index + 1}`}
                                    data-filled={isFilled ? 'true' : 'false'}
                                    className={[
                                        'lc-slot',
                                        isRewardSlot ? 'lc-slot--reward' : '',
                                        isRewardSlot && rewardLit ? 'lc-slot--lit' : '',
                                        entering ? `lc-slot--enter ${fxClass}` : '',
                                    ].join(' ')}
                                    style={
                                        entering
                                            ? ({
                                                  '--lc-delay': `${Math.round((index - from) * STAGGER_MS * speed)}ms`,
                                              } as CSSProperties)
                                            : undefined
                                    }
                                >
                                    <StampSlot
                                        uid={`${uid}-${index}`}
                                        design={design}
                                        filled={isFilled}
                                        number={index + 1}
                                        isRewardSlot={isRewardSlot}
                                    />
                                    {isRewardSlot &&
                                    rewardLit &&
                                    design.animation.completionEffect === 'glow' ? (
                                        <span
                                            className={
                                                reduced ? 'lc-glow lc-glow--static' : 'lc-glow'
                                            }
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    {isRewardSlot &&
                                    phase === 'celebrating' &&
                                    completion === 'sparkles' ? (
                                        <Sparkles />
                                    ) : null}
                                    {entering && !reduced && effect === 'press' ? (
                                        <span className="lc-ripple" aria-hidden="true" />
                                    ) : null}
                                    {entering && !reduced && effect === 'pop' ? (
                                        <span className="lc-flash" aria-hidden="true" />
                                    ) : null}
                                </span>
                            )
                        })}
                    </div>

                    <div className="lc-footer">
                        <span className="lc-progress" aria-hidden="true">
                            <span
                                className="lc-progress-bar"
                                style={{ transform: `scaleX(${filled / required})` }}
                            />
                        </span>
                        <span data-testid="loyalty-progress-text" className="lc-progress-text">
                            {progressText(filled, required, rewardAvailable)}
                        </span>
                        {rewardLabel ? (
                            <span
                                data-testid="loyalty-reward"
                                data-available={rewardAvailable ? 'true' : 'false'}
                                className={
                                    rewardAvailable
                                        ? 'lc-reward-label lc-reward-label--ready'
                                        : 'lc-reward-label'
                                }
                            >
                                {rewardAvailable
                                    ? `Premio listo: ${rewardLabel}`
                                    : `Premio: ${rewardLabel}`}
                            </span>
                        ) : null}
                    </div>
                </div>
                {phase === 'celebrating' && completion === 'confetti' ? (
                    <div ref={setConfettiHost} className="lc-confetti" aria-hidden="true" />
                ) : null}
            </div>
            <p className="sr-only" aria-live="polite" data-testid="loyalty-announcement">
                {announcement}
            </p>
        </div>
    )
}

function StampSlot({
    uid,
    design,
    filled,
    number,
    isRewardSlot,
}: {
    uid: string
    design: LoyaltyDesign
    filled: boolean
    number: number
    isRewardSlot: boolean
}) {
    const { shape, icon, emptyStyle } = design.stamp
    const clipId = `${uid}-clip`
    return (
        <svg viewBox="0 0 48 48" className="lc-slot-svg" aria-hidden="true" focusable="false">
            <defs>
                <clipPath id={clipId}>
                    <StampShapePath shape={shape} />
                </clipPath>
            </defs>
            {/* Espacio vacío según emptyStyle. */}
            <StampShapePath
                shape={shape}
                className="lc-empty"
                fill={emptyStyle === 'dimmed' ? 'var(--lc-empty)' : 'none'}
                fillOpacity={emptyStyle === 'dimmed' ? 0.38 : undefined}
                stroke={emptyStyle === 'dimmed' ? 'none' : 'var(--lc-empty)'}
                strokeWidth={2.4}
                strokeDasharray={emptyStyle === 'dashed' ? '4 3.2' : undefined}
            />
            {!filled && isRewardSlot ? <GiftGlyph color="var(--lc-empty)" /> : null}
            {!filled && !isRewardSlot && emptyStyle === 'number' ? (
                <text x="24" y="24" dy="0.36em" textAnchor="middle" className="lc-number">
                    {number}
                </text>
            ) : null}
            {filled ? (
                <g className="lc-ink">
                    <g clipPath={`url(#${clipId})`}>
                        <circle
                            className="lc-ink-fill"
                            cx="24"
                            cy="24"
                            r="34"
                            fill="var(--lc-stamp)"
                        />
                    </g>
                    <g className="lc-ink-icon">
                        {isRewardSlot ? (
                            <GiftGlyph color="var(--lc-icon)" />
                        ) : (
                            <StampIconGlyph icon={icon} color="var(--lc-icon)" />
                        )}
                    </g>
                </g>
            ) : null}
        </svg>
    )
}

function Sparkles() {
    return (
        <span className="lc-sparkles" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
                <span
                    key={index}
                    className="lc-sparkle"
                    style={{ '--lc-sparkle': index } as CSSProperties}
                />
            ))}
        </span>
    )
}

function LoyaltyPattern({
    pattern,
    id,
}: {
    pattern: LoyaltyDesign['background']['pattern']
    id: string
}) {
    const tiles: Record<
        Exclude<LoyaltyDesign['background']['pattern'], 'none'>,
        { size: number; body: ReactNode }
    > = {
        dots: { size: 14, body: <circle cx="7" cy="7" r="1.6" fill="currentColor" /> },
        grid: {
            size: 18,
            body: <path d="M18 0H0V18" fill="none" stroke="currentColor" strokeWidth="1" />,
        },
        diagonal: {
            size: 12,
            body: (
                <path d="M-3 3 3-3M0 12 12 0M9 15 15 9" stroke="currentColor" strokeWidth="1.6" />
            ),
        },
        waves: {
            size: 28,
            body: (
                <path
                    d="M0 14c3.5-5 10.5-5 14 0s10.5 5 14 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                />
            ),
        },
        confetti: {
            size: 40,
            body: (
                <g fill="currentColor">
                    <rect x="4" y="6" width="5" height="2.4" rx="1" transform="rotate(25 6 7)" />
                    <circle cx="27" cy="9" r="1.8" />
                    <rect
                        x="16"
                        y="24"
                        width="5"
                        height="2.4"
                        rx="1"
                        transform="rotate(-30 18 25)"
                    />
                    <circle cx="34" cy="31" r="1.6" />
                    <rect x="5" y="32" width="4" height="2.2" rx="1" transform="rotate(60 7 33)" />
                </g>
            ),
        },
    }
    if (pattern === 'none') return null
    const tile = tiles[pattern]
    return (
        <svg className="lc-pattern" aria-hidden="true" focusable="false">
            <defs>
                <pattern id={id} width={tile.size} height={tile.size} patternUnits="userSpaceOnUse">
                    {tile.body}
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    )
}
