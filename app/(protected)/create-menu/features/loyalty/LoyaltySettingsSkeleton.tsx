export function LoyaltySettingsSkeleton() {
    return (
        <section
            data-cy="loyalty-settings"
            className="mt-5 rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6"
        >
            <div
                data-cy="loyalty-skeleton"
                aria-busy="true"
                aria-label="Cargando tarjeta de lealtad"
                className="animate-pulse motion-reduce:animate-none"
            >
                <div className="h-5 w-48 rounded bg-[#E8EEF6]" />
                <div className="mt-2 h-4 w-80 max-w-full rounded bg-[#F1F4F9]" />
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
                    <div className="space-y-3">
                        <div className="h-11 rounded-xl bg-[#F1F4F9]" />
                        <div className="h-11 rounded-xl bg-[#F1F4F9]" />
                        <div className="h-11 rounded-xl bg-[#F1F4F9]" />
                    </div>
                    <div className="h-48 rounded-2xl bg-[#EEF2F8]" />
                </div>
            </div>
        </section>
    )
}
