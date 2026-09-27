export function sanitizePhoneInput(value: string) {
    return value.replace(/[^\d\s()-]/g, '').slice(0, 20)
}

export function normalizePhone(value: string) {
    return value.replace(/\D/g, '')
}

export function isValidPhone(value: string) {
    return /^[\d\s()-]+$/.test(value.trim()) && normalizePhone(value).length === 10
}
