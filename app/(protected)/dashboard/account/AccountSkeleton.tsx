export function AccountSkeleton() {
    return (
        <main className="mx-auto max-w-[1100px] space-y-6 px-5 py-8 sm:px-8 lg:py-10" aria-busy="true">
            <div className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded bg-[#DCE7F4]" />
                <div className="h-10 w-56 animate-pulse rounded bg-[#DCE7F4]" />
                <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[#DCE7F4]" />
            </div>
            <section className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
                {[0, 1].map((card) => (
                    <div key={card} className="rounded-2xl border border-[#DCE5F3] bg-white p-6 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)]">
                        <div className="h-6 w-40 animate-pulse rounded bg-[#DCE7F4]" />
                        <div className="mt-6 space-y-5">
                            {[0, 1, 2, 3].map((row) => <div key={row} className="h-11 w-full animate-pulse rounded-xl bg-[#EEF3F9]" />)}
                        </div>
                    </div>
                ))}
            </section>
            <section className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((card) => <div key={card} className="h-28 animate-pulse rounded-2xl border border-[#DCE5F3] bg-white" />)}
            </section>
        </main>
    )
}
