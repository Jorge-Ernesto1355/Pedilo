'use client'

import { AlertTriangle, ClipboardList, Plus, RefreshCw } from 'lucide-react'

function Block({ className }: { className: string }) {
    return (
        <div aria-hidden="true" className={`animate-pulse rounded-lg bg-[#EAF0F8] ${className}`} />
    )
}

export function BusinessProfileSkeleton() {
    return (
        <div
            className="space-y-8"
            aria-busy="true"
            aria-label="Cargando la información del negocio"
        >
            <div className="space-y-3">
                <Block className="h-3 w-24" />
                <Block className="h-12 w-full max-w-md" />
                <Block className="h-5 w-full max-w-sm" />
                <Block className="h-5 w-4/5 max-w-sm" />
            </div>
            <div className="space-y-5">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="space-y-2">
                        <Block className="h-4 w-32" />
                        <Block className="h-12 w-full" />
                    </div>
                ))}
            </div>
            <div className="border-t border-[#E3EAF4] pt-6">
                <Block className="h-4 w-28" />
                <Block className="mt-3 h-16 w-full" />
            </div>
            <div className="border-t border-[#E3EAF4] pt-6">
                <Block className="h-4 w-32" />
                <Block className="mt-3 h-24 w-full" />
            </div>
            <Block className="h-12 w-full rounded-xl" />
        </div>
    )
}

export function MenuManagementSkeleton() {
    return (
        <section
            className="rounded-[24px] border border-[#DCE5F3] bg-white p-5 shadow-[0_22px_70px_-52px_rgba(19,49,117,.4)] sm:p-6"
            aria-busy="true"
            aria-label="Cargando tus menús"
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <Block className="h-3 w-28" />
                    <Block className="h-8 w-36" />
                </div>
                <Block className="size-9" />
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)]">
                <div className="space-y-2">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Block key={index} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
                <Block className="h-56 w-full rounded-xl" />
            </div>
        </section>
    )
}

export function CreateMenuPageSkeleton() {
    return (
        <main className="min-h-screen bg-[#F5F8FC] px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
            <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
                <section className="rounded-2xl border border-[#DCE5F3] bg-white p-6 sm:p-8">
                    <BusinessProfileSkeleton />
                </section>
                <div className="space-y-5">
                    <BusinessPreviewSkeleton />
                    <MenuManagementSkeleton />
                </div>
            </div>
        </main>
    )
}

export function MenuDetailSkeleton() {
    return (
        <div
            className="space-y-5"
            aria-busy="true"
            aria-label="Cargando categorías del menú"
            role="status"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                    <Block className="h-6 w-48" />
                    <Block className="h-4 w-72 max-w-full" />
                    <Block className="h-3 w-20" />
                </div>
                <div className="flex gap-1">
                    <Block className="size-8" />
                    <Block className="h-8 w-20 rounded-lg" />
                    <Block className="size-8" />
                </div>
            </div>
            <div className="flex items-center justify-between gap-3">
                <Block className="h-4 w-28" />
                <Block className="h-8 w-20 rounded-lg" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="rounded-xl border border-[#E8EEF6] bg-[#FBFCFE] p-3"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                <Block className="mt-0.5 size-4 shrink-0" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <Block className="h-4 w-40 max-w-full" />
                                    <Block className="h-3 w-56 max-w-full" />
                                    <Block className="h-3 w-24" />
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Block className="size-7" />
                                <Block className="h-7 w-8 rounded" />
                                <Block className="size-7" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function CategoryProductsSkeleton() {
    return (
        <div
            className="mt-3 space-y-2 border-t border-[#E8EEF6] pt-3"
            aria-busy="true"
            aria-label="Cargando productos"
            role="status"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Block className="size-6 rounded-md" />
                    <Block className="h-3 w-28" />
                </div>
                <Block className="h-7 w-32 rounded-lg" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="flex items-center gap-2.5 rounded-lg border border-[#E8EEF6] bg-white px-3 py-2"
                >
                    <Block className="size-4 shrink-0" />
                    <Block className="size-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Block className="h-3.5 w-44 max-w-full" />
                        <Block className="h-3 w-20" />
                    </div>
                    <Block className="size-7 shrink-0 rounded" />
                </div>
            ))}
        </div>
    )
}

export function BusinessPreviewSkeleton() {
    return (
        <section
            className="overflow-hidden rounded-[24px] border border-[#DCE5F3] bg-white p-5 shadow-[0_22px_70px_-46px_rgba(19,49,117,.5)] sm:p-7"
            aria-busy="true"
            aria-label="Cargando la vista previa del negocio"
        >
            <div className="flex items-center justify-between border-b border-[#E8EEF6] pb-4">
                <div className="space-y-2">
                    <Block className="h-3 w-24" />
                    <Block className="h-3 w-36" />
                </div>
                <Block className="h-8 w-20 rounded-lg" />
            </div>
            <Block className="mt-5 h-40 w-full rounded-2xl" />
            <Block className="mt-5 h-8 w-56" />
            <Block className="mt-3 h-4 w-full max-w-md" />
            <Block className="mt-2 h-4 w-4/5 max-w-sm" />
            <Block className="mt-6 h-4 w-64" />
        </section>
    )
}

export function CreateMenuErrorState({
    title,
    description,
    onRetry,
}: {
    title: string
    description: string
    onRetry: () => void | Promise<void>
}) {
    return (
        <section
            className="rounded-2xl border border-[#F0D7D7] bg-[#FFF9F9] p-6 text-center"
            role="alert"
        >
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#FCE7E7] text-[#B42318]">
                <AlertTriangle className="size-5" />
            </span>
            <h3 className="mt-4 font-display text-lg text-[#6F2525]">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#8F4A4A]">{description}</p>
            <button
                type="button"
                onClick={() => void onRetry()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#B42318] px-3 py-2 text-xs font-bold text-white hover:bg-[#941B13]"
            >
                <RefreshCw className="size-3.5" />
                Intentar de nuevo
            </button>
        </section>
    )
}

export function CreateMenuEmptyState({
    title,
    description,
    actionLabel,
    onAction,
}: {
    title: string
    description: string
    actionLabel: string
    onAction: () => void
}) {
    return (
        <section className="rounded-xl border border-dashed border-[#DCE5F3] bg-[#FBFCFE] px-5 py-7 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#EEF3FF] text-[#2451C5]">
                <ClipboardList className="size-5" />
            </span>
            <h3 className="mt-3 font-display text-lg text-[#243556]">{title}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#65738A]">{description}</p>
            <button
                type="button"
                onClick={onAction}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1E40AF] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#17358E]"
            >
                <Plus className="size-3.5" />
                {actionLabel}
            </button>
        </section>
    )
}
