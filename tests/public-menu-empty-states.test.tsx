import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CatalogEmptyState } from '@/app/menu/[slug]/features/public-menu/CatalogEmptyState'

describe('public menu empty states', () => {
    it('explains when a menu has no published categories', () => {
        render(<CatalogEmptyState kind="menu" />)

        expect(
            screen.getByRole('heading', { name: 'La carta está tomando forma.' }),
        ).toBeInTheDocument()
        expect(screen.getByText(/todavía no tiene categorías/i)).toBeInTheDocument()
    })

    it('names the category when it has no products', () => {
        render(<CatalogEmptyState kind="category" categoryName="Postres" />)

        expect(
            screen.getByRole('heading', { name: 'Esta sección está entre bastidores.' }),
        ).toBeInTheDocument()
        expect(screen.getByText(/“Postres”/)).toBeInTheDocument()
    })
})
