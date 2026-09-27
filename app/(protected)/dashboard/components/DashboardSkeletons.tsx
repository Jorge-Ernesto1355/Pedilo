'use client'

import type { CSSProperties } from 'react'

function Block({ className = '', style }: { className?: string; style?: CSSProperties }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse rounded-md bg-[#DCE7F4] ${className}`}
            style={style}
        />
    )
}

function PageHeaderSkeleton({
    description = true,
    action = true,
}: {
    description?: boolean
    action?: boolean
}) {
    return (
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="space-y-3">
                {description && <Block className="h-4 w-64" />}
                <Block className="h-10 w-64 sm:w-80" />
                {description && <Block className="h-3 w-full max-w-xl" />}
            </div>
            {action && <Block className="h-11 w-36 rounded-xl" />}
        </header>
    )
}

function FilterSkeleton({ withRefresh = false }: { withRefresh?: boolean }) {
    return (
        <div className="flex gap-2">
            <Block className="h-11 w-full max-w-md rounded-xl" />
            {withRefresh && <Block className="size-11 shrink-0 rounded-xl" />}
        </div>
    )
}

function KpiSkeletons({ count = 4 }: { count?: number }) {
    return (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            {Array.from({ length: count }, (_, index) => (
                <div
                    key={index}
                    className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]"
                >
                    <div className="flex items-center justify-between">
                        <Block className="size-9 rounded-xl" />
                        <Block className="h-3 w-14" />
                    </div>
                    <Block className="mt-6 h-3 w-24" />
                    <Block className="mt-2 h-8 w-28" />
                    <Block className="mt-3 h-3 w-36" />
                </div>
            ))}
        </section>
    )
}

function ChartSkeleton() {
    const bars = [42, 68, 50, 82, 61, 92, 72, 47, 76, 58, 88, 64]
    return (
        <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <Block className="h-3 w-20" />
                    <Block className="h-6 w-32" />
                    <Block className="h-3 w-52" />
                </div>
                <Block className="h-8 w-20 rounded-lg" />
            </div>
            <div className="mt-8 flex h-64 items-end gap-2 border-b border-[#E8EEF6] px-2 pb-2">
                {bars.map((height, index) => (
                    <Block
                        key={index}
                        className="flex-1 rounded-t-md rounded-b-none"
                        style={{ height: `${height}%` }}
                    />
                ))}
            </div>
            <div className="mt-3 flex justify-between">
                {Array.from({ length: 5 }, (_, index) => (
                    <Block key={index} className="h-3 w-10" />
                ))}
            </div>
        </section>
    )
}

function TableSkeleton({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-[#DCE5F3] bg-white">
            <div className="hidden border-b border-[#E8EEF6] px-5 py-3 sm:grid sm:grid-cols-4 sm:gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <Block key={index} className="h-3 w-20" />
                ))}
            </div>
            <div className="divide-y divide-[#E8EEF6]">
                {Array.from({ length: rows }, (_, row) => (
                    <div key={row} className="grid gap-3 px-5 py-4 sm:grid-cols-4 sm:items-center">
                        <div className="space-y-2">
                            <Block className="h-4 w-36" />
                            <Block className="h-3 w-24" />
                        </div>
                        {Array.from({ length: columns - 1 }, (_, column) => (
                            <Block key={column} className="h-4 w-28" />
                        ))}
                        <Block className="h-7 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        </section>
    )
}

function PaginationSkeleton() {
    return (
        <div className="flex items-center justify-between">
            <Block className="h-3 w-24" />
            <div className="flex gap-2">
                <Block className="h-9 w-24 rounded-lg" />
                <Block className="h-9 w-24 rounded-lg" />
            </div>
        </div>
    )
}

export function OverviewSkeleton() {
    return (
        <main
            className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
            aria-busy="true"
            aria-label="Cargando el resumen del negocio"
        >
            <PageHeaderSkeleton action={false} />
            <KpiSkeletons />
            <ChartSkeleton />
            <div className="grid gap-4 lg:grid-cols-2">
                {['Productos más pedidos', 'Cómo va tu negocio'].map((title) => (
                    <section
                        key={title}
                        className="rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6"
                    >
                        <Block className="h-3 w-24" />
                        <Block className="mt-3 h-6 w-44" />
                        <div className="mt-6 space-y-4">
                            {Array.from({ length: 3 }, (_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between gap-4"
                                >
                                    <div className="space-y-2">
                                        <Block className="h-4 w-36" />
                                        <Block className="h-3 w-20" />
                                    </div>
                                    <Block className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
            <section className="rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6">
                <Block className="h-3 w-32" />
                <Block className="mt-3 h-6 w-44" />
                <div className="mt-6 space-y-3">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-4 border-b border-[#E8EEF6] pb-3"
                        >
                            <Block className="h-4 w-48" />
                            <Block className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    )
}

export function SalesSkeleton() {
    return (
        <main
            className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"
            aria-busy="true"
            aria-label="Cargando las ventas"
        >
            <Block className="h-4 w-32" />
            <PageHeaderSkeleton action />
            <KpiSkeletons />
            <ChartSkeleton />
        </main>
    )
}

export function OrdersSkeleton() {
    return (
        <main
            className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"
            aria-busy="true"
            aria-label="Cargando pedidos"
        >
            <PageHeaderSkeleton description />
            <div className="flex justify-end gap-2">
                <Block className="h-11 w-44 rounded-xl" />
                <Block className="size-11 rounded-xl" />
            </div>
            <TableSkeleton rows={6} columns={3} />
            <PaginationSkeleton />
        </main>
    )
}

export function CustomersSkeleton() {
    return (
        <main
            className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"
            aria-busy="true"
            aria-label="Cargando customers"
        >
            <PageHeaderSkeleton description action />
            <FilterSkeleton withRefresh />
            <TableSkeleton rows={6} columns={2} />
            <PaginationSkeleton />
        </main>
    )
}

export function ProductsSkeleton() {
    return (
        <main
            className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10"
            aria-busy="true"
            aria-label="Cargando productos"
        >
            <PageHeaderSkeleton description action />
            <section className="flex flex-col gap-2 sm:flex-row">
                {Array.from({ length: 5 }, (_, index) => (
                    <div
                        key={index}
                        className="flex flex-1 items-center gap-2.5 rounded-xl border border-[#DCE5F3] bg-white px-3 py-2.5"
                    >
                        <Block className="size-8 rounded-lg" />
                        <div className="space-y-2">
                            <Block className="h-3 w-24" />
                            <Block className="h-6 w-12" />
                        </div>
                    </div>
                ))}
            </section>
            <section className="rounded-2xl border border-[#DCE5F3] bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <Block className="h-3 w-20" />
                        <Block className="h-7 w-48" />
                    </div>
                    <Block className="h-9 w-24 rounded-lg" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Block key={index} className="h-10 rounded-lg" />
                    ))}
                </div>
                <div className="mt-5">
                    <TableSkeleton rows={5} columns={3} />
                </div>
            </section>
        </main>
    )
}

export function InsightsSkeleton() {
    return (
        <main
            className="mx-auto max-w-[1200px] space-y-6 px-5 py-8 sm:px-8 lg:py-10"
            aria-busy="true"
            aria-label="Cargando los consejos"
        >
            <Block className="h-4 w-32" />
            <PageHeaderSkeleton action />
            <section className="max-w-[620px] rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <Block className="size-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <Block className="h-3 w-28" />
                        <Block className="h-6 w-48" />
                    </div>
                </div>
                <div className="mt-6 space-y-3">
                    <Block className="h-4 w-full" />
                    <Block className="h-4 w-11/12" />
                    <Block className="h-4 w-4/5" />
                </div>
                <div className="mt-7 space-y-3 border-t border-[#E8EEF6] pt-5">
                    <Block className="h-4 w-36" />
                    <Block className="h-4 w-full" />
                    <Block className="h-4 w-2/3" />
                </div>
            </section>
        </main>
    )
}
