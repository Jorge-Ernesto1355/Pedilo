import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    getApiBaseUrl,
    getBackendUrl,
    getBetterAuthUrl,
    getPediloEnvironment,
} from '@/lib/auth/config'

describe('Pedilo environment configuration', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it.each([
        ['local', 'http://localhost:3001'],
        ['development', 'https://api-dev.pedilo.mx'],
        ['production', 'https://api.pedilo.mx'],
    ] as const)('%s selects its own backend', (environment, backendUrl) => {
        vi.stubEnv('PEDILO_ENV', environment)
        vi.stubEnv('NEXT_PUBLIC_PEDILO_ENV', environment)
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', backendUrl)

        expect(getPediloEnvironment()).toBe(environment)
        expect(getBackendUrl()).toBe(backendUrl)
        expect(getApiBaseUrl()).toBe(`${backendUrl}/api/v1`)
    })

    it('does not fall back to production when Development has no backend URL', () => {
        vi.stubEnv('PEDILO_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_PEDILO_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', '')
        vi.stubEnv('BACKEND_URL', '')

        expect(() => getBackendUrl()).toThrow(/Falta NEXT_PUBLIC_BACKEND_URL/)
    })

    it('rejects a backend URL from another environment', () => {
        vi.stubEnv('PEDILO_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_PEDILO_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.pedilo.mx')

        expect(() => getBackendUrl()).toThrow(/no corresponde al entorno development/)
    })

    it('builds Better Auth URLs from the same backend origin', () => {
        vi.stubEnv('PEDILO_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_PEDILO_ENV', 'development')
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api-dev.pedilo.mx')

        expect(getBetterAuthUrl()).toBe('https://api-dev.pedilo.mx/api/auth')
    })
})
