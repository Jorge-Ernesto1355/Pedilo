import type { PublicOption, PublicOptionGroup, PublicProduct } from './publicCatalog.types'

export type OptionQuantities = Record<string, Record<string, number>>
export type OptionGroupValidationError = { groupId: string; groupName: string; message: string }

export function getGroupMinSelect(group: PublicOptionGroup) {
    return group.minSelect ?? group.minSelections ?? 0
}

export function getGroupMaxSelect(group: PublicOptionGroup) {
    return group.maxSelect ?? group.maxSelections ?? 0
}

export function getOptionMinSelect(option: PublicOption) {
    return option.minSelections ?? 0
}

export function getOptionMaxSelect(option: PublicOption) {
    return option.maxSelections ?? 1
}

export function getSelectedQuantity(groupId: string, selections: OptionQuantities) {
    return Object.values(selections[groupId] ?? {}).reduce(
        (total, quantity) => total + Math.max(0, quantity),
        0,
    )
}

export function hasRequiredOptionGroups(product: PublicProduct) {
    return product.optionGroups.some((group) => group.isRequired)
}

export function hasAvailableOptions(product: PublicProduct) {
    return product.optionGroups.some(
        (group) => group.isActive !== false && group.options.some((option) => option.isAvailable),
    )
}

export function validateOptionGroups(
    optionGroups: PublicOptionGroup[],
    selections: OptionQuantities,
) {
    const errors: OptionGroupValidationError[] = []
    optionGroups.forEach((group) => {
        const selectedQuantity = getSelectedQuantity(group.id, selections)
        if (group.isRequired && selectedQuantity === 0)
            errors.push({
                groupId: group.id,
                groupName: group.name,
                message: 'Selecciona al menos una opción.',
            })
        group.options.forEach((option) => {
            const quantity = selections[group.id]?.[option.id] ?? 0
            const minSelect = getOptionMinSelect(option)
            const maxSelect = getOptionMaxSelect(option)
            if (quantity < minSelect || quantity > maxSelect)
                errors.push({
                    groupId: group.id,
                    groupName: group.name,
                    message: `${option.name}: selecciona entre ${minSelect} y ${maxSelect}.`,
                })
        })
    })
    return { valid: errors.length === 0, errors, firstError: errors[0] }
}

export function canAddProductToCart(product: PublicProduct, selections: OptionQuantities = {}) {
    return validateOptionGroups(product.optionGroups, selections).valid
}
