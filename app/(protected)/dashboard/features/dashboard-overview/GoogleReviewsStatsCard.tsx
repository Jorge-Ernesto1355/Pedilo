'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
    CircleHelp,
    LoaderCircle,
    QrCode,
    RefreshCw,
    ScanLine,
    TrendingDown,
    TrendingUp,
    UsersRound,
} from 'lucide-react'
import { useGoogleReviewsStats } from './useGoogleReviewsStats'
import type { GoogleReviewsStats, GoogleReviewsStatsPeriod } from './googleReviewsStats'
import { GooglePlaceConnectionPanel } from './GooglePlaceConnectionPanel'

export function GoogleReviewsStatsCard({ period }: { period: GoogleReviewsStatsPeriod }) {
    const statsQuery = useGoogleReviewsStats(period)
    const stats = statsQuery.data?.data

    return (
        <section
            className="min-w-0 rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-5"
            aria-labelledby="google-reviews-stats-title"
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                    <QrCode className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#2451C5]">
                        Google Reviews
                    </p>
                    <h2
                        id="google-reviews-stats-title"
                        className="mt-0.5 truncate font-display text-base tracking-[-.03em] text-[#12234A] sm:text-lg"
                    >
                        Reseñas y escaneos QR
                    </h2>
                </div>
            </div>

            <GooglePlaceConnectionPanel />

            <div className="mt-4 flex items-center gap-2 border-t border-[#E8EEF6] pt-3">
                <QrCode className="size-4 text-[#2451C5]" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-[#243556]">Seguimiento del QR</h3>
            </div>

            {statsQuery.isLoading ? (
                <LoadingState />
            ) : statsQuery.isError ? (
                <ErrorState
                    isRetrying={statsQuery.isFetching}
                    onRetry={() => void statsQuery.refetch()}
                />
            ) : stats ? (
                <StatsContent stats={stats} />
            ) : (
                <NoDataState />
            )}
        </section>
    )
}

function LoadingState() {
    return (
        <div
            className="mt-4 grid grid-cols-2 gap-2.5"
            aria-live="polite"
            aria-label="Cargando estadísticas QR"
        >
            <div className="h-24 animate-pulse rounded-xl bg-[#F3F6FA]" />
            <div className="h-24 animate-pulse rounded-xl bg-[#F3F6FA]" />
            <p className="sr-only">Cargando estadísticas QR…</p>
        </div>
    )
}

function NoDataState() {
    return (
        <div className="mt-4 grid min-h-36 place-items-center rounded-xl border border-dashed border-[#DCE5F3] bg-[#FBFCFE] px-4 py-5 text-center">
            <div>
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#F1F5FB] text-[#65738A]">
                    <QrCode className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-[#243556]">
                    Todavía no hay estadísticas QR disponibles
                </p>
                <p className="mt-1 text-xs text-[#7A879A]">
                    Cuando haya datos, aparecerán aquí sin afectar el resto del dashboard.
                </p>
            </div>
        </div>
    )
}

function ErrorState({ isRetrying, onRetry }: { isRetrying: boolean; onRetry: () => void }) {
    return (
        <div
            className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[#E4C5B7] bg-[#FFFAF7] px-4 py-5 text-center"
            role="alert"
        >
            <span className="grid size-11 place-items-center rounded-full bg-[#FFF0E8] text-[#9B4E35]">
                <ScanLine className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-[#713C2C]">
                No pudimos cargar las estadísticas QR
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#8D685B]">
                Las demás métricas del dashboard siguen disponibles. Intenta consultar los escaneos
                otra vez.
            </p>
            <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E6BCA5] bg-white px-4 py-2 text-sm font-semibold text-[#8C4A2F] transition hover:bg-[#FFF0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C4A2F] disabled:cursor-wait disabled:opacity-70"
            >
                {isRetrying ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                )}
                Reintentar
            </button>
        </div>
    )
}

function StatsContent({ stats }: { stats: GoogleReviewsStats }) {
    const [openInfo, setOpenInfo] = useState<'scans' | 'visitors' | null>(null)
    const comparison = stats.comparison_percentage
    const hasComparison = stats.comparison_has_previous_data && comparison !== null
    const ComparisonIcon = comparison !== null && comparison < 0 ? TrendingDown : TrendingUp
    const comparisonColor = !hasComparison
        ? 'text-[#7A879A]'
        : comparison < 0
          ? 'text-[#B54747]'
          : 'text-[#23814C]'

    return (
        <div className="mt-4">
            <div className="grid grid-cols-2 gap-2.5">
                <article className="min-w-0 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#65738A]">
                        <ScanLine className="size-3.5 shrink-0 text-[#2451C5]" aria-hidden="true" />
                        <span>Escaneos totales</span>
                        <MetricInfoPopover
                            id="google-reviews-scans-info"
                            label="Qué significan los escaneos totales"
                            title="Escaneos totales"
                            open={openInfo === 'scans'}
                            align="start"
                            onToggle={() =>
                                setOpenInfo((current) => (current === 'scans' ? null : 'scans'))
                            }
                            onClose={() => setOpenInfo(null)}
                        >
                            Cuenta los accesos registrados al enlace de tu QR durante el periodo.
                            Una visita no significa que se haya publicado una reseña; los accesos
                            repetidos pueden volver a contarse después de la ventana de
                            deduplicación.
                        </MetricInfoPopover>
                    </div>
                    <p className="mt-1 font-display text-2xl tracking-[-.05em] text-[#12234A]">
                        {formatCount(stats.total_scans)}
                    </p>
                    <div
                        className={`mt-0.5 flex min-h-5 items-center gap-1 text-[10px] font-semibold leading-4 ${comparisonColor}`}
                    >
                        {!hasComparison ? (
                            <span>Sin datos del período anterior</span>
                        ) : (
                            <>
                                <ComparisonIcon className="size-3.5" aria-hidden="true" />
                                <span>
                                    {formatPercentage(comparison)} respecto al período anterior
                                </span>
                            </>
                        )}
                    </div>
                </article>
                <article className="min-w-0 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#65738A]">
                        <UsersRound
                            className="size-3.5 shrink-0 text-[#477A5E]"
                            aria-hidden="true"
                        />
                        <span>Visitantes estimados</span>
                        <MetricInfoPopover
                            id="google-reviews-visitors-info"
                            label="Qué significan los visitantes estimados"
                            title="Visitantes estimados"
                            open={openInfo === 'visitors'}
                            align="end"
                            onToggle={() =>
                                setOpenInfo((current) =>
                                    current === 'visitors' ? null : 'visitors',
                                )
                            }
                            onClose={() => setOpenInfo(null)}
                        >
                            Es una estimación de personas distintas, agrupadas con señales anónimas.
                            No identifica a cada persona y alguien puede contarse más de una vez si
                            cambia de dispositivo o conexión.
                        </MetricInfoPopover>
                    </div>
                    <p className="mt-1 font-display text-2xl tracking-[-.05em] text-[#12234A]">
                        {formatCount(stats.unique_visitors_estimated)}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-[#7A879A]">Únicos estimados</p>
                </article>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[#7A879A]">
                Los escaneos no equivalen a reseñas publicadas en Google. Los visitantes únicos son
                estimaciones.
            </p>
        </div>
    )
}

function MetricInfoPopover({
    id,
    label,
    title,
    open,
    align,
    onToggle,
    onClose,
    children,
}: {
    id: string
    label: string
    title: string
    open: boolean
    align: 'start' | 'end'
    onToggle: () => void
    onClose: () => void
    children: ReactNode
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const shouldReduceMotion = useReducedMotion()

    useEffect(() => {
        if (!open) return

        function handlePointerDown(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                onClose()
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return
            onClose()
            triggerRef.current?.focus()
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose, open])

    return (
        <div ref={containerRef} className="relative ml-0.5 shrink-0">
            <button
                ref={triggerRef}
                type="button"
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={id}
                onClick={onToggle}
                className="grid size-5 place-items-center rounded-full text-[#8996A9] transition hover:bg-[#EAF0FF] hover:text-[#2451C5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2451C5]"
            >
                <CircleHelp className="size-3.5" aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
                {open ? (
                    <motion.div
                        id={id}
                        role="dialog"
                        aria-label={title}
                        className={`absolute top-7 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[#C9D7EA] bg-white p-3.5 text-left text-xs leading-5 text-[#65738A] shadow-[0_12px_28px_rgb(20_48_105_/_0.14)] ${align === 'start' ? 'left-0' : 'right-0'}`}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 3, scale: 0.985 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.16, ease: 'easeOut' }}
                    >
                        <p className="font-semibold text-[#12234A]">{title}</p>
                        <p className="mt-1.5">{children}</p>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    )
}

function formatCount(value: number) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
}

function formatPercentage(value: number) {
    return `${new Intl.NumberFormat('es-MX', { signDisplay: 'always', maximumFractionDigits: 1 }).format(value)}%`
}
