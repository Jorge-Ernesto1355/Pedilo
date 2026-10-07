import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BusinessSetupScreen from '@/app/(protected)/create-menu/BusinessSetupScreen'
import { useAuthStore } from '@/store/authStore'

vi.mock('@/src/lib/api/client', () => ({
    apiClient: {
        get: vi.fn(async (path: string) => {
            if (path === '/businesses/mine') {
                return {
                    data: {
                        business: {
                            id: 'business-setup-test-business',
                            name: 'Negocio de prueba',
                            slug: 'negocio-de-prueba',
                            businessSchedule: {
                                days: [
                                    { key: 'monday', label: 'Lun', enabled: true },
                                    { key: 'tuesday', label: 'Mar', enabled: true },
                                    { key: 'wednesday', label: 'Mié', enabled: true },
                                    { key: 'thursday', label: 'Jue', enabled: true },
                                    { key: 'friday', label: 'Vie', enabled: true },
                                    { key: 'saturday', label: 'Sáb', enabled: true },
                                    { key: 'sunday', label: 'Dom', enabled: false },
                                ],
                                openTime: '09:00',
                                closeTime: '19:00',
                            },
                        },
                    },
                }
            }
            if (path === '/businesses/mine/menus') {
                return { data: [testMenu] }
            }
            if (path === '/businesses/menus/business-setup-test-menu') {
                return { data: testMenu }
            }
            return { data: [] }
        }),
        post: vi.fn(),
        patch: vi.fn(),
    },
}))

const testMenu = {
    id: 'business-setup-test-menu',
    name: 'Menú de prueba',
    description: null,
    isActive: true,
    categories: [
        {
            id: 'business-setup-test-category',
            menuId: 'business-setup-test-menu',
            name: 'Platillos',
            description: null,
            isActive: true,
            sortOrder: 0,
            products: [],
        },
    ],
}

beforeEach(() => {
    useAuthStore.setState({
        user: {
            id: 'business-setup-test-user',
            businessId: 'business-setup-test-business',
            name: 'Test',
            email: 'test@example.test',
        },
    })
})

async function renderSetup() {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const result = render(
        <QueryClientProvider client={queryClient}>
            <BusinessSetupScreen />
        </QueryClientProvider>,
    )
    await userEvent.setup().click(await screen.findByRole('button', { name: /Menú de prueba/ }))
    await screen.findByRole('button', { name: /agregar producto/i })
    return result
}

describe('Business Setup product editor', () => {
    it('keeps option and extra inputs editable while preserving their values', async () => {
        const user = userEvent.setup()
        await renderSetup()

        await user.click(screen.getByRole('button', { name: /agregar producto/i }))
        await screen.findByRole('dialog', { name: 'Agregar producto' })

        await user.click(screen.getByRole('button', { name: 'Agregar opción' }))
        const option = screen.getByRole('textbox', { name: 'Ej. Papas gajo 1' })
        await user.type(option, 'Papas gajo')
        expect(option).toHaveValue('Papas gajo')

        await user.click(screen.getByRole('button', { name: 'Agregar extra' }))
        const extra = screen.getByRole('textbox', { name: 'Ej. Queso extra 1' })
        await user.type(extra, 'Queso extra')
        expect(extra).toHaveValue('Queso extra')

        expect(screen.getByRole('textbox', { name: 'Ej. Papas gajo 1' })).toHaveValue('Papas gajo')
    })

    it('requires a positive base price before saving a product', async () => {
        const user = userEvent.setup()
        await renderSetup()

        await user.click(screen.getByRole('button', { name: /agregar producto/i }))
        await screen.findByRole('dialog', { name: 'Agregar producto' })
        await user.type(screen.getByLabelText('Nombre del plato'), 'Clásica')
        await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

        expect(screen.getByRole('alert')).toHaveTextContent('Escribe el precio base.')
    })

    it('keeps at least one business day selected', async () => {
        const user = userEvent.setup()
        await renderSetup()

        const days = screen.getAllByRole('checkbox')
        for (const day of days.slice(2, 6)) await user.click(day)

        await user.click(days[0])
        expect(days[0]).toHaveAttribute('aria-checked', 'false')
        expect(screen.queryByText('Selecciona al menos un día.')).not.toBeInTheDocument()

        await user.click(days[1])

        expect(days[1]).toHaveAttribute('aria-checked', 'true')
        expect(screen.getByRole('alert')).toHaveTextContent('Selecciona al menos un día.')
    })
})
