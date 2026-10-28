export const PEDILO_ENVIRONMENTS = ['local', 'development', 'production'] as const
export type PediloEnvironment = (typeof PEDILO_ENVIRONMENTS)[number]

const DEFAULT_BACKEND_URLS: Record<PediloEnvironment, string> = {
    local: 'http://localhost:3001',
    development: 'https://api-dev.pedilo.mx',
    production: 'https://api.pedilo.mx',
}

function getConfiguredEnvironment(): PediloEnvironment {
    const configured =
        process.env.NEXT_PUBLIC_PEDILO_ENV ??
        process.env.PEDILO_ENV ??
        (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 'local' : '')

    if (!PEDILO_ENVIRONMENTS.includes(configured as PediloEnvironment)) {
        throw new Error(
            'PEDILO_ENV debe ser local, development o production. Configúralo explícitamente en el despliegue.',
        )
    }

    return configured as PediloEnvironment
}

export function getPediloEnvironment(): PediloEnvironment {
    return getConfiguredEnvironment()
}

/**
 * The browser needs a public value, while server components may use BACKEND_URL.
 * Both values represent the backend origin, not an API path.
 */
export function getBackendUrl() {
    const environment = getConfiguredEnvironment()
    const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL

    // Local development has a safe default. Deployed environments must declare
    // their backend explicitly so a missing Development variable can never hit
    // Production by accident.
    if (!configuredUrl && environment !== 'local') {
        throw new Error(`Falta NEXT_PUBLIC_BACKEND_URL/BACKEND_URL para el entorno ${environment}.`)
    }

    if (configuredUrl) {
        const configuredOrigin = new URL(configuredUrl).origin
        const expectedOrigin = new URL(DEFAULT_BACKEND_URLS[environment]).origin
        if (configuredOrigin !== expectedOrigin) {
            throw new Error(
                `La URL del backend (${configuredOrigin}) no corresponde al entorno ${environment}. Se esperaba ${expectedOrigin}.`,
            )
        }
    }

    return (configuredUrl ?? DEFAULT_BACKEND_URLS[environment]).replace(/\/$/, '')
}

export function getApiBaseUrl() {
    const backendUrl = getBackendUrl()
    return backendUrl.endsWith('/api/v1') ? backendUrl : `${backendUrl}/api/v1`
}

export function getBetterAuthUrl() {
    return `${getBackendUrl()}/api/auth`
}

export function getLegacyAuthUrl() {
    return `${getBackendUrl()}/api/v1/auth`
}
