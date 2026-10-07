import { beforeEach, describe, expect, it, vi } from 'vitest'

const sileoMock = vi.hoisted(() => ({
    success: vi.fn(() => 'success-id'),
    error: vi.fn(() => 'error-id'),
    warning: vi.fn(() => 'warning-id'),
    info: vi.fn(() => 'info-id'),
}))

vi.mock('sileo', () => ({ sileo: sileoMock }))

import { ApiError } from '@/app/auth/lib/client/api-error'
import {
    friendlyNotificationError,
    notify,
    orderStatusNotification,
} from '@/src/lib/notifications/notify'
import {
    getUserFriendlyError,
    getUserFriendlyFieldError,
} from '@/src/lib/errors/user-friendly-error'

describe('Pedilo notifications', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('translates order states into Spanish, contextual messages', () => {
        expect(orderStatusNotification('PREPARING', 31)).toEqual({
            title: 'Orden en preparación',
            description: 'La orden #31 ahora está en preparación.',
        })
        expect(orderStatusNotification('CANCELLED', 31).description).toContain('fue cancelada')
    })

    it.each([
        [400, 'Revisa la información'],
        [401, 'Tu sesión terminó'],
        [403, 'No tienes permisos'],
        [404, 'No encontramos'],
        [409, 'La información cambió'],
        [422, 'Revisa la información'],
        [429, 'Demasiados intentos'],
        [500, 'Ocurrió un problema en Pedilo'],
    ])('maps HTTP %s to a Spanish message', (status, expected) => {
        const message = getUserFriendlyError(
            new ApiError({ status, message: 'Internal Server Error' }),
        )
        expect(`${message.title} ${message.description}`).toContain(expected)
    })

    it('maps known codes and never exposes technical messages', () => {
        expect(
            getUserFriendlyError(
                new ApiError({
                    status: 400,
                    code: 'ORDER_PRODUCT_NOT_AVAILABLE',
                    message: 'Product is not available for this business',
                }),
            ),
        ).toEqual({
            title: 'Producto no disponible',
            description: expect.stringContaining('ya no está disponible'),
        })
        expect(
            friendlyNotificationError(
                new ApiError({
                    status: 400,
                    message: 'AxiosError: Request failed with status code 400',
                }),
                'Inténtalo nuevamente.',
            ),
        ).toContain('Algunos datos no son válidos')
        expect(
            friendlyNotificationError(
                new ApiError({ status: 401, message: 'expired' }),
                'Inténtalo nuevamente.',
            ),
        ).toContain('Inicia sesión nuevamente')
    })

    it('handles network, unknown, English, Spanish and field errors safely', () => {
        expect(getUserFriendlyError(new TypeError('Network Error')).title).toBe(
            'Sin conexión con Pedilo',
        )
        expect(
            getUserFriendlyError(new Error('Something unexpected happened')).description,
        ).toContain('Ocurrió un problema')
        expect(
            getUserFriendlyError(new Error('The server is unavailable')).description,
        ).not.toContain('The server')
        expect(
            getUserFriendlyError(new ApiError({ message: 'Revisa el teléfono.' })).description,
        ).toBe('Revisa el teléfono.')
        expect(
            getUserFriendlyError(
                new ApiError({
                    status: 422,
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                }),
            ).description,
        ).toContain('campos marcados')
        expect(
            getUserFriendlyFieldError(
                new ApiError({
                    status: 422,
                    fieldErrors: { phone: ['Invalid phone'] },
                    message: 'Request validation failed',
                }),
                'phone',
                'El número de teléfono no es válido.',
            ),
        ).toBe('El número de teléfono no es válido.')
    })

    it('suppresses an immediate duplicate notification', () => {
        notify.success({
            title: 'Producto creado',
            description: 'Se agregó al catálogo.',
            dedupeKey: 'product-1',
        })
        notify.success({
            title: 'Producto creado',
            description: 'Se agregó al catálogo.',
            dedupeKey: 'product-1',
        })

        expect(sileoMock.success).toHaveBeenCalledTimes(1)
        expect(sileoMock.success).toHaveBeenCalledWith(
            expect.objectContaining({ fill: '#111827', duration: 4500, roundness: 14 }),
        )
    })
})
