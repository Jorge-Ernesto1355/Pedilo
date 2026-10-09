export function sanitizePhoneInput(value: string) {
    return value.replace(/\D/g, '').slice(0, 10)
}

export function normalizePhone(value: string) {
    return value.replace(/\D/g, '')
}

export function isValidPhone(value: string) {
    return /^\d{9,10}$/.test(value.trim())
}
