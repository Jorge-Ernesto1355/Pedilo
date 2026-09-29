'use client'

import { Check, MessageCircle, X } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

export function OrderConfirmationModal({ onClose }: { onClose: () => void }) {
    const reducedMotion = useReducedMotion()

    return (
        <div
            className="fixed inset-0 z-[70] grid place-items-center bg-[#10224A]/35 p-4 sm:p-6"
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
                className="relative w-full max-w-md border border-[#DCE5F3] bg-white p-6 text-center shadow-[0_24px_80px_-30px_rgba(19,49,117,.45)] sm:p-8"
            >
                <div className="relative mx-auto grid size-20 place-items-center rounded-[28px] bg-[#EAF8EF] text-[#16803D]">
                    <motion.span
                        initial={reducedMotion ? false : { scale: 0.75, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.08, duration: 0.24, ease: 'easeOut' }}
                        className="grid size-12 place-items-center rounded-full bg-[#D8F3DF]"
                    >
                        <Check className="size-6" strokeWidth={2.5} />
                    </motion.span>
                    <span className="absolute -right-1 -top-1 grid size-8 place-items-center rounded-full bg-[#25D366] text-white">
                        <MessageCircle className="size-4 fill-current" />
                    </span>
                </div>
                <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#16803D]">
                    Pedido confirmado
                </p>
                <h2
                    id="order-confirmation-title"
                    className="mt-2 font-display text-3xl tracking-[-.05em] text-[#12234A]"
                >
                    ¡Pedido enviado!
                </h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#65738A]">
                    Tu pedido fue enviado al negocio. Espera su respuesta por WhatsApp.
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-5 text-sm font-bold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20"
                >
                    Seguir viendo el menú
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar confirmación"
                    className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-[#8996A9] hover:bg-[#F5F8FC] hover:text-[#12234A]"
                >
                    <X className="size-4" />
                </button>
            </motion.section>
        </div>
    )
}
