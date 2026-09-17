export type ProductOption = {
    id: string
    optionGroupId: string
    name: string
    price: number | string
    isAvailable: boolean
    sortOrder: number
    createdAt?: string
}

export type OptionGroup = {
    id: string
    productId: string
    name: string
    isRequired: boolean
    minSelections: number
    maxSelections: number
    isActive: boolean
    sortOrder: number
    options?: ProductOption[]
}

export type OptionGroupInput = {
    name: string
    isRequired: boolean
    minSelections: number
    maxSelections: number
    isActive: boolean
    options: Array<{ name: string; price: number; isAvailable: boolean }>
}

export type OptionGroupUpdateInput = Omit<OptionGroupInput, 'options' | 'isActive'>
export type OptionInput = { name: string; price: number; isAvailable: boolean }
export type OptionUpdateInput = Omit<OptionInput, 'isAvailable'>
