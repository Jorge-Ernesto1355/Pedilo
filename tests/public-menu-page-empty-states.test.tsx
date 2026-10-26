import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PublicMenuPage from '@/app/menu/[slug]/PublicMenuPage'
import type { PublicCatalog } from '@/app/menu/[slug]/features/public-menu/publicCatalog.types'

const catalogState = vi.hoisted(() => ({ catalog: null as PublicCatalog | null }))

vi.mock('@/src/lib/api/orderApi', () => ({ createPublicOrder: vi.fn() }))
vi.mock('@/app/menu/[slug]/features/public-menu/useBusinessMenu', () => ({
    useBusinessMenu: () => ({
        data: catalogState.catalog,
        isLoading: false,
        isError: false,
        error: null,
    }),
}))

function catalogWithCategories(categories: PublicCatalog['menus'][number]['categories']) {
    return {
        business: {
            id: 'business-empty-state',
            name: 'Cocina de prueba',
            slug: 'cocina-de-prueba',
            description: null,
            logoUrl: null,
            logoBlurUrl: null,
            coverUrl: null,
            coverBlurUrl: null,
            ubication: null,
            ubicationMaps: null,
            businessSchedule: null,
            whatsappNumber: null,
        },
        menus: [
            {
                id: 'menu-empty-state',
                businessId: 'business-empty-state',
                name: 'Menú principal',
                description: null,
                isActive: true,
                categories,
            },
        ],
    } satisfies PublicCatalog
}

describe('public menu page empty states', () => {
    it('shows the menu empty state when there are no active categories', () => {
        catalogState.catalog = catalogWithCategories([])

        render(<PublicMenuPage slug="cocina-de-prueba" />)

        expect(
            screen.getByRole('heading', { name: 'La carta está tomando forma.' }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('navigation', { name: 'Categorías del menú' }),
        ).not.toBeInTheDocument()
    })

    it('shows the category empty state when the category has no products', () => {
        catalogState.catalog = catalogWithCategories([
            {
                id: 'category-empty-state',
                businessId: 'business-empty-state',
                menuId: 'menu-empty-state',
                name: 'Postres',
                description: null,
                sortOrder: 0,
                isActive: true,
                products: [],
            },
        ])

        render(<PublicMenuPage slug="cocina-de-prueba" />)

        expect(
            screen.getByRole('heading', { name: 'Esta sección está entre bastidores.' }),
        ).toBeInTheDocument()
        expect(screen.getByText(/“Postres”/)).toBeInTheDocument()
        expect(screen.getByRole('navigation', { name: 'Categorías del menú' })).toBeInTheDocument()
    })
})
