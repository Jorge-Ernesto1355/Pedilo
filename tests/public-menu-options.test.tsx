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

    function comboProduct(overrides: Partial<PublicProduct> = {}): PublicProduct {
        return product({
            type: 'COMBO',
            optionGroups: [],
            includedProducts: [{
                id: 'included-link', productId: 'burger', sortOrder: 0,
                product: { id: 'burger', name: 'Hamburguesa', description: null, price: 0, imageUrl: null, categoryId: 'category-1', isAvailable: true },
            }],
            comboOptionGroups: [{
                id: 'side-group', comboProductId: 'product-1', name: 'Acompañamiento', minSelections: 1, maxSelections: 1, sortOrder: 0,
                products: ['Papas gajo', 'Alitas'].map((name, index) => ({
                    id: `choice-${index}`, productId: `product-${index}`, sortOrder: index,
                    product: { id: `product-${index}`, name, description: null, price: 0, imageUrl: null, categoryId: 'category-1', isAvailable: true },
                })),
            }],
            ...overrides,
        })
    }

    it('shows products included in the combo', () => {
        render(<ProductCustomizeDialog product={comboProduct()} onClose={vi.fn()} onAdd={vi.fn()} />)

        expect(screen.getByText('Hamburguesa')).toBeInTheDocument()
    })

    it('disables the add button when a required combo group has no selection', () => {
        render(<ProductCustomizeDialog product={comboProduct()} onClose={vi.fn()} onAdd={vi.fn()} />)

        expect(screen.getByRole('button', { name: /agregar al pedido/i })).toBeDisabled()
    })

    it('enables the add button after selecting a valid combo choice', () => {
        render(<ProductCustomizeDialog product={comboProduct()} onClose={vi.fn()} onAdd={vi.fn()} />)

        fireEvent.click(screen.getByRole('radio', { name: 'Papas gajo' }))
        expect(screen.getByRole('button', { name: /agregar al pedido/i })).not.toBeDisabled()
    })

    it('emits the selected combo choice with its group and product identifiers', () => {
        const onAdd = vi.fn()
        render(<ProductCustomizeDialog product={comboProduct()} onClose={vi.fn()} onAdd={onAdd} />)

        fireEvent.click(screen.getByRole('radio', { name: 'Papas gajo' }))
        fireEvent.click(screen.getByRole('button', { name: /agregar al pedido/i }))
        expect(onAdd).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'choice-0',
                productId: 'product-0',
                groupId: 'side-group',
                kind: 'combo-choice',
                name: 'Acompañamiento: Papas gajo',
                quantity: 1,
            }),
        ])
    })

    it('does not render unavailable combo choices', () => {
        const combo = comboProduct({
            comboOptionGroups: [
                {
                    ...comboProduct().comboOptionGroups![0]!,
                    products: comboProduct().comboOptionGroups![0]!.products.map((choice, index) => ({
                        ...choice,
                        product: { ...choice.product, isAvailable: index === 0 },
                    })),
                },
            ],
        })
        render(<ProductCustomizeDialog product={combo} onClose={vi.fn()} onAdd={vi.fn()} />)

        expect(screen.getByRole('radio', { name: 'Papas gajo' })).toBeInTheDocument()
        expect(screen.queryByRole('radio', { name: 'Alitas' })).not.toBeInTheDocument()
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
