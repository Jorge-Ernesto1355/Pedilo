import { cookies } from 'next/headers'
import { cache } from 'react'

const AUTH_API_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'

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
        const response = await fetch(`${AUTH_API_URL}/api/v1/auth/me`, {
            method: 'POST',
            headers: cookieHeader ? { cookie: cookieHeader } : undefined,
            cache: 'no-store',
        })

        if (!response.ok) {
            console.error('La validación de sesión respondió con error', {
                status: response.status,
            })
            return { user: null }
        }

        const body: unknown = await response.json()

        if (typeof body !== 'object' || body === null) {
            return { user: null }
        }

        const responseData = body as AuthMeResponse
        const user = responseData.user ?? responseData.data?.user

        return isUser(user) ? { user } : { user: null }
    } catch (error: unknown) {
        console.error('No se pudo validar la sesión con el backend', error)
        return { user: null }
    }
})
