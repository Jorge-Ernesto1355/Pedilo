'use client'

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

type DeferredDashboardModuleProps = {
    children: ReactNode
    fallback: ReactNode
    rootMargin?: string
}

export function DeferredDashboardModule({
    children,
    fallback,
    rootMargin = '0px',
}: DeferredDashboardModuleProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [shouldRender, setShouldRender] = useState(false)

    useEffect(() => {
        if (shouldRender) return
        const element = containerRef.current
        if (!element) return
        if (typeof IntersectionObserver === 'undefined') {
            const timeoutId = window.setTimeout(() => setShouldRender(true), 0)
            return () => window.clearTimeout(timeoutId)
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return
                setShouldRender(true)
                observer.disconnect()
            },
            { rootMargin, threshold: 0.01 },
        )
        observer.observe(element)
        return () => observer.disconnect()
    }, [rootMargin, shouldRender])

    return (
        <div ref={containerRef}>
            {shouldRender ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
        </div>
    )
}

export function DeferredDashboardCardFallback({ className = 'min-h-64' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6 ${className}`}
            role="status"
            aria-label="Cargando módulo del dashboard"
        >
            <div className="h-3 w-24 rounded bg-[#E8EEF6]" />
            <div className="mt-3 h-6 w-44 rounded bg-[#E8EEF6]" />
            <div className="mt-7 h-24 rounded-xl bg-[#F3F6FA]" />
        </div>
    )
}
