import type { OptionGroup } from '../option-management/option.types'

export type Product = {
    id: string
    categoryId: string
    name: string
    description: string | null
    price: number | string
    imageUrl: string | null
    isAvailable: boolean
    sortOrder: number
    createdAt?: string
    optionGroups?: OptionGroup[]
}

export type ProductInput = {
    name: string
    description: string
    price: string
    imageUrl: string
}

export type ProductUpdateInput = ProductInput & {
    sortOrder?: number
}
