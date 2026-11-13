export function NewRestaurantOrderDrawerSkeleton() {
    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-[#10224A]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
            role="presentation"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Cargando nueva orden"
                className="flex max-h-[94svh] w-full animate-pulse flex-col overflow-hidden rounded-t-[24px] border border-[#DCE5F3] bg-[#F8FAFE] shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:max-w-6xl sm:rounded-[24px]"
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E8EEF6] bg-white px-5 py-4 sm:px-7">
                    <div className="space-y-2">
                        <div className="h-3 w-28 rounded bg-[#DCE7F4]" />
                        <div className="h-8 w-48 rounded bg-[#DCE7F4]" />
                        <div className="h-4 w-72 rounded bg-[#EEF3F9]" />
                    </div>
                    <div className="size-9 rounded-lg bg-[#E8EEF6]" />
                </header>
                <div className="grid min-h-[28rem] flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="min-w-0 space-y-5 overflow-hidden p-5 sm:p-7">
                        <div className="flex gap-2 overflow-hidden">
                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-10 w-28 shrink-0 rounded-xl bg-[#E8EEF8]"
                                />
                            ))}
                        </div>
                        <div className="flex gap-2 overflow-hidden rounded-xl border border-[#DCE5F3] bg-white p-1">
                            {[1, 2, 3, 4].map((item) => (
                                <div
                                    key={item}
                                    className="h-10 w-24 shrink-0 rounded-lg bg-[#EEF3FF]"
                                />
                            ))}
                        </div>
                        <div className="rounded-2xl border border-[#DCE5F3] bg-white px-5 py-5">
                            <div className="mb-5 h-7 w-44 rounded-lg bg-[#E8EEF8]" />
                            <div className="space-y-5">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex gap-4">
                                        <div className="size-24 shrink-0 rounded-xl bg-[#EEF3FF] sm:size-28" />
                                        <div className="min-w-0 flex-1 space-y-3 py-1">
                                            <div className="h-5 w-3/5 rounded-md bg-[#E8EEF8]" />
                                            <div className="h-4 w-11/12 rounded-md bg-[#F0F3F8]" />
                                            <div className="h-10 w-32 rounded-lg bg-[#EEF3FF] sm:h-8" />
                                        </div>
                                        <div className="h-6 w-20 shrink-0 rounded-md bg-[#E8EEF8]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <aside className="border-t border-[#DCE5F3] bg-white p-5 sm:p-7 lg:border-l lg:border-t-0">
                        <div className="h-6 w-32 rounded bg-[#E8EEF8]" />
                        <div className="mt-2 h-4 w-24 rounded bg-[#F0F3F8]" />
                        <div className="mt-5 h-20 rounded-xl bg-[#F8FAFE]" />
                        <div className="mt-6 h-11 rounded-xl bg-[#1D5BFF]/15" />
                    </aside>
                </div>
            </section>
        </div>
    )
}
