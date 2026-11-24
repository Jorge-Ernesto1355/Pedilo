'use client'

import { MobilePortal } from './MobilePortal'
import { useIsSmallScreen } from './useIsSmallScreen'

export function NewRestaurantOrderDrawerSkeleton() {
    const isSmall = useIsSmallScreen()
    return (
        <MobilePortal>
            <div
                className={
                    isSmall
                        ? 'fixed inset-0 z-[110] flex bg-[#F8FAFE]'
                        : 'fixed inset-0 z-[60] flex items-end justify-center bg-[#10224A]/35 p-0 pb-[var(--mobile-nav-h)] backdrop-blur-[2px] sm:items-center sm:p-5 sm:pb-[calc(var(--mobile-nav-h)+1.25rem)]'
                }
                role="presentation"
            >
                <section
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cargando nueva orden"
                    className={
                        isSmall
                            ? 'flex h-dvh w-full animate-pulse flex-col overflow-hidden bg-[#F8FAFE]'
                            : 'flex max-h-[calc(94svh-var(--mobile-nav-h))] w-full animate-pulse flex-col overflow-hidden rounded-t-[24px] border border-[#DCE5F3] bg-[#F8FAFE] shadow-[0_24px_80px_-32px_rgba(19,49,117,.45)] sm:max-w-6xl sm:rounded-[24px]'
                    }
                >
                    <header
                        className={`flex shrink-0 items-center justify-between gap-4 border-b border-[#E8EEF6] bg-white px-4 py-3 sm:items-start sm:px-7 sm:py-4 ${isSmall ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : ''}`}
                    >
                        <div className="space-y-2">
                            <div className="hidden h-3 w-28 rounded bg-[#DCE7F4] sm:block" />
                            <div className="h-7 w-40 rounded bg-[#DCE7F4] sm:h-8 sm:w-48" />
                            <div className="hidden h-4 w-72 rounded bg-[#EEF3F9] sm:block" />
                        </div>
                        <div className="size-9 rounded-lg bg-[#E8EEF6]" />
                    </header>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:grid sm:min-h-[28rem] lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 flex-1 space-y-3 overflow-hidden p-3 sm:space-y-5 sm:p-7">
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
                            <div className="grid grid-cols-2 gap-2 sm:hidden">
                                {[1, 2, 3, 4, 5, 6].map((item) => (
                                    <div
                                        key={item}
                                        className="flex gap-2 rounded-2xl border border-[#E3EAF6] bg-white p-2"
                                    >
                                        <div className="size-14 shrink-0 rounded-xl bg-[#EEF3FF]" />
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="h-3 w-4/5 rounded bg-[#E8EEF8]" />
                                            <div className="h-4 w-3/5 rounded bg-[#E8EEF8]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="hidden rounded-2xl border border-[#DCE5F3] bg-white px-5 py-5 sm:block">
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
                        <div className="flex shrink-0 items-center gap-2 border-t border-[#DCE5F3] bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:hidden">
                            <div className="h-8 flex-1 rounded-lg bg-[#E8EEF8]" />
                            <div className="h-12 flex-1 rounded-xl bg-[#1D5BFF]/15" />
                        </div>
                        <aside className="hidden border-t border-[#DCE5F3] bg-white p-5 sm:block sm:p-7 lg:border-l lg:border-t-0">
                            <div className="h-6 w-32 rounded bg-[#E8EEF8]" />
                            <div className="mt-2 h-4 w-24 rounded bg-[#F0F3F8]" />
                            <div className="mt-5 h-20 rounded-xl bg-[#F8FAFE]" />
                            <div className="mt-6 h-11 rounded-xl bg-[#1D5BFF]/15" />
                        </aside>
                    </div>
                </section>
            </div>
        </MobilePortal>
    )
}
