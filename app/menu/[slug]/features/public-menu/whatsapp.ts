export function normalizeBusinessWhatsAppNumber(value: string | null | undefined) {
    const digits = (value ?? '').replace(/\D/g, '')

    if (digits.length === 10) return `52${digits}`
    if (digits.length === 12 && digits.startsWith('52')) return digits

    return null
}

export function normalizeMexicanWhatsAppNumber(value: string | null | undefined) {
    const digits = (value ?? '').replace(/\D/g, '')
    if (digits.length === 10) return `52${digits}`
    if (digits.length === 12 && digits.startsWith('52')) return digits
    return null
}

export function createTransferCardMessage({
    customerName,
    businessName,
    bankName,
    clabe,
    beneficiaryName,
    orderNumber,
    total,
}: {
    customerName: string
    businessName: string
    bankName: string
    clabe: string
    beneficiaryName: string
    orderNumber?: number
    total?: number
}) {
    return [
        `Hola ${customerName}, aquí están los datos para tu transferencia a ${businessName}:`,
        `Banco: ${bankName}`,
        `CLABE: ${clabe}`,
        `Beneficiario: ${beneficiaryName}`,
        ...(orderNumber !== undefined && total !== undefined
            ? [`Pedido #${orderNumber} · Total: $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]
            : []),
        'Gracias.',
    ].join('\n')
}

import type { OrderFulfillmentType } from '@/src/lib/api/order-types'

type OrderMessageInput = {
    businessName: string
    customerName: string
    customerPhone: string
    fulfillmentType: OrderFulfillmentType
    lines: string[]
    total: string
    notes: string
}

export function createWhatsAppOrderMessage({
    businessName,
    customerName,
    customerPhone,
    fulfillmentType,
    lines,
    total,
    notes,
}: OrderMessageInput) {
    return [
        `Hola, soy ${customerName}. Quiero hacer este pedido en ${businessName}:`,
        ...lines,
        `Total: ${total}`,
        '',
        `Cliente: ${customerName}`,
        `WhatsApp: ${customerPhone}`,
        `Modalidad: ${fulfillmentType === 'DINE_IN' ? 'Comer aquí' : 'Para llevar / recoger'}`,
        ...(notes ? [`Notas: ${notes}`] : []),
    ].join('\n')
}

export function createTransferWhatsAppMessage({ businessName, customerName, total }: { businessName: string; customerName: string; total: number }) {
    return `Hola, soy ${customerName || 'cliente'} de ${businessName}. Ya realicé la transferencia de $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} correspondiente a mi pedido. Adjunto mi comprobante.`
}
