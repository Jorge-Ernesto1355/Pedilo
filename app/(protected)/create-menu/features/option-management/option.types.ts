export type ProductOption = {
    id: string
    optionGroupId: string
    name: string
    price: number | string
    minSelections: number
    maxSelections: number
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
    isActive: boolean
    options: Array<{
        name: string
        price: number
        minSelections: number
        maxSelections: number
        isAvailable: boolean
    }>
}

export type OptionGroupUpdateInput = Omit<OptionGroupInput, 'options' | 'isActive'>
export type OptionInput = {
    name: string
    price: number
    minSelections: number
    maxSelections: number
    isAvailable: boolean
}
export type OptionUpdateInput = Omit<OptionInput, 'isAvailable'>

function normalizeSelectionLimit(value: unknown, fallback: number) {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function normalizeProductOption(option: ProductOption): ProductOption {
    return {
        ...option,
        minSelections: normalizeSelectionLimit(option.minSelections, 0),
        maxSelections: normalizeSelectionLimit(option.maxSelections, 1),
    }
}

export function normalizeOptionGroup(group: OptionGroup): OptionGroup {
    return {
        ...group,
        minSelections: normalizeSelectionLimit(group.minSelections, 0),
        maxSelections: normalizeSelectionLimit(group.maxSelections, 1),
        options: group.options?.map(normalizeProductOption),
    }
}
