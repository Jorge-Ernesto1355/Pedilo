import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PublicMenuPage from '@/app/menu/[slug]/PublicMenuPage'

const createPublicOrder = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/orderApi', () => ({ createPublicOrder }))
vi.mock('@/app/menu/[slug]/features/public-menu/useBusinessMenu', () => ({
    useBusinessMenu: () => ({
        data: {
            business: {
                id: 'business-1',
                name: 'La Esquina',
                slug: 'la-esquina',
                description: null,
                logoUrl: null,
                logoBlurUrl: null,
                coverUrl: null,
                coverBlurUrl: null,
                ubication: null,
                ubicationMaps: null,
                businessSchedule: null,
                whatsappNumber: '6681234567',
            },
            menus: [
                {
                    id: 'menu-1',
                    businessId: 'business-1',
                    name: 'Menú',
                    description: null,
                    isActive: true,
                    categories: [
                        {
                            id: 'category-1',
                            businessId: 'business-1',
                            menuId: 'menu-1',
                            name: 'Hamburguesas',
                            description: null,
                            sortOrder: 0,
                            isActive: true,
                            products: [
                                {
                                    id: 'product-1',
                                    businessId: 'business-1',
                                    categoryId: 'category-1',
                                    name: 'Clásica',
                                    description: 'Con queso',
                                    price: 129,
                                    imageUrl: null,
                                    sortOrder: 0,
                                    isAvailable: true,
                                    optionGroups: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        },
        isLoading: false,
        isError: false,
        error: null,
    }),
}))

describe('public order flow', () => {
    it('creates the order before opening WhatsApp and showing success', async () => {
        const user = userEvent.setup()
        const replace = vi.fn()
        const open = vi.spyOn(window, 'open').mockImplementation(
            () =>
                ({
                    closed: false,
                    opener: null,
                    close: vi.fn(),
                    location: { replace },
                }) as unknown as Window,
        )
        createPublicOrder.mockResolvedValue({ id: 'order-1' })
        render(<PublicMenuPage slug="la-esquina" />)

        await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
        await user.click(screen.getByRole('button', { name: /ver mi pedido/i }))
        await user.type(screen.getByLabelText('¿A nombre de quién va?'), 'Jorge')
        await user.type(screen.getByLabelText('Teléfono'), '6681234567')
        await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

        await waitFor(() =>
            expect(createPublicOrder).toHaveBeenCalledWith('business-1', {
                customer: { name: 'Jorge', phone: '6681234567' },
                items: [{ productId: 'product-1', quantity: 1, optionIds: [] }],
            }),
        )
        expect(open).toHaveBeenCalledWith('about:blank', '_blank')
        expect(replace).toHaveBeenCalledWith(
            expect.stringContaining('https://wa.me/526681234567?text='),
        )
        expect(await screen.findByRole('heading', { name: '¡Pedido enviado!' })).toBeInTheDocument()

        open.mockRestore()
    })

    it('does not show success when order creation fails', async () => {
        const user = userEvent.setup()
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        createPublicOrder.mockRejectedValue(new Error('backend unavailable'))
        render(<PublicMenuPage slug="la-esquina" />)

        await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
        await user.click(screen.getByRole('button', { name: /ver mi pedido/i }))
        await user.type(screen.getByLabelText('¿A nombre de quién va?'), 'Jorge')
        await user.type(screen.getByLabelText('Teléfono'), '6681234567')
        await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

        expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos crear tu pedido/i)
        expect(screen.queryByRole('heading', { name: '¡Pedido enviado!' })).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /cerrar pedido/i }))
        open.mockRestore()
    })
})
