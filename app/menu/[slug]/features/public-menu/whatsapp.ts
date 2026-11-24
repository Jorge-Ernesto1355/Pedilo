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
    /** Solo pedidos a domicilio. */
    delivery?: {
        address: string
        neighborhood: string
        reference?: string | null
        latitude: number
        longitude: number
        paymentNote: string
    }
}

const fulfillmentLabels: Record<OrderFulfillmentType, string> = {
    DINE_IN: 'Comer aquí',
    PICKUP: 'Para llevar / recoger',
    DELIVERY: 'A domicilio',
}

export function createWhatsAppOrderMessage({
    businessName,
    customerName,
    customerPhone,
    fulfillmentType,
    lines,
    total,
    notes,
    delivery,
}: OrderMessageInput) {
    return [
        `Hola, soy ${customerName}. Quiero hacer este pedido en ${businessName}:`,
        ...lines,
        `Total: ${total}`,
        '',
        `Cliente: ${customerName}`,
        `WhatsApp: ${customerPhone}`,
        `Modalidad: ${fulfillmentLabels[fulfillmentType]}`,
        ...(delivery
            ? [
                  `Dirección: ${delivery.address}`,
                  `Colonia: ${delivery.neighborhood}`,
                  ...(delivery.reference ? [`Referencia: ${delivery.reference}`] : []),
                  `Ubicación: https://www.google.com/maps?q=${delivery.latitude},${delivery.longitude}`,
                  `Pago: ${delivery.paymentNote}`,
              ]
            : []),
        ...(notes ? [`Notas: ${notes}`] : []),
    ].join('\n')
}

/** Texto obligatorio para pedidos a domicilio pagados por transferencia. */
export function deliveryTransferNote(deliveryFee: number | null) {
    return deliveryFee === null
        ? 'Pagas la comida por transferencia y el envío en efectivo al repartidor'
        : `Pagas la comida por transferencia y el envío ($${formatMoney(deliveryFee)}) en efectivo al repartidor`
}

export function formatMoney(value: number) {
    return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function createTransferWhatsAppMessage({ businessName, customerName, total }: { businessName: string; customerName: string; total: number }) {
    return `Hola, soy ${customerName || 'cliente'} de ${businessName}. Ya realicé la transferencia de $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} correspondiente a mi pedido. Adjunto mi comprobante.`
}
