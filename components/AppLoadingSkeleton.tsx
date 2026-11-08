'use client'

export function LoadingBlock({ className = '' }: { className?: string }) {
    return <span className={`block animate-pulse rounded-lg bg-[#E8EEF6] motion-reduce:animate-none ${className}`} />
}

export function DashboardNavSkeleton() {
    return (
        <header className="relative z-50 border-b border-[#DCE5F3] bg-white/90 backdrop-blur" aria-busy="true">
            <div className="mx-auto flex h-[85px] max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-10">
                <div className="flex items-center gap-2.5"><LoadingBlock className="size-10 rounded-xl" /><LoadingBlock className="h-8 w-24" /></div>
                <div className="hidden items-center gap-2 md:flex">{[1, 2, 3, 4, 5].map((item) => <LoadingBlock key={item} className="h-9 w-20 rounded-lg" />)}</div>
                <div className="flex items-center gap-3"><LoadingBlock className="hidden size-8 rounded-full lg:block" /><LoadingBlock className="size-9 rounded-full" /></div>
            </div>
            <span className="sr-only" role="status">Cargando navegación</span>
        </header>
    )
}

export function DashboardPageSkeleton() {
    return <main className="mx-auto w-full max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10" role="status" aria-label="Cargando dashboard"><LoadingBlock className="h-28 w-full" /><div className="grid gap-4 lg:grid-cols-2"><LoadingBlock className="h-64" /><LoadingBlock className="h-64" /></div><div className="grid gap-4 lg:grid-cols-2"><LoadingBlock className="h-80" /><LoadingBlock className="h-80" /></div></main>
}
