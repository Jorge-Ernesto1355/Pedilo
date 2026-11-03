import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }))
vi.mock('@/src/lib/api/client', () => ({ apiClient: api }))

import {
    addComboChoice,
    addIncludedProduct,
    createCombo,
    createComboGroup,
    deleteComboGroup,
    getCombo,
    removeComboChoice,
    removeIncludedProduct,
    updateComboGroup,
} from '@/app/(protected)/create-menu/features/product-management/comboApi'

const credentials = { withCredentials: true }

describe('combo API integration', () => {
    beforeEach(() => {
        Object.values(api).forEach((method) => method.mockReset())
    })

    it('creates the whole combo in one request and unwraps the response', async () => {
        const input = {
            categoryId: 'category-1',
            name: 'Combo hamburguesa',
            description: '',
            price: 199,
            includedProductIds: ['burger-1'],
            optionGroups: [
                {
                    name: 'Acompañamiento',
                    productIds: ['fries', 'wings'],
                },
            ],
        }
        const combo = { id: 'combo-1', name: input.name }
        api.post.mockResolvedValueOnce({ data: { combo } })

        await expect(createCombo(input)).resolves.toEqual(combo)
        expect(api.post).toHaveBeenCalledWith('/businesses/products/combos', { ...input, optionGroups: [{ ...input.optionGroups[0], minSelections: 1, maxSelections: 1 }] }, credentials)
    })

    it('loads combo details and uses the configured group and included-product routes', async () => {
        api.get.mockResolvedValueOnce({ data: { combo: { id: 'combo-1' } } })
        await expect(getCombo('combo-1')).resolves.toEqual({ id: 'combo-1' })

        api.post.mockResolvedValue({ data: {} })
        await addIncludedProduct('combo-1', 'burger-1')
        await createComboGroup('combo-1', {
            name: 'Bebida',
            productIds: ['water'],
        })
        await addComboChoice('combo-1', 'group-1', 'soda')

        expect(api.post).toHaveBeenNthCalledWith(
            1,
            '/businesses/products/combo-1/combo-included-products',
            { productId: 'burger-1' },
            credentials,
        )
        expect(api.post).toHaveBeenNthCalledWith(
            2,
            '/businesses/products/combo-1/combo-option-groups',
            expect.objectContaining({ name: 'Bebida' }),
            credentials,
        )
        expect(api.post).toHaveBeenNthCalledWith(
            3,
            '/businesses/products/combo-1/combo-option-groups/group-1/products',
            { productId: 'soda' },
            credentials,
        )
    })

    it('updates and deletes groups and removes linked products through their exact routes', async () => {
        api.patch.mockResolvedValueOnce({ data: { group: { id: 'group-1' } } })
        await expect(updateComboGroup('combo-1', 'group-1', { name: 'Bebida' })).resolves.toEqual({
            id: 'group-1',
        })
        api.delete.mockResolvedValue({ data: undefined })
        await deleteComboGroup('combo-1', 'group-1')
        await removeComboChoice('combo-1', 'group-1', 'soda')
        await removeIncludedProduct('combo-1', 'included-1')

        expect(api.patch).toHaveBeenCalledWith(
            '/businesses/products/combo-1/combo-option-groups/group-1',
            { name: 'Bebida' },
            credentials,
        )
        expect(api.delete).toHaveBeenNthCalledWith(
            1,
            '/businesses/products/combo-1/combo-option-groups/group-1',
            credentials,
        )
        expect(api.delete).toHaveBeenNthCalledWith(
            2,
            '/businesses/products/combo-1/combo-option-groups/group-1/products/soda',
            credentials,
        )
        expect(api.delete).toHaveBeenNthCalledWith(
            3,
            '/businesses/products/combo-1/combo-included-products/included-1',
            credentials,
        )
    })
})
