import { NextResponse } from 'next/server'
import { loginSchema } from '@/app/auth/lib/validation'

const AUTH_API_URL = process.env.BACKEND_URL ?? 'https:api.pedilo.mx'
const LOGIN_TIMEOUT_MS = 8_000

interface RateLimitBody {
    message?: unknown
}

function adaptSetCookieForApp(setCookie: string): string {
    let cookie = setCookie.replace(/;\s*Domain=[^;]*/gi, '')

    cookie = /;\s*Path=/i.test(cookie)
        ? cookie.replace(/;\s*Path=[^;]*/i, '; Path=/')
        : `${cookie}; Path=/`

    if (!/;\s*Domain=/i.test(cookie)) {
        cookie += '; Domain=pedilo.mx'
    }

    if (!/;\s*Secure/i.test(cookie)) {
        cookie += '; Secure'
    }

    return cookie
}

function getRateLimitMessage(body: unknown): string {
    if (typeof body !== 'object' || body === null) {
        return 'Demasiados intentos. Intenta de nuevo más tarde.'
    }

    const message = (body as RateLimitBody).message

    return typeof message === 'string' && message.trim().length > 0
        ? message
        : 'Demasiados intentos. Intenta de nuevo más tarde.'
}

export async function POST(request: Request) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let timedOut = false

    try {
        let body: unknown

        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ error: 'Revisa los datos ingresados.' }, { status: 400 })
        }

        const parsed = loginSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: 'Revisa los datos ingresados.' }, { status: 400 })
        }

        const controller = new AbortController()
        timeoutId = setTimeout(() => {
            timedOut = true
            controller.abort()
        }, LOGIN_TIMEOUT_MS)

        // El navegador solo llama a este origen; el proxy oculta el backend y copia sus cookies.
        const backendResponse = await fetch(`${AUTH_API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: parsed.data.email,
                password: parsed.data.password,
            }),
            signal: controller.signal,
            cache: 'no-store',
        })

        if (backendResponse.status === 200 || backendResponse.status === 201) {
            const response = NextResponse.json({ success: true }, { status: 200 })

            for (const setCookie of backendResponse.headers.getSetCookie()) {
                response.headers.append('set-cookie', adaptSetCookieForApp(setCookie))
            }

            return response
        }

        if (backendResponse.status === 401) {
            // Un mensaje común evita revelar si el correo existe.
            return NextResponse.json({ error: 'Correo o contraseña inválidos.' }, { status: 401 })
        }

        if (backendResponse.status === 429) {
            let responseBody: unknown = null

            try {
                responseBody = await backendResponse.json()
            } catch {
                // El backend puede responder vacío o con JSON inválido.
            }

            return NextResponse.json({ error: getRateLimitMessage(responseBody) }, { status: 429 })
        }

        if (backendResponse.status >= 500) {
            console.error('Error del backend de autenticación', {
                status: backendResponse.status,
            })

            return NextResponse.json(
                { error: 'No se pudo iniciar sesión. Intenta de nuevo.' },
                { status: 502 },
            )
        }

        return NextResponse.json(
            { error: 'No se pudo iniciar sesión. Intenta de nuevo.' },
            { status: 502 },
        )
    } catch (error: unknown) {
        if (timedOut) {
            return NextResponse.json(
                { error: 'El servidor tardó demasiado. Intenta de nuevo.' },
                { status: 504 },
            )
        }

        return NextResponse.json(
            { error: 'No se pudo conectar con el servidor. Intenta de nuevo.' },
            { status: 503 },
        )
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
    }
}
