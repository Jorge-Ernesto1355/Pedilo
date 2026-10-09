import { describe, expect, it } from 'vitest'
import { isValidPhone, normalizePhone, sanitizePhoneInput } from '@/src/lib/validation/phone'

describe('phone validation', () => {
    it('accepts nine or ten digits without separators', () => {
        expect(isValidPhone('698119319')).toBe(true)
        expect(isValidPhone('6691234567')).toBe(true)
    })

    it('rejects separators, invalid lengths and country prefixes', () => {
        expect(isValidPhone('668-88-9')).toBe(false)
        expect(isValidPhone('66912345678')).toBe(false)
        expect(isValidPhone('+52 669 123 4567')).toBe(false)
    })

    it('sanitizes the value sent by the form to digits only', () => {
        expect(normalizePhone('(669) 123-4567')).toBe('6691234567')
        expect(sanitizePhoneInput('669abc-123-4567')).toBe('6691234567')
    })
})
