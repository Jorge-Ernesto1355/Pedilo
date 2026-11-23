import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { courierLinkProblem } from '@/app/(courier)/features/courier/courierApi'
import {
    readClaimedDelivery,
    readCourierIdentity,
    saveClaimedDelivery,
    saveCourierIdentity,
} from '@/app/(courier)/features/courier/courierDevice'
import {
    addressLine,
    failureReasonLabel,
    itemCountLabel,
    mapsDirectionsUrl,
    money,
    phoneLabel,
    telHref,
} from '@/app/(courier)/features/courier/courierFormat'

function apiError(status: number, code: string) {
    const headers = new AxiosHeaders()
    return new AxiosError('fail', String(status), undefined, undefined, {
        status,
        statusText: '',
        headers,
        config: { headers },
        data: { success: false, error: { code, message: code } },
    })
}

describe('páginas del repartidor · formato', () => {
    it('el link de Maps lleva la ruta al destino', () => {
        expect(mapsDirectionsUrl({ latitude: 24.81, longitude: -107.39 })).toBe(
            'https://www.google.com/maps/dir/?api=1&destination=24.81,-107.39',
        )
    })

    it('el teléfono se marca con lada de México', () => {
        expect(telHref('6691112233')).toBe('tel:+526691112233')
        expect(telHref('+52 669 111 2233')).toBe('tel:+526691112233')
        expect(phoneLabel('6691112233')).toBe('66 9111 2233')
    })

    it('dinero y artículos en español', () => {
        expect(money(200)).toBe('$200.00')
        expect(money(1250.5)).toBe('$1,250.50')
        expect(itemCountLabel(1)).toBe('1 artículo')
        expect(itemCountLabel(3)).toBe('3 artículos')
    })

    it('la dirección agrega la colonia sin repetir el prefijo', () => {
        expect(addressLine('Av. del Mar 100', 'Centro')).toBe('Av. del Mar 100, Col. Centro')
        expect(addressLine('Av. del Mar 100', 'Col. Centro')).toBe('Av. del Mar 100, Col. Centro')
        expect(addressLine('Av. del Mar 100', 'Colosio')).toBe('Av. del Mar 100, Col. Colosio')
        expect(addressLine('Av. del Mar 100', null)).toBe('Av. del Mar 100')
    })

    it('los motivos de falla tienen texto', () => {
        expect(failureReasonLabel('CUSTOMER_UNREACHABLE')).toBe('El cliente no contesta')
        expect(failureReasonLabel(null)).toBeNull()
    })
})

describe('páginas del repartidor · datos en el teléfono', () => {
    afterEach(() => window.localStorage.clear())

    it('recuerda nombre y teléfono', () => {
        expect(readCourierIdentity()).toBeNull()
        saveCourierIdentity({ name: 'Luis', phone: '6691112233' })
        expect(readCourierIdentity()).toEqual({ name: 'Luis', phone: '6691112233' })
    })

    it('ignora datos guardados dañados', () => {
        window.localStorage.setItem('pedilo:courier', '{no es json')
        expect(readCourierIdentity()).toBeNull()
        window.localStorage.setItem('pedilo:courier', JSON.stringify({ name: 'Luis', phone: '12' }))
        expect(readCourierIdentity()).toBeNull()
    })

    it('recuerda qué ofertas tomó este teléfono (máximo 20)', () => {
        saveClaimedDelivery('oferta-1', 'entrega-1')
        expect(readClaimedDelivery('oferta-1')).toBe('entrega-1')
        expect(readClaimedDelivery('otra')).toBeNull()
        for (let index = 2; index <= 21; index += 1) {
            saveClaimedDelivery(`oferta-${index}`, `entrega-${index}`)
        }
        expect(readClaimedDelivery('oferta-21')).toBe('entrega-21')
        expect(readClaimedDelivery('oferta-1')).toBeNull()
    })
})

describe('páginas del repartidor · errores del link', () => {
    it('distingue tomada, expirada y link inválido', () => {
        expect(courierLinkProblem(apiError(409, 'DELIVERY_ALREADY_TAKEN'))).toBe('taken')
        expect(courierLinkProblem(apiError(410, 'DELIVERY_LINK_EXPIRED'))).toBe('expired')
        expect(courierLinkProblem(apiError(404, 'DELIVERY_LINK_NOT_FOUND'))).toBe('not_found')
    })

    it('un error de servidor o de red no es un problema del link', () => {
        expect(courierLinkProblem(apiError(500, 'INTERNAL_ERROR'))).toBeNull()
        expect(courierLinkProblem(new Error('offline'))).toBeNull()
    })
})
