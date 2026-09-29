export function normalizeBusinessWhatsAppNumber(value: string | null | undefined) {
    const digits = (value ?? '').replace(/\D/g, '')

    if (digits.length === 10) return `52${digits}`
    if (digits.length === 12 && digits.startsWith('52')) return digits

    return null
}

type OrderMessageInput = {
    businessName: string
    customerName: string
    customerPhone: string
    lines: string[]
    total: string
    notes: string
}

export function createWhatsAppOrderMessage({
    businessName,
    customerName,
    customerPhone,
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
        ...(notes ? [`Notas: ${notes}`] : []),
    ].join('\n')
}
