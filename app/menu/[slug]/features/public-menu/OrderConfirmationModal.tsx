'use client'

import { Check, MessageCircle, X } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

export function OrderConfirmationModal({
    onClose,
    whatsappUrl,
}: {
    onClose: () => void
    whatsappUrl?: string | null
}) {
    const reducedMotion = useReducedMotion()

    return (
        <div
            className="fixed inset-0 z-[70] grid place-items-center bg-[#10224A]/35 p-3 sm:p-6"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="order-confirmation-title"
                initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="relative max-h-[calc(100dvh-24px)] w-full max-w-lg overflow-y-auto border border-[#DCE5F3] bg-white p-7 text-center shadow-[0_24px_80px_-30px_rgba(19,49,117,.45)] sm:p-10"
            >
                <div className="relative mx-auto grid size-24 place-items-center rounded-[30px] bg-[#EAF8EF] text-[#16803D]">
                    <motion.span
                        initial={reducedMotion ? false : { scale: 0.75, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.08, duration: 0.24, ease: 'easeOut' }}
                        className="grid size-14 place-items-center rounded-full bg-[#D8F3DF]"
                    >
                        <Check className="size-7" strokeWidth={2.5} />
                    </motion.span>
                    <span className="absolute -right-1 -top-1 grid size-8 place-items-center rounded-full bg-[#25D366] text-white">
                        <MessageCircle className="size-5 fill-current" />
                    </span>
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#16803D]">
                    Pedido listo
                </p>
                <h2
                    id="order-confirmation-title"
                    className="mt-3 font-display text-[clamp(2rem,7vw,2.75rem)] leading-[1.05] tracking-[-.05em] text-[#12234A]"
                >
                    ¡Tu pedido está listo!
                </h2>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#65738A]">
                    Continúa en WhatsApp para enviarlo al negocio y esperar su respuesta.
                </p>
                {whatsappUrl && (
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="manual-whatsapp-link"
                        className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#B8DDC6] bg-[#F3FBF5] px-5 text-base font-bold text-[#16803D] transition hover:bg-[#EAF8EE] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/20"
                    >
                        <MessageCircle className="size-5 fill-current" />
                        Abrir WhatsApp
                    </a>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    className={`${whatsappUrl ? 'mt-3' : 'mt-7'} flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-5 text-base font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20`}
                >
                    Seguir viendo el menú
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar confirmación"
                    className="absolute right-4 top-4 grid size-11 place-items-center rounded-lg text-[#8996A9] hover:bg-[#F5F8FC] hover:text-[#12234A]"
                >
                    <X className="size-4" />
                </button>
            </motion.section>
        </div>
    )
}
