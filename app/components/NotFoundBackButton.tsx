'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NotFoundBackButton() {
    const router = useRouter()

    function handleBack() {
        if (window.history.length > 1) {
            window.history.back()
            return
        }

        router.push('/')
    }

    return (
        <button
            type="button"
            onClick={handleBack}
            data-testid="not-found-back"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C9D6ED] bg-white px-5 text-sm font-bold text-[#12234A] shadow-[0_7px_18px_rgb(18_35_74_/_0.06)] transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#AFC2E6] hover:bg-[#F9FBFF] hover:shadow-[0_10px_24px_rgb(18_35_74_/_0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/15 active:translate-y-0"
        >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Regresar
        </button>
    )
}
