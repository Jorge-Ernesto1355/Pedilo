import { cookies } from 'next/headers'
import { cache } from 'react'
import { getBetterAuthUrl, getLegacyAuthUrl } from './config'

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
    data?: {
        user?: unknown
        session?: unknown
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
            typeof candidate.image === 'string') &&
        (candidate.businessId === undefined ||
            candidate.businessId === null ||
            typeof candidate.businessId === 'string')
    )
}

async function getLegacyUser(headers: HeadersInit | undefined): Promise<User | null> {
    try {
        const legacyResponse = await fetch(`${getLegacyAuthUrl()}/me`, {
            method: 'POST',
            headers,
            cache: 'no-store',
        })

        if (!legacyResponse.ok) return null

        const body: unknown = await legacyResponse.json()

        if (typeof body !== 'object' || body === null) return null

        const responseData = body as AuthMeResponse
        const user = responseData.user ?? responseData.data?.user

        return isUser(user) ? user : null
    } catch {
        return null
    }
}

export const getSession = cache(async function getSession(): Promise<SessionResult> {
    const cookieHeader = (await cookies()).toString()
    const headers = cookieHeader ? { cookie: cookieHeader } : undefined

    // Better Auth owns Google sessions. Resolve it first so a failure in the
    // legacy password-session endpoint cannot turn a valid OAuth session into
    // a false unauthenticated result.
    try {
        const betterAuthResponse = await fetch(`${getBetterAuthUrl()}/get-session`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        })

        if (betterAuthResponse.ok) {
            const body: unknown = await betterAuthResponse.json()

            if (typeof body === 'object' && body !== null) {
                const sessionData = body as BetterAuthSessionResponse
                const user = sessionData.user ?? sessionData.data?.user
                if (isUser(user)) {
                    // Better Auth's user is authoritative for authentication,
                    // while businessId is application data maintained by the
                    // legacy API. Enrich without making auth depend on it.
                    if (user.businessId !== undefined) return { user }

                    const legacyUser = await getLegacyUser(headers)
                    return {
                        user:
                            legacyUser?.businessId !== undefined
                                ? { ...user, businessId: legacyUser.businessId }
                                : user,
                    }
                }
            }
        }
    } catch {
        // Try the legacy session endpoint below. Do not expose backend details.
    }

    // Password login still uses the legacy auth API. Keep it as an isolated
    // fallback for existing sessions and deployments during the migration.
    const legacyUser = await getLegacyUser(headers)
    if (legacyUser) return { user: legacyUser }

    return { user: null }
})
