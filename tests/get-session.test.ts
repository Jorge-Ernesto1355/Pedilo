import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookiesMock = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: cookiesMock }))

import { getSession } from '@/lib/auth/getSession'

const fetchMock = vi.fn()

const user = {
    id: 'google-user-1',
    name: 'Google User',
    email: 'google@example.com',
    emailVerified: true,
}

function response(body: unknown, ok = true) {
    return {
        ok,
        json: vi.fn().mockResolvedValue(body),
    }
}

describe('server session resolution', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock)
        fetchMock.mockReset()
        cookiesMock.mockResolvedValue({ toString: () => 'better-auth.session_token=opaque' })
    })

    it('resolves a Better Auth session before consulting the legacy API', async () => {
        fetchMock.mockResolvedValue(response({ session: { id: 'session-1' }, user }))

        await expect(getSession()).resolves.toEqual({ user })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/api/auth/get-session'),
            expect.objectContaining({
                method: 'GET',
                headers: { cookie: 'better-auth.session_token=opaque' },
                cache: 'no-store',
            }),
        )
    })

    it('falls back to the legacy session format when Better Auth is unavailable', async () => {
        fetchMock
            .mockRejectedValueOnce(new Error('Better Auth unavailable'))
            .mockResolvedValueOnce(response({ user }))

        await expect(getSession()).resolves.toEqual({ user })
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock.mock.calls[0][0]).toContain('/api/auth/get-session')
        expect(fetchMock.mock.calls[1][0]).toContain('/api/v1/auth/me')
    })

    it('falls back to the legacy session format for password sessions', async () => {
        fetchMock
            .mockResolvedValueOnce(response({ user: null }))
            .mockResolvedValueOnce(response({ data: { user } }))

        await expect(getSession()).resolves.toEqual({ user })
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
