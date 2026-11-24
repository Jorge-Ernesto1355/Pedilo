'use client'

import { lazy, Suspense, type ComponentProps } from 'react'

// Solo se abre bajo demanda (cuando una orden no tiene cliente), así que no forma
// parte del JS inicial de Pedidos.
const loadAssignOrderCustomerModal = () => import('./AssignOrderCustomerModal')

const AssignOrderCustomerModal = lazy(() =>
    loadAssignOrderCustomerModal().then((module) => ({
        default: module.AssignOrderCustomerModal,
    })),
)

/** Precarga el chunk cuando hay intención de abrirlo (hover, foco o toque). */
export function preloadAssignOrderCustomerModal() {
    void loadAssignOrderCustomerModal()
}

function AssignOrderCustomerModalSkeleton() {
    return (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#10224A]/40 p-4 pb-[calc(var(--mobile-nav-h)+1rem)] backdrop-blur-[2px]">
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Cargando selección de cliente"
                aria-busy="true"
                className="w-full max-w-lg animate-pulse rounded-3xl border border-[#DCE5F3] bg-white p-5 shadow-[0_25px_80px_rgb(16_34_74_/_0.2)] sm:p-7"
            >
                <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-[#DCE7F4]" />
                    <div className="h-7 w-48 rounded bg-[#DCE7F4]" />
                </div>
                <div className="mt-6 h-[72px] rounded-xl bg-[#F1F5FA]" />
                <div className="mt-6 flex justify-end gap-2">
                    <div className="h-11 w-24 rounded-xl bg-[#EEF3F9]" />
                    <div className="h-11 w-36 rounded-xl bg-[#DCE7F4]" />
                </div>
            </section>
        </div>
    )
}

export function LazyAssignOrderCustomerModal(
    props: ComponentProps<typeof AssignOrderCustomerModal>,
) {
    return (
        <Suspense fallback={<AssignOrderCustomerModalSkeleton />}>
            <AssignOrderCustomerModal {...props} />
        </Suspense>
    )
}
