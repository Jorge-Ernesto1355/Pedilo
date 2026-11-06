'use client'

import { Check, Copy, MessageCircle, X } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import type { OrderPaymentMethod, TransferCardSnapshot } from '@/src/lib/api/order-types'
import { createTransferCardMessage, normalizeBusinessWhatsAppNumber } from './whatsapp'
import { PaymentCardView } from '@/app/(protected)/create-menu/features/payment-card/PaymentCard'
import { detectBank } from '@/src/lib/validation/clabe'

export function OrderConfirmationModal({
    onClose,
    whatsappUrl,
    paymentMethod = 'CASH',
    transferCard,
    total = 0,
    businessWhatsAppNumber,
    orderNumber,
    customerName = 'cliente',
}: {
    onClose: () => void
    whatsappUrl?: string | null
    paymentMethod?: OrderPaymentMethod
    transferCard?: TransferCardSnapshot | null
    total?: number
    businessWhatsAppNumber?: string | null
    orderNumber?: number
    customerName?: string
}) {
    const reducedMotion = useReducedMotion()
    const [copied, setCopied] = useState(false)
    const [showCard, setShowCard] = useState(false)
    const isTransfer = paymentMethod === 'TRANSFER' && transferCard
    const copyClabe = async () => {
        if (!transferCard) return
        await navigator.clipboard?.writeText(transferCard.clabe)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
    }

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
                    {isTransfer ? 'Tu pedido fue creado. Realiza la transferencia con los datos del negocio.' : 'Continúa en WhatsApp para enviarlo al negocio y esperar su respuesta.'}
                </p>
                {isTransfer && !showCard && (
                    <button type="button" data-cy="open-transfer-card" onClick={() => setShowCard(true)} className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1E40AF] px-5 text-base font-bold text-white">Ver tarjeta para pagar</button>
                )}
                {isTransfer && showCard && (
                    <div data-cy="transfer-card-modal" className="mt-6 rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] p-4 text-left">
                        <PaymentCardView card={{ id: 'transfer-order', clabe: transferCard.clabe, beneficiaryName: transferCard.beneficiaryName, bankCode: transferCard.bankCode, bankName: transferCard.bankName, isActive: true }} bank={detectBank(transferCard.clabe)} restaurantName={transferCard.restaurantName} />
                        <div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[#53647D]">Total a transferir: <strong>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span><button type="button" data-cy="copy-transfer-clabe" onClick={() => void copyClabe()} className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#2451C5]" aria-label="Copiar CLABE"><Copy className="size-4" /></button></div>
                        {copied && <p data-cy="transfer-clabe-copied" className="mt-2 text-xs font-bold text-[#16803D]">CLABE copiada</p>}
                    </div>
                )}
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
                {isTransfer && normalizeBusinessWhatsAppNumber(businessWhatsAppNumber) && (
                    <a data-cy="transfer-whatsapp-link" href={`https://wa.me/${normalizeBusinessWhatsAppNumber(businessWhatsAppNumber)}?text=${encodeURIComponent(createTransferCardMessage({ businessName: transferCard.restaurantName, customerName, bankName: transferCard.bankName, clabe: transferCard.clabe, beneficiaryName: transferCard.beneficiaryName, orderNumber, total }))}`} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#B8DDC6] bg-[#F3FBF5] px-5 text-base font-bold text-[#16803D]">Enviar mensaje por WhatsApp</a>
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
