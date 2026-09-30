const DEFAULT_BACKEND_URL =
    process.env.NODE_ENV === 'production' ? 'https://api.pedilo.mx' : 'http://localhost:3001'

/**
 * The browser needs a public value, while server components may use BACKEND_URL.
 * Both values represent the backend origin, not an API path.
 */
export function getBackendUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL
    return (configuredUrl ?? DEFAULT_BACKEND_URL).replace(/\/$/, '')
}

export function getBetterAuthUrl() {
    return `${getBackendUrl()}/api/auth`
}

export function getLegacyAuthUrl() {
    return `${getBackendUrl()}/api/v1/auth`
}
