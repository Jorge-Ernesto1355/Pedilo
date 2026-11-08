import { DiscountListSkeleton } from './DiscountsAdminPage'

function Block({ className = '' }: { className?: string }) {
    return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-[#DCE7F4] motion-reduce:animate-none ${className}`} />
}

export default function Loading() {
    return (
        <main className="bg-[#F6F8FC] px-4 py-6 sm:px-8 lg:px-12" aria-busy="true" aria-label="Cargando descuentos">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-3"><Block className="h-3 w-28" /><Block className="h-10 w-48" /><Block className="h-4 w-80 max-w-full" /></div>
                    <Block className="h-11 w-40 rounded-xl" />
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-[#DCE5F3] bg-white p-4 sm:flex-row sm:items-center"><Block className="h-11 w-full sm:flex-1" /><Block className="h-11 w-full sm:w-48" /></div>
                <DiscountListSkeleton />
            </div>
        </main>
    )
}
