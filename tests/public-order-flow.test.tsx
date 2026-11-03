import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PublicMenuPage from '@/app/menu/[slug]/PublicMenuPage'

const createPublicOrder = vi.hoisted(() => vi.fn())
const getCheckoutCustomerDiscount = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/orderApi', () => ({ createPublicOrder }))
vi.mock('@/src/lib/api/customerDiscountApi', () => ({ getCheckoutCustomerDiscount }))
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
    function renderMenu() {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        return render(
            <QueryClientProvider client={client}>
                <PublicMenuPage slug="la-esquina" />
            </QueryClientProvider>,
        )
    }

    it('creates the order before opening WhatsApp and showing success', async () => {
        const user = userEvent.setup()
        const location = { href: '' }
        const open = vi.spyOn(window, 'open').mockImplementation(
            () =>
                ({
                    closed: false,
                    opener: null,
                    close: vi.fn(),
                    location,
                    document: { title: '', body: { innerHTML: '' } },
                }) as unknown as Window,
        )
        createPublicOrder.mockResolvedValue({
            id: 'order-1',
            subtotal: 129,
            discountAmount: 0,
            total: 129,
        })
        getCheckoutCustomerDiscount.mockResolvedValue(null)
        renderMenu()

        await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
        await user.click(screen.getByRole('button', { name: /ver mi pedido/i }))
        await user.type(screen.getByLabelText('¿A nombre de quién va?'), 'Jorge')
        await user.type(screen.getByLabelText('Teléfono'), '6681234567')
        await user.click(screen.getByRole('radio', { name: 'Para llevar / recoger' }))
        await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

        await waitFor(() =>
            expect(createPublicOrder).toHaveBeenCalledWith('business-1', {
                customer: { name: 'Jorge', phone: '6681234567' },
                fulfillmentType: 'PICKUP',
                items: [{ productId: 'product-1', quantity: 1, optionIds: [] }],
            }),
        )
        expect(open).toHaveBeenCalledWith('about:blank', '_blank')
        expect(location.href).toContain('https://wa.me/526681234567?text=')
        const whatsappMessage = decodeURIComponent(location.href.split('?text=')[1] ?? '')
        expect(whatsappMessage).toContain('Modalidad: Para llevar / recoger')
        expect(
            await screen.findByRole('heading', { name: '¡Tu pedido está listo!' }),
        ).toBeInTheDocument()

        open.mockRestore()
    })

    it('previews a personal discount and uses the server total in the WhatsApp message', async () => {
        const user = userEvent.setup()
        const location = { href: '' }
        const open = vi.spyOn(window, 'open').mockImplementation(
            () =>
                ({
                    closed: false,
                    opener: null,
                    close: vi.fn(),
                    location,
                    document: { title: '', body: { innerHTML: '' } },
                }) as unknown as Window,
        )
        getCheckoutCustomerDiscount.mockResolvedValue({
            id: 'discount-1',
            type: 'PERCENTAGE',
            value: 10,
            status: 'AVAILABLE',
            expiresAt: '2026-11-30T00:00:00.000Z',
            createdAt: '2026-10-31T00:00:00.000Z',
            usedAt: null,
        })
        createPublicOrder.mockResolvedValue({
            id: 'order-2',
            subtotal: 129,
            discountAmount: 12.9,
            total: 116.1,
        })
        renderMenu()

        await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
        await user.click(screen.getByRole('button', { name: /ver mi pedido/i }))
        await user.type(screen.getByLabelText('¿A nombre de quién va?'), 'Jorge')
        await user.type(screen.getByLabelText('Teléfono'), '6681234567')

        expect(await screen.findByText('¡Tienes un descuento!')).toBeInTheDocument()
        expect(screen.getByText('−$12.90')).toBeInTheDocument()
        const submit = screen.getByRole('button', { name: /confirmar pedido/i })
        expect(submit).toHaveTextContent('$116.10')
        await user.click(submit)

        await waitFor(() => expect(createPublicOrder).toHaveBeenCalled())
        const message = decodeURIComponent(location.href.split('?text=')[1] ?? '')
        expect(message).toContain('Descuento personal: −$12.90')
        expect(message).toContain('Total: $116.10')
        open.mockRestore()
    })

    it('does not show success when order creation fails', async () => {
        const user = userEvent.setup()
        const open = vi.spyOn(window, 'open').mockImplementation(() => null)
        createPublicOrder.mockRejectedValue(new Error('backend unavailable'))
        getCheckoutCustomerDiscount.mockResolvedValue(null)
        renderMenu()

        await user.click(screen.getByRole('button', { name: /agregar al carrito/i }))
        await user.click(screen.getByRole('button', { name: /ver mi pedido/i }))
        await user.type(screen.getByLabelText('¿A nombre de quién va?'), 'Jorge')
        await user.type(screen.getByLabelText('Teléfono'), '6681234567')
        await user.click(screen.getByRole('button', { name: /confirmar pedido/i }))

        expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos crear tu pedido/i)
        expect(
            screen.queryByRole('heading', { name: '¡Tu pedido está listo!' }),
        ).not.toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /cerrar pedido/i }))
        open.mockRestore()
    })
})
