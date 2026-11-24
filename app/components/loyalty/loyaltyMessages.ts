import { normalizeMexicanWhatsAppNumber } from '@/app/menu/[slug]/features/public-menu/whatsapp'

// Mensajes de WhatsApp de la tarjeta de lealtad. Todos son enlaces wa.me que abre el
// dueño (sin costo de API), igual que "Enviar tarjeta" de la tarjeta de pago.

/** Link privado de la tarjeta del cliente. */
export function loyaltyCardLink(
    token: string,
    origin = typeof window !== 'undefined' ? window.location.origin : '',
) {
    return `${origin.replace(/\/$/, '')}/tarjeta/${encodeURIComponent(token)}`
}

function stampsText(stampsCount: number, stampsRequired: number) {
    return `${Math.min(stampsCount, stampsRequired)} de ${stampsRequired} sellos`
}

/** "Enviar tarjeta por WhatsApp" (Clientes). */
export function loyaltyCardMessage(input: {
    customerName: string | null
    restaurantName: string
    stampsCount: number
    stampsRequired: number
    rewardReady: boolean
    rewardLabel: string
    link: string
}) {
    const greeting = input.customerName ? `Hola ${input.customerName.split(' ')[0]},` : 'Hola,'
    return [
        `${greeting} esta es tu tarjeta de lealtad de ${input.restaurantName}.`,
        input.rewardReady
            ? `Tienes un premio listo: ${input.rewardLabel}. Úsalo en tu siguiente pedido.`
            : `Llevas ${stampsText(input.stampsCount, input.stampsRequired)}. Al completarla ganas ${input.rewardLabel}.`,
        `Tu tarjeta: ${input.link}`,
    ].join('\n')
}

/** Aviso manual de tarjeta completada (comanda). */
export function loyaltyCompletedMessage(input: {
    customerName: string | null
    restaurantName: string
    rewardLabel: string
    link: string | null
}) {
    const greeting = input.customerName ? `Hola ${input.customerName.split(' ')[0]},` : 'Hola,'
    return [
        `${greeting} completaste tu tarjeta de lealtad de ${input.restaurantName}.`,
        `Tu premio: ${input.rewardLabel}. Úsalo en tu siguiente pedido.`,
        ...(input.link ? [`Tu tarjeta: ${input.link}`] : []),
    ].join('\n')
}

/** Línea que se agrega a los mensajes que ya se mandan al cliente (p. ej. "En camino"). */
export function loyaltyProgressLine(stampsCount: number, stampsRequired: number, link: string) {
    return `Llevas ${stampsText(stampsCount, stampsRequired)}. Tu tarjeta: ${link}`
}

export function whatsAppUrl(phone: string | null | undefined, message: string) {
    const normalized = normalizeMexicanWhatsAppNumber(phone)
    return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null
}
