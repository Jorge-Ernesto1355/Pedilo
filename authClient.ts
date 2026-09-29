import { createAuthClient } from 'better-auth/react'

const configuredBackendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    (process.env.NODE_ENV === 'production' ? 'https://api.pedilo.mx' : 'http://localhost:3001')

export const authClient = createAuthClient({
    baseURL: `${configuredBackendUrl.replace(/\/$/, '')}/api/auth`,
})
