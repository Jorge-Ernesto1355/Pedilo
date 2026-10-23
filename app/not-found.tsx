import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Home, MapPin, PackageOpen, UtensilsCrossed } from 'lucide-react'
import NotFoundBackButton from '@/app/components/NotFoundBackButton'

export const metadata: Metadata = {
    title: 'Página no encontrada | Pedilo',
    description: 'La página que buscas no existe en Pedilo.',
}

export default function NotFound() {
    return (
        <main
            id="main-content"
            data-testid="not-found-page"
            className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#F5F8FC] px-5 py-10 text-[#12234A] sm:px-8 sm:py-14"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-36 top-[-12rem] size-[30rem] rounded-full border border-[#DCE5F3] bg-[#EAF0FF]/45 sm:-right-44 sm:top-[-14rem]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-52 -left-44 size-[34rem] rounded-full border border-[#DCE5F3] bg-white/60"
            />

            <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-16">
                <section aria-labelledby="not-found-title" className="max-w-2xl">
                    <Link
                        href="/"
                        aria-label="Ir al inicio de Pedilo"
                        className="mb-10 inline-flex items-center gap-2 text-lg font-bold tracking-[-0.04em] text-[#12234A] transition-colors hover:text-[#2451C5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/15 sm:mb-14"
                    >
                        <span className="grid size-9 place-items-center rounded-xl bg-[#1E40AF] text-white shadow-[0_7px_16px_rgb(30_64_175_/_0.18)]">
                            <UtensilsCrossed aria-hidden="true" className="size-4" />
                        </span>
                        pedilo
                    </Link>

                    <p className="font-display text-[clamp(5.5rem,16vw,10rem)] font-semibold leading-[0.78] tracking-[-0.09em] text-[#1E40AF]">
                        404
                    </p>
                    <h1
                        id="not-found-title"
                        className="mt-8 max-w-xl font-display text-[clamp(2.1rem,5vw,4.25rem)] leading-[1.04] tracking-[-0.06em] text-[#10224A]"
                    >
                        ¡Ups! Este pedido se perdió en el camino.
                    </h1>
                    <p className="mt-5 max-w-[38rem] text-base leading-7 text-[#65738A] sm:text-lg sm:leading-8">
                        La dirección que abriste no existe o cambió de lugar. Regresa al inicio y
                        encuentra el camino correcto para seguir con tu pedido.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Link
                            href="/"
                            data-testid="not-found-home"
                            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgb(30_64_175_/_0.2)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#19368F] hover:shadow-[0_13px_28px_rgb(30_64_175_/_0.26)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/20 active:translate-y-0"
                        >
                            <Home aria-hidden="true" className="size-4" />
                            Volver al inicio
                            <ArrowRight
                                aria-hidden="true"
                                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                            />
                        </Link>
                        <NotFoundBackButton />
                    </div>
                </section>

                <div
                    data-testid="not-found-visual"
                    role="img"
                    aria-label="Un pedido de Pedilo buscando su dirección"
                    className="not-found-scene relative mx-auto aspect-square w-full max-w-[31rem]"
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-[8%] rounded-[3rem] border border-[#DCE5F3] bg-white shadow-[0_28px_65px_rgb(18_35_74_/_0.1)] sm:rounded-[4rem]"
                    />
                    <div
                        aria-hidden="true"
                        className="absolute inset-[16%] rounded-full border border-dashed border-[#B8C9E8]"
                    />
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 420 420"
                        className="absolute inset-[14%] size-[72%] overflow-visible"
                        fill="none"
                    >
                        <path
                            d="M73 285c24-43 59-65 100-65 33 0 50 18 84 18 36 0 61-24 91-56"
                            stroke="#AFC2E6"
                            strokeLinecap="round"
                            strokeWidth="7"
                            strokeDasharray="13 16"
                            className="not-found-route"
                        />
                        <circle cx="73" cy="285" r="9" fill="#2451C5" />
                        <circle cx="257" cy="238" r="9" fill="#AFC2E6" />
                        <g className="not-found-pin">
                            <path
                                d="M347 142c0 32-42 78-42 78s-42-46-42-78a42 42 0 1 1 84 0Z"
                                fill="#EAF0FF"
                                stroke="#2451C5"
                                strokeLinejoin="round"
                                strokeWidth="7"
                            />
                            <circle cx="305" cy="142" r="13" fill="#2451C5" />
                        </g>
                    </svg>

                    <div className="absolute left-[17%] top-[19%] rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] px-3 py-2 text-xs font-bold text-[#65738A] shadow-[0_8px_18px_rgb(18_35_74_/_0.06)] sm:px-4 sm:py-2.5">
                        ¿Dónde quedó?
                    </div>
                    <div className="not-found-package absolute bottom-[20%] left-[23%] grid size-[8.5rem] place-items-center rounded-[2rem] border-2 border-[#2451C5] bg-[#EAF0FF] text-[#2451C5] shadow-[0_20px_28px_rgb(30_64_175_/_0.16)] sm:size-[10rem] sm:rounded-[2.5rem]">
                        <PackageOpen
                            aria-hidden="true"
                            className="size-16 stroke-[1.65] sm:size-20"
                        />
                        <span className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full bg-[#1E40AF] text-white shadow-[0_7px_14px_rgb(30_64_175_/_0.2)]">
                            <MapPin aria-hidden="true" className="size-4" />
                        </span>
                    </div>
                    <span
                        aria-hidden="true"
                        className="absolute bottom-[14%] right-[19%] size-3 rounded-full bg-[#2451C5] shadow-[0_0_0_7px_rgb(36_81_197_/_0.1)]"
                    />
                </div>
            </div>
        </main>
    )
}
