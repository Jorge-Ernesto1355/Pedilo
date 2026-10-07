import { describe, expect, it } from 'vitest'

import {
    getRegisterError,
    networkAuthError,
    safeAuthError,
} from '@/app/auth/lib/client/error-message'
import { ApiError } from '@/app/auth/lib/client/api-error'

describe('safeAuthError', () => {
    it('uses a generic message for invalid login credentials', () => {
        expect(safeAuthError(401, 'login')).toBe('Correo o contraseña inválidos.')
    })

    it('does not expose backend text for any status', () => {
        for (const status of [400, 401, 403, 404, 500, 503, 599]) {
            const message = safeAuthError(status, 'login')
            expect(message).not.toMatch(/stack|database|sql|mongodb|token|secret/i)
        }
    })

    it('keeps registration errors safe and actionable', () => {
        expect(safeAuthError(400, 'register')).toBe('Revisa los datos ingresados.')
        expect(safeAuthError(429, 'register')).toBe(
            'Demasiados intentos. Intenta de nuevo más tarde.',
        )
    })

    it('provides a safe network error', () => {
        expect(networkAuthError).not.toMatch(/error|stack|database|token/i)
    })

    it('keeps duplicate-email feedback safe and in Spanish', () => {
        expect(
            getRegisterError(
                new ApiError({
                    status: 409,
                    code: 'EMAIL_ALREADY_IN_USE',
                    message: 'The email jorge@gmail.com is already in use',
                }),
            ),
        ).toBe('Este correo ya tiene una cuenta. Inicia sesión para continuar.')
    })
})
