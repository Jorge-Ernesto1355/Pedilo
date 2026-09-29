import { describe, expect, it } from 'vitest'
import {
    createWhatsAppOrderMessage,
    normalizeBusinessWhatsAppNumber,
} from '@/app/menu/[slug]/features/public-menu/whatsapp'

describe('business WhatsApp orders', () => {
    it.each([
        ['668 123 4567', '526681234567'],
        ['+52 668 123 4567', '526681234567'],
        ['+526681234567', '526681234567'],
        ['52-668-123-4567', '526681234567'],
        ['526681234567', '526681234567'],
    ])('normalizes %s for wa.me', (input, expected) => {
        expect(normalizeBusinessWhatsAppNumber(input)).toBe(expected)
    })

    it('rejects a number that is not a Mexican 10-digit number', () => {
        expect(normalizeBusinessWhatsAppNumber('123456789')).toBeNull()
    })

    it('includes customer contact and order details in the message', () => {
        expect(
            createWhatsAppOrderMessage({
                businessName: 'La Esquina',
                customerName: 'Jorge',
                customerPhone: '668-123-4567',
                lines: ['2x Clásica — $258'],
                total: '$258',
                notes: 'Sin cebolla',
            }),
        ).toContain('WhatsApp: 668-123-4567')
    })
})
