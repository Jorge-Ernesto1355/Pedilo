import type { OptionGroup } from '../option-management/option.types'

export type Product = {
    id: string
    categoryId: string
    name: string
    description: string | null
    price: number | string
    imageUrl: string | null
    imageBlurUrl?: string | null
    isAvailable: boolean
    active?: boolean
    sortOrder: number
    createdAt?: string
    updatedAt?: string
    categoryName?: string | null
    optionGroups?: OptionGroup[]
}

export type ProductInput = {
    name: string
    description: string
    price: string
    image?: File | null
    categoryId?: string
    active?: boolean
}

export type ProductUpdateInput = ProductInput & {
    sortOrder?: number
}
