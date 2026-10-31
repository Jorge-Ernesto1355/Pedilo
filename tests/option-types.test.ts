import { describe, expect, it } from 'vitest'
import { normalizeOptionGroup, normalizeProductOption } from '@/app/(protected)/create-menu/features/option-management/option.types'

describe('option compatibility normalization', () => {
    it('fills limits for options created before individual limits existed', () => {
        const option = normalizeProductOption({
            id: 'legacy-option',
            optionGroupId: 'legacy-group',
            name: 'Aguacate',
            price: 20,
            minSelections: undefined as unknown as number,
            maxSelections: undefined as unknown as number,
            isAvailable: true,
            sortOrder: 0,
        })

        expect(option.minSelections).toBe(0)
        expect(option.maxSelections).toBe(1)
    })

    it('normalizes limits in options nested inside a legacy group', () => {
        const group = normalizeOptionGroup({
            id: 'legacy-group',
            productId: 'product-1',
            name: 'Extras',
            isRequired: true,
            minSelections: undefined as unknown as number,
            maxSelections: undefined as unknown as number,
            isActive: true,
            sortOrder: 0,
            options: [
                {
                    id: 'legacy-option',
                    optionGroupId: 'legacy-group',
                    name: 'Aguacate',
                    price: 20,
                    minSelections: undefined as unknown as number,
                    maxSelections: undefined as unknown as number,
                    isAvailable: true,
                    sortOrder: 0,
                },
            ],
        })

        expect(group.minSelections).toBe(0)
        expect(group.maxSelections).toBe(1)
        expect(group.options?.[0]).toMatchObject({ minSelections: 0, maxSelections: 1 })
    })
})
