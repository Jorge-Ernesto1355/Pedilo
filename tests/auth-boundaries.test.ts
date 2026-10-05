import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { middleware } from '@/middleware'

function nextRequest(path: string, cookies: Record<string, string> = {}) {
    const request = new NextRequest(`http://localhost${path}`)
    for (const [name, value] of Object.entries(cookies)) request.cookies.set(name, value)
    return request
}

describe('protected auth boundary', () => {
    it.each(['/dashboard', '/create-menu', '/settings', '/orders'])(
        'redirects %s requests without a supported session cookie',
        (path) => {
            const response = middleware(nextRequest(path))

            expect(response.status).toBe(307)
            expect(response.headers.get('location')).toBe('http://localhost/auth/login')
        },
    )

    it.each([
        'better-auth.session_token',
        '__Secure-better-auth.session_token',
        'better-auth.session_token.0',
        '__Secure-better-auth.session_token.0',
    ])('allows protected route requests with %s', (cookieName) => {
        const response = middleware(nextRequest('/dashboard/orders', { [cookieName]: 'session' }))

        expect(response.status).toBe(200)
        expect(response.headers.get('location')).toBeNull()
    })
})
