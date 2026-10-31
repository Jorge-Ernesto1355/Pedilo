import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

export type MxPhoneValidation = {
    valid: boolean
    e164: string | null
    error: string | null
}

function hasOnlyPhoneCharacters(value: string) {
    return /^[\d+\s().-]*$/.test(value)
}

function nationalDigits(value: string) {
    let digits = value.replace(/\D/g, '')

    if (digits.startsWith('044') || digits.startsWith('045')) digits = digits.slice(3)
    else if (digits.startsWith('01')) digits = digits.slice(2)

    if (digits.startsWith('52') && digits.length === 12) digits = digits.slice(2)
    return digits
}

export function normalizePhoneInput(value: string) {
    return nationalDigits(value)
}

export function formatMxPhone(value: string) {
    const digits = nationalDigits(value)
    if (!digits) return ''
    const input = value.trim().startsWith('+') ? value.replace(/[().\s-]/g, '') : `+52${digits}`
    return new AsYouType('MX').input(input)
}

export function validateMxPhone(value: string): MxPhoneValidation {
    const trimmed = value.trim()
    if (!trimmed) return { valid: false, e164: null, error: 'Ingresa tu número de WhatsApp.' }
    if (!hasOnlyPhoneCharacters(trimmed)) {
        return { valid: false, e164: null, error: 'Solo se permiten números.' }
    }

    const digits = nationalDigits(trimmed)
    if (digits.length < 10) {
        return {
            valid: false,
            e164: null,
            error: 'El número está incompleto. Debe tener 10 dígitos.',
        }
    }
    if (digits.length > 10) {
        return { valid: false, e164: null, error: 'El número tiene más de 10 dígitos. Revísalo.' }
    }
    if (digits.startsWith('0') || /^([\d])\1{9}$/.test(digits)) {
        return { valid: false, e164: null, error: 'Este número no parece válido.' }
    }

    const parsed = parsePhoneNumberFromString(`+52${digits}`, 'MX')
    if (!parsed?.isValid() || parsed.country !== 'MX') {
        return {
            valid: false,
            e164: null,
            error: 'Ingresa un número de teléfono válido de México.',
        }
    }

    return { valid: true, e164: parsed.number, error: null }
}

export const mxPhoneSchema = z
    .string()
    .superRefine((value, context) => {
        const result = validateMxPhone(value)
        if (!result.valid) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: result.error ?? 'Número inválido.',
            })
        }
    })
    .transform((value) => validateMxPhone(value).e164 as string)

// Existing customer and order forms share the project's original 9–10 digit policy.
export function sanitizePhoneInput(value: string) {
    return value.replace(/\D/g, '').slice(0, 10)
}

export function normalizePhone(value: string) {
    return value.replace(/\D/g, '')
}

export function isValidPhone(value: string) {
    return /^\d{9,10}$/.test(value.trim())
}
