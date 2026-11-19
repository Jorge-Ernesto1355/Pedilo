'use client'

import { lazy, Suspense, type ComponentProps } from 'react'

// El modal de edición pesa (~1200 líneas más sus dependencias) y solo se abre bajo
// demanda, así que no forma parte del JS inicial de Pedidos.
const loadEditOrderModal = () => import('./EditOrderModal')

const EditOrderModal = lazy(() =>
    loadEditOrderModal().then((module) => ({ default: module.EditOrderModal })),
)

/** Precarga el chunk cuando hay intención de editar (hover, foco o toque). */
export function preloadEditOrderModal() {
    void loadEditOrderModal()
}

function EditOrderModalSkeleton() {
    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#10224A]/40 p-4 pb-[calc(var(--mobile-nav-h)+1rem)] backdrop-blur-[2px]">
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Cargando edición de la orden"
                aria-busy="true"
                className="w-full max-w-3xl animate-pulse rounded-3xl border border-[#DCE5F3] bg-white p-5 shadow-[0_25px_80px_rgb(16_34_74_/_0.2)] sm:p-7"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-3 w-24 rounded bg-[#DCE7F4]" />
                        <div className="h-7 w-40 rounded bg-[#DCE7F4]" />
                    </div>
                    <div className="size-10 rounded-xl bg-[#EEF3F9]" />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="h-[72px] rounded-xl bg-[#F1F5FA]" />
                    <div className="h-[72px] rounded-xl bg-[#F1F5FA]" />
                </div>
                <div className="mt-6 space-y-3">
                    <div className="h-16 rounded-xl bg-[#F1F5FA]" />
                    <div className="h-16 rounded-xl bg-[#F1F5FA]" />
                    <div className="h-16 rounded-xl bg-[#F1F5FA]" />
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <div className="h-11 w-28 rounded-xl bg-[#EEF3F9]" />
                    <div className="h-11 w-36 rounded-xl bg-[#DCE7F4]" />
                </div>
            </section>
        </div>
    )
}

export function LazyEditOrderModal(props: ComponentProps<typeof EditOrderModal>) {
    return (
        <Suspense fallback={<EditOrderModalSkeleton />}>
            <EditOrderModal {...props} />
        </Suspense>
    )
}
