import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/auth/login/route'
import { registerUser } from '@/app/auth/lib/client/register'

const backendFetch = vi.fn()
const apiPost = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/client', () => ({
    apiClient: { post: apiPost },
    isAxiosError: (error: unknown) =>
        Boolean(error && typeof error === 'object' && (error as { isAxiosError?: boolean }).isAxiosError),
}))

function request(body: unknown) {
    return new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    })
}

function backendResponse(status: number, body?: unknown, headers?: HeadersInit) {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    })
}

describe('login API proxy', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', backendFetch)
        backendFetch.mockReset()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it.each([
        ['malformed JSON', new Request('http://localhost/api/auth/login', { method: 'POST', body: '{' })],
        ['missing fields', request({})],
        ['invalid email', request({ email: 'not-an-email', password: 'correct-horse' })],
        ['short password', request({ email: 'owner@example.com', password: 'short' })],
        ['unexpected fields', request({ email: 'owner@example.com', password: 'correct-horse', role: 'admin' })],
    ])('rejects %s before contacting the backend', async (_label, input) => {
        const response = await POST(input)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Revisa los datos ingresados.' })
        expect(backendFetch).not.toHaveBeenCalled()
    })

    it('normalizes credentials and forwards a successful session cookie', async () => {
        backendFetch.mockResolvedValue(
            backendResponse(201, { user: { id: 'user-1' } }, {
                'set-cookie': 'better-auth.session_token=secret; Domain=backend.local; Path=/api; HttpOnly; Secure',
            }),
        )

        const response = await POST(
            request({ email: ' OWNER@EXAMPLE.COM ', password: 'correct-horse', remember: true }),
        )

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ success: true })
        expect(backendFetch).toHaveBeenCalledWith(
            'http://localhost:3001/api/v1/auth/login',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ email: 'owner@example.com', password: 'correct-horse' }),
                cache: 'no-store',
            }),
        )
        expect(response.headers.get('set-cookie')).toContain('better-auth.session_token=secret')
        expect(response.headers.get('set-cookie')).toContain('Path=/')
        expect(response.headers.get('set-cookie')).not.toContain('Domain=backend.local')
        expect(response.headers.get('set-cookie')).not.toContain('Domain=pedilo.mx')
        expect(response.headers.get('set-cookie')).not.toContain('Secure')
    })

    it('keeps the production domain and secure cookie on pedilo.mx', async () => {
        backendFetch.mockResolvedValue(
            backendResponse(201, undefined, {
                'set-cookie': 'better-auth.session_token=secret; Path=/; HttpOnly',
            }),
        )

        const response = await POST(
            new Request('https://pedilo.mx/api/auth/login', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email: 'owner@example.com', password: 'correct-horse' }),
            }),
        )

        expect(response.headers.get('set-cookie')).toContain('Domain=pedilo.mx')
        expect(response.headers.get('set-cookie')).toContain('Secure')
    })

    it('uses one generic message for invalid credentials', async () => {
        backendFetch.mockResolvedValue(backendResponse(401, { error: 'User exists; password hash mismatch' }))

        const response = await POST(request({ email: 'owner@example.com', password: 'wrong-pass' }))

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ error: 'Correo o contraseña inválidos.' })
    })

    it('preserves a backend rate-limit message when it is safe to show', async () => {
        backendFetch.mockResolvedValue(backendResponse(429, { message: 'Espera 30 segundos.' }))

        const response = await POST(request({ email: 'owner@example.com', password: 'correct-horse' }))

        expect(response.status).toBe(429)
        expect(await response.json()).toEqual({ error: 'Espera 30 segundos.' })
    })

    it.each([500, 502, 503, 599])('maps backend %s to a safe upstream error', async (status) => {
        backendFetch.mockResolvedValue(backendResponse(status, { error: 'stack trace; password=secret' }))

        const response = await POST(request({ email: 'owner@example.com', password: 'correct-horse' }))

        expect(response.status).toBe(502)
        expect(await response.json()).toEqual({ error: 'No se pudo iniciar sesión. Intenta de nuevo.' })
    })

    it('maps connection failures to 503 without exposing the exception', async () => {
        backendFetch.mockRejectedValue(new Error('ECONNREFUSED internal-auth-host'))

        const response = await POST(request({ email: 'owner@example.com', password: 'correct-horse' }))

        expect(response.status).toBe(503)
        expect(await response.json()).toEqual({ error: 'No se pudo conectar con el servidor. Intenta de nuevo.' })
    })

    it('maps a backend timeout to 504', async () => {
        vi.useFakeTimers()
        backendFetch.mockImplementation((_url: string, options: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
                options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
            }),
        )

        const pendingResponse = POST(request({ email: 'owner@example.com', password: 'correct-horse' }))
        await vi.advanceTimersByTimeAsync(8_000)
        const response = await pendingResponse

        expect(response.status).toBe(504)
        expect(await response.json()).toEqual({ error: 'El servidor tardó demasiado. Intenta de nuevo.' })
    })
})

describe('register transport', () => {
    beforeEach(() => apiPost.mockReset())

    it('sends only the backend registration payload', async () => {
        apiPost.mockResolvedValue({ data: { success: true } })

        await expect(
            registerUser({
                name: 'Ana López',
                email: 'owner@example.com',
                password: 'correct-horse-7',
                terms: true,
            }),
        ).resolves.toEqual({ success: true })
        expect(apiPost).toHaveBeenCalledWith('/auth/register', {
            name: 'Ana López',
            email: 'owner@example.com',
            password: 'correct-horse-7',
            terms: true,
        })
    })

})
