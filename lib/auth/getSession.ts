import { cookies } from 'next/headers'
import { cache } from 'react'

const AUTH_API_URL =
    process.env.BACKEND_URL ??
    (process.env.NODE_ENV === 'production' ? 'https://api.pedilo.mx' : 'http://localhost:3001')

export interface User {
    id: string
    name: string
    email: string
    image?: string | null
    businessId?: string | null
}

interface AuthMeResponse {
    user?: unknown
    data?: {
        user?: unknown
    }
}

interface BetterAuthSessionResponse {
    user?: unknown
    session?: unknown
}

export interface SessionResult {
    user: User | null
}

function isUser(value: unknown): value is User {
    if (typeof value !== 'object' || value === null) {
        return false
    }

    const candidate = value as Record<string, unknown>

    return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.email === 'string' &&
        (candidate.image === undefined ||
            candidate.image === null ||
            typeof candidate.image === 'string')
    )
}

export const getSession = cache(async function getSession(): Promise<SessionResult> {
    try {
        const cookieHeader = (await cookies()).toString()
        const headers = cookieHeader ? { cookie: cookieHeader } : undefined

        const legacyResponse = await fetch(`${AUTH_API_URL}/api/v1/auth/me`, {
            method: 'POST',
            headers,
            cache: 'no-store',
        })

        if (legacyResponse.ok) {
            const body: unknown = await legacyResponse.json()

            if (typeof body === 'object' && body !== null) {
                const responseData = body as AuthMeResponse
                const user = responseData.user ?? responseData.data?.user

                if (isUser(user)) return { user }
            }
        }

        // Google sign-in is handled by Better Auth, while password login uses
        // the legacy endpoint above. Support both session formats here so the
        // protected layout does not send a valid Google session back to login.
        const betterAuthResponse = await fetch(`${AUTH_API_URL}/api/auth/get-session`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        })

        if (betterAuthResponse.ok) {
            const body: unknown = await betterAuthResponse.json()

            if (typeof body === 'object' && body !== null) {
                const sessionData = body as BetterAuthSessionResponse
                if (isUser(sessionData.user)) return { user: sessionData.user }
            }
        }

        return { user: null }
    } catch (error: unknown) {
        console.error('No se pudo validar la sesión con el backend', error)
        return { user: null }
    }
})
