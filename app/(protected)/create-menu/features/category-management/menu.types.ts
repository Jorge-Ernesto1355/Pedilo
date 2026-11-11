export type MenuCategory = {
    id: string
    menuId: string
    name: string
    description: string | null
    isActive: boolean
    sortOrder: number
    products: MenuProduct[]
}

export type MenuProduct = {
    id: string
    name: string
    categoryId: string | null
    price?: number | string
    type?: 'PRODUCT' | 'COMBO'
    includedProducts?: Array<{
        id: string
        productId: string
        quantity?: number
        sortOrder: number
        product: {
            id: string
            name: string
            description: string | null
            price: number
            imageUrl: string | null
            categoryId: string
            isAvailable: boolean
        }
    }>
    comboOptionGroups?: Array<{
        id: string
        comboProductId: string
        name: string
        minSelections: number
        maxSelections: number
        sortOrder: number
        products: Array<{
            id: string
            productId: string
            quantity?: number
            sortOrder: number
            product: {
                id: string
                name: string
                description: string | null
                price: number
                imageUrl: string | null
                categoryId: string
                isAvailable: boolean
            }
        }>
    }>
}

export type Menu = {
    id: string
    name: string
    description: string | null
    isActive: boolean
    categories: MenuCategory[]
}

export type MenuCreationCategory = {
    name: string
    description: string
}

export type MenuCreationInput = {
    name: string
    description: string
    categories: MenuCreationCategory[]
}

export type MenuUpdateInput = {
    name: string
    description: string
}

export type CategoryInput = {
    name: string
    description: string
}
