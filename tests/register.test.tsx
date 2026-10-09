import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import RegisterPage from '@/app/auth/register/page'
import { ApiError } from '@/app/auth/lib/client/api-error'

const registerUserMock = vi.hoisted(() => vi.fn())
const routerPushMock = vi.hoisted(() => vi.fn())
const socialSignInMock = vi.hoisted(() => vi.fn())

vi.mock('@/app/auth/lib/client/register', () => ({ registerUser: registerUserMock }))
vi.mock('@/authClient', () => ({
    authClient: { signIn: { social: socialSignInMock } },
}))
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: routerPushMock }),
}))

function renderRegisterPage() {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <RegisterPage />
        </QueryClientProvider>,
    )
}

async function fillValidRegistration(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/nombre completo/i), 'Ana López')
    await user.type(screen.getByLabelText(/correo electrónico/i), ' OWNER@EXAMPLE.COM ')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'correct-horse-7')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'correct-horse-7')
    await user.click(screen.getByRole('checkbox'))
}

describe('Register frontend', () => {
    beforeEach(() => {
        registerUserMock.mockReset()
        routerPushMock.mockReset()
        socialSignInMock.mockReset()
        socialSignInMock.mockResolvedValue(undefined)
    })

    it('starts Google signup with the dashboard callback', async () => {
        const user = userEvent.setup()
        renderRegisterPage()

        await user.click(screen.getByRole('button', { name: /continuar con google/i }))

        expect(socialSignInMock).toHaveBeenCalledWith({
            provider: 'google',
            callbackURL: `${window.location.origin}/dashboard`,
        })
    })

    it('renders accessible fields and submits without password confirmation', async () => {
        const user = userEvent.setup()
        registerUserMock.mockResolvedValue({ success: true })
        renderRegisterPage()
        await fillValidRegistration(user)
        await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

        await waitFor(() => expect(screen.getByText(/cuenta creada/i)).toBeInTheDocument())
        expect(routerPushMock).toHaveBeenCalledWith('/auth/login')
        expect(routerPushMock).not.toHaveBeenCalledWith(expect.stringContaining('dashboard'))
        const request = registerUserMock.mock.calls[0][0]
        expect(request).toEqual({
            name: 'Ana López',
            email: 'owner@example.com',
            password: 'correct-horse-7',
            terms: true,
        })
        expect(request.confirm).toBeUndefined()
    })

    it('reports all invalid required fields and does not submit', async () => {
        const user = userEvent.setup()
        renderRegisterPage()
        await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

        expect(await screen.findByText(/por favor ingresa tu nombre completo/i)).toBeInTheDocument()
        expect(screen.queryByLabelText(/nombre del negocio/i)).not.toBeInTheDocument()
        expect(await screen.findByText(/correo válido/i)).toBeInTheDocument()
        expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument()
        expect(await screen.findByText(/contraseñas no coinciden/i)).toBeInTheDocument()
        expect(await screen.findByText(/debes aceptar los términos/i)).toBeInTheDocument()
        expect(registerUserMock).not.toHaveBeenCalled()
    })

    it('rejects mismatched passwords and unchecked terms', async () => {
        const user = userEvent.setup()
        renderRegisterPage()
        await user.type(screen.getByLabelText(/nombre completo/i), 'Ana López')
        await user.type(screen.getByLabelText(/correo electrónico/i), 'owner@example.com')
        await user.type(screen.getByLabelText(/^contraseña$/i), 'correct-horse-7')
        await user.type(screen.getByLabelText(/confirmar contraseña/i), 'different-password')
        await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

        expect(await screen.findByText(/contraseñas no coinciden/i)).toBeInTheDocument()
        expect(await screen.findByText(/debes aceptar los términos/i)).toBeInTheDocument()
        expect(registerUserMock).not.toHaveBeenCalled()
    })

    it('prevents duplicate submissions while loading', async () => {
        const user = userEvent.setup()
        registerUserMock.mockImplementation(() => new Promise(() => undefined))
        renderRegisterPage()
        await fillValidRegistration(user)
        const submit = screen.getByRole('button', { name: /crear cuenta/i })
        await user.click(submit)
        await user.click(submit)

        expect(registerUserMock).toHaveBeenCalledTimes(1)
        expect(submit).toBeDisabled()
    })

    it.each([
        ['duplicate account', 409, 'Email already exists in database'],
        ['unauthorized', 401, 'token=secret'],
        ['server error', 500, 'Stack trace: password=secret'],
    ])('does not expose %s backend details', async (_label, status, backendError) => {
        const user = userEvent.setup()
        registerUserMock.mockRejectedValue(new ApiError({ status, message: backendError }))
        renderRegisterPage()
        await fillValidRegistration(user)
        await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

        const alert = await screen.findByRole('alert')
        expect(alert.textContent).not.toContain(backendError)
        expect(alert.textContent).not.toMatch(/database|stack trace|token|password/i)
        expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeEnabled()
    })

    it('shows a safe network error and restores the form', async () => {
        const user = userEvent.setup()
        registerUserMock.mockRejectedValue(
            new ApiError({
                message: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
            }),
        )
        renderRegisterPage()
        await fillValidRegistration(user)
        await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

        expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo conectar/i)
        expect(screen.queryByText(/backend timeout/i)).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeEnabled()
    })

    it('exposes password strength feedback without persisting the password', async () => {
        const user = userEvent.setup()
        renderRegisterPage()
        const password = screen.getByLabelText(/^contraseña$/i)
        await user.type(password, 'abc12345')

        expect(screen.getByText(/seguridad de la contraseña/i)).toBeInTheDocument()
        expect(window.localStorage.length).toBe(0)
        expect(window.sessionStorage.length).toBe(0)
        expect(document.body.textContent).not.toContain('abc12345')
    })

    it('provides a keyboard-accessible terms checkbox and login link', () => {
        renderRegisterPage()
        expect(screen.getByRole('checkbox')).not.toBeChecked()
        expect(screen.getAllByRole('link', { name: /iniciar sesión/i }).length).toBeGreaterThan(0)
        expect(screen.getByRole('link', { name: /términos para clientes/i })).toHaveAttribute(
            'href',
            '/terminos',
        )
        expect(screen.getByRole('link', { name: /aviso de privacidad/i })).toHaveAttribute(
            'href',
            '/privacidad',
        )
    })
})
