import { Info } from 'lucide-react'

export function SalesAccountingNotice() {
    return (
        <div
            aria-label="Cómo se contabilizan las órdenes"
            className="flex items-start gap-3 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] px-4 py-3 text-sm text-[#65738A]"
        >
            <Info className="mt-0.5 size-4 shrink-0 text-[#2451C5]" aria-hidden="true" />
            <p>
                Las órdenes en <span className="font-semibold text-[#315FE8]">Preparando</span> o{' '}
                <span className="font-semibold text-[#23814C]">¡Lista!</span> ya se reflejan en
                Ventas y Tendencia. Las órdenes{' '}
                <span className="font-semibold text-[#A46B00]">Nuevas</span> todavía no se
                contabilizan.
            </p>
        </div>
    )
}
