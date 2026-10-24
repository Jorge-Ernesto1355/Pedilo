import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProductCard } from '@/app/menu/[slug]/features/public-menu/ProductCard'
import { ProductCustomizeDialog } from '@/app/menu/[slug]/features/public-menu/ProductCustomizeDialog'
import { useOrderCart } from '@/app/menu/[slug]/features/public-menu/useOrderCart'
import type { PublicProduct } from '@/app/menu/[slug]/features/public-menu/publicCatalog.types'

function product(overrides: Partial<PublicProduct> = {}): PublicProduct {
    return {
        id: 'product-1',
        businessId: 'business-1',
        categoryId: 'category-1',
        name: 'Taco especial',
        description: null,
        price: 100,
        imageUrl: null,
        sortOrder: 0,
        isAvailable: true,
        optionGroups: [
            {
                id: 'group-1',
                productId: 'product-1',
                name: 'Extras',
                isRequired: false,
                minSelections: 0,
                maxSelections: 2,
                sortOrder: 0,
                isActive: true,
                options: [
                    {
                        id: 'option-1',
                        optionGroupId: 'group-1',
                        name: 'Aguacate',
                        price: 25,
                        sortOrder: 0,
                        isAvailable: true,
                    },
                ],
            },
        ],
        ...overrides,
    }
}

describe('public menu product options', () => {
    it('opens the selector for optional options instead of adding silently', () => {
        const onSelect = vi.fn()
        const onAdd = vi.fn()
        render(<ProductCard product={product()} onSelect={onSelect} onAdd={onAdd} />)

        expect(screen.getByText('Personalizable')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /seleccionar opciones/i }))

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onAdd).not.toHaveBeenCalled()
    })

    it('allows an optional product to continue without selecting extras', () => {
        const onAdd = vi.fn()
        render(<ProductCustomizeDialog product={product()} onClose={vi.fn()} onAdd={onAdd} />)

        expect(screen.getByRole('button', { name: /agregar al pedido/i })).not.toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: /agregar al pedido/i }))

        expect(onAdd).toHaveBeenCalledWith([])
    })

    it('requires the minimum selection for mandatory groups', () => {
        const requiredProduct = product({
            optionGroups: [
                {
                    ...product().optionGroups[0]!,
                    isRequired: true,
                    minSelections: 1,
                },
            ],
        })
        render(
            <ProductCustomizeDialog product={requiredProduct} onClose={vi.fn()} onAdd={vi.fn()} />,
        )

        expect(screen.getByRole('button', { name: /agregar al pedido/i })).toBeDisabled()
    })

    it('edits selections without duplicating the line and recalculates its price', () => {
        const { result } = renderHook(() => useOrderCart())
        act(() => {
            result.current.add(product(), [
                { id: 'option-1', name: 'Extras: Aguacate', price: 25, quantity: 1 },
            ])
        })
        const key = result.current.lines[0]!.key

        act(() => {
            result.current.edit(key, [])
        })

        expect(result.current.lines).toHaveLength(1)
        expect(result.current.lines[0]).toMatchObject({
            selections: [],
            unitPrice: 100,
            quantity: 1,
        })
        expect(result.current.total).toBe(100)
    })
})
