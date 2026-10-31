import { describe, expect, it } from 'vitest'
import {
    formatMxPhone,
    isValidPhone,
    normalizePhone,
    normalizePhoneInput,
    sanitizePhoneInput,
    validateMxPhone,
} from '@/src/lib/validation/phone'

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

describe('validación de WhatsApp mexicano', () => {
    it.each([
        ['', 'Ingresa tu número de WhatsApp.'],
        ['abc', 'Solo se permiten números.'],
        ['55123', 'El número está incompleto. Debe tener 10 dígitos.'],
        ['55 1234 5678', null],
        ['+52 55 1234 5678', null],
        ['525512345678', null],
        ['045 55 1234 5678', null],
        ['0000000000', 'Este número no parece válido.'],
        ['55123456789', 'El número tiene más de 10 dígitos. Revísalo.'],
    ])('valida %j', (value, expectedError) => {
        const result = validateMxPhone(value)
        if (expectedError) {
            expect(result).toMatchObject({ valid: false, e164: null, error: expectedError })
        } else {
            expect(result).toMatchObject({ valid: true, e164: '+525512345678', error: null })
        }
    })

    it('normaliza prefijos nacionales anteriores y presenta el formato internacional', () => {
        expect(normalizePhoneInput('045 55 1234 5678')).toBe('5512345678')
        expect(formatMxPhone('5512345678')).toBe('+52 55 1234 5678')
    })
})
