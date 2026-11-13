'use client'

import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function PediloErrorScreen({
    reset,
    fullPage = false,
}: {
    reset: () => void
    fullPage?: boolean
}) {
    return (
        <main
            className={`grid place-items-center bg-[#F5F8FC] px-5 py-10 text-[#12234A] ${fullPage ? 'min-h-screen' : 'min-h-[70vh]'}`}
            aria-labelledby="error-title"
        >
            <section className="w-full max-w-md rounded-[28px] border border-[#DCE5F3] bg-white p-7 text-center shadow-[0_26px_70px_-48px_rgba(19,49,117,.42)] sm:p-9">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#FFF3E8] text-[#C46A11]">
                    <AlertTriangle className="size-6" aria-hidden="true" />
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">
                    Pedilo
                </p>
                <h1 id="error-title" className="mt-2 font-display text-2xl tracking-[-.04em] text-[#10224A]">
                    Algo no salió como esperábamos
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#65738A]">
                    No pudimos mostrar esta sección por un problema inesperado. Tus datos no se
                    han perdido; puedes intentarlo otra vez.
                </p>
                <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_-14px_rgba(30,64,175,.9)] transition hover:bg-[#17358F] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20"
                    >
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Intentar de nuevo
                    </button>
                    <Link
                        href="/"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D7E1EF] px-4 py-2.5 text-sm font-bold text-[#2451C5] transition hover:border-[#B8C8E5] hover:bg-[#F5F8FC] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15"
                    >
                        Ir al inicio
                    </Link>
                </div>
            </section>
        </main>
    )
}
