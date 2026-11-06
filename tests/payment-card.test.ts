import { describe, expect, it } from 'vitest'
import { detectBank, isValidClabe, normalizeClabe } from '@/src/lib/validation/clabe'
import { createTransferCardMessage, normalizeMexicanWhatsAppNumber } from '@/app/menu/[slug]/features/public-menu/whatsapp'

describe('tarjeta para transferencias', () => {
    it('valida y normaliza CLABE', () => {
        expect(normalizeClabe('012-000 000 000 000 001')).toBe('012000000000000001')
        expect(isValidClabe('012000000000000001')).toBe(true)
        expect(isValidClabe('012000000000000002')).toBe(false)
        expect(isValidClabe('01200000000000001')).toBe(false)
    })
    it('detecta bancos y usa tema genérico', () => {
        expect(detectBank('012000000000000001')).toMatchObject({ code: '012', name: 'BBVA' })
        expect(detectBank('999000000000000001')).toMatchObject({ code: '999', name: 'Banco' })
    })
    it('normaliza teléfonos mexicanos', () => {
        expect(normalizeMexicanWhatsAppNumber('(669) 123-4567')).toBe('526691234567')
        expect(normalizeMexicanWhatsAppNumber('+52 669 123 4567')).toBe('526691234567')
    })
    it('genera mensaje con y sin pedido', () => {
        const input = { customerName: 'Ana', businessName: 'Café', bankName: 'BBVA', clabe: '012000000000000001', beneficiaryName: 'Café SA' }
        expect(createTransferCardMessage({ ...input, orderNumber: 42, total: 204 })).toContain('Pedido #42 · Total: $204.00')
        expect(createTransferCardMessage(input)).not.toContain('Pedido #')
    })
})
