import { describe, expect, it } from 'vitest'
import { menuFormSchema } from '@/app/(protected)/create-menu/features/category-management/AddCategoryModal'
import { productSchema } from '@/app/(protected)/create-menu/features/product-management/product.schema'

const longDescription = 'x'.repeat(101)

describe('description limits', () => {
    it('rejects menu descriptions longer than 100 characters', () => {
        const result = menuFormSchema.safeParse({
            name: 'Menú principal',
            description: longDescription,
            category: '',
            categoryDescription: '',
        })

        expect(result.success).toBe(false)
    })

    it('rejects category descriptions longer than 100 characters', () => {
        const result = menuFormSchema.safeParse({
            name: 'Menú principal',
            description: '',
            category: 'Entradas',
            categoryDescription: longDescription,
        })

        expect(result.success).toBe(false)
    })

    it('rejects product descriptions longer than 100 characters', () => {
        const result = productSchema.safeParse({
            name: 'Hamburguesa clásica',
            description: longDescription,
            price: '129',
            image: null,
        })

        expect(result.success).toBe(false)
    })

    it('allows descriptions at the 100-character limit', () => {
        const description = 'x'.repeat(100)

        expect(
            menuFormSchema.safeParse({
                name: 'Menú principal',
                description,
                category: 'Entradas',
                categoryDescription: description,
            }).success,
        ).toBe(true)
        expect(
            productSchema.safeParse({
                name: 'Hamburguesa clásica',
                description,
                price: '129',
                image: null,
            }).success,
        ).toBe(true)
    })
})
