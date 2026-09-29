import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/app/components/SiteFooter'

export function LegalPageLayout({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow: string
    title: string
    description: string
    children: ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#F5F8FC] text-[#12234A]">
            <header className="border-b border-[#DCE5F3] bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <Link href="/" aria-label="Inicio de Pedilo" className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-[-.04em]">
                        <Image src="/logoPediloSinfondo.png" alt="" width={32} height={32} className="size-8 object-contain" priority />
                        Pedilo
                    </Link>
                    <Link href="/" className="text-sm font-semibold text-[#2451C5] hover:text-[#1E40AF]">
                        Volver al inicio
                    </Link>
                </div>
            </header>
            <main id="main-content" className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">{eyebrow}</p>
                <h1 className="mt-3 max-w-3xl font-display text-3xl tracking-[-.055em] text-[#10224A] sm:text-5xl">
                    {title}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-[#65738A]">{description}</p>
                <div className="mt-10 space-y-8 rounded-2xl border border-[#DCE5F3] bg-white p-5 shadow-[0_12px_35px_rgb(20_48_105_/_0.05)] sm:p-8">
                    {children}
                </div>
            </main>
            <SiteFooter />
        </div>
    )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
    const id = `legal-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

    return (
        <section aria-labelledby={id}>
            <h2 id={id} className="font-display text-xl tracking-[-.035em] text-[#12234A]">
                {title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#52627B]">{children}</div>
        </section>
    )
}

export function PendingLegalDetail({ children }: { children: ReactNode }) {
    return (
        <p className="rounded-xl border border-dashed border-[#D9B873] bg-[#FFF9EC] px-4 py-3 text-sm leading-6 text-[#765A20]">
            <strong>[PENDIENTE:</strong> {children}<strong>]</strong>
        </p>
    )
}
