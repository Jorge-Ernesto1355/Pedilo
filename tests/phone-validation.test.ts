import { describe, expect, it } from 'vitest'
import { isValidPhone, normalizePhone, sanitizePhoneInput } from '@/src/lib/validation/phone'

describe('phone validation', () => {
    it('accepts the supported Mexican visual formats', () => {
        expect(isValidPhone('669-123-4567')).toBe(true)
        expect(isValidPhone('669 123 4567')).toBe(true)
        expect(isValidPhone('(669) 123-4567')).toBe(true)
    })

    it('rejects invalid lengths and country prefixes', () => {
        expect(isValidPhone('669123456')).toBe(false)
        expect(isValidPhone('66912345678')).toBe(false)
        expect(isValidPhone('+52 669 123 4567')).toBe(false)
    })

    it('normalizes without changing the visual value sent by the form', () => {
        expect(normalizePhone('(669) 123-4567')).toBe('6691234567')
        expect(sanitizePhoneInput('669abc-123-4567')).toBe('669-123-4567')
    })
})
