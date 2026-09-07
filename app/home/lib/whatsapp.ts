import { z } from 'zod'

function digitsOnly(value: string) {
    return [...value].filter((character) => character >= '0' && character <= '9').join('')
}

function normalizeWhatsAppNumber(value: string) {
    const digits = digitsOnly(value)
    const national = digits.startsWith('52') && digits.length === 12 ? digits.slice(2) : digits
    return `+52${national}`
}

export const whatsappNumberSchema = z.object({
    phone: z.string().trim().min(10, 'Escribe un número de WhatsApp válido.'),
}).strict().transform(({ phone }) => ({ phone: normalizeWhatsAppNumber(phone) })).superRefine(({ phone }, context) => {
    const nationalDigits = digitsOnly(phone.slice(3))
    if (!phone.startsWith('+52') || nationalDigits.length !== 10 || phone.slice(3) !== nationalDigits) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Usa un número de México con 10 dígitos.' })
    }
})
