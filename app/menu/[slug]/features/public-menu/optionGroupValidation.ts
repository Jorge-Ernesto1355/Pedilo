import type { PublicOptionGroup, PublicProduct } from './publicCatalog.types'

export type OptionQuantities = Record<string, Record<string, number>>
export type OptionGroupValidationError = { groupId: string; groupName: string; message: string }

export function getGroupMinSelect(group: PublicOptionGroup) {
    return group.minSelect ?? group.minSelections ?? 0
}

export function getGroupMaxSelect(group: PublicOptionGroup) {
    return group.maxSelect ?? group.maxSelections ?? 0
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

export function validateOptionGroups(
    optionGroups: PublicOptionGroup[],
    selections: OptionQuantities,
) {
    const errors: OptionGroupValidationError[] = []
    optionGroups.forEach((group) => {
        const selectedQuantity = getSelectedQuantity(group.id, selections)
        const minSelect = getGroupMinSelect(group)
        const maxSelect = getGroupMaxSelect(group)
        if (selectedQuantity > maxSelect)
            errors.push({
                groupId: group.id,
                groupName: group.name,
                message: `No puedes seleccionar más de ${maxSelect} opción${maxSelect === 1 ? '' : 'es'}.`,
            })
        if (group.isRequired && selectedQuantity < minSelect)
            errors.push({
                groupId: group.id,
                groupName: group.name,
                message: `Selecciona al menos ${minSelect} opción${minSelect === 1 ? '' : 'es'}.`,
            })
    })
    return { valid: errors.length === 0, errors, firstError: errors[0] }
}

export function canAddProductToCart(product: PublicProduct, selections: OptionQuantities = {}) {
    return validateOptionGroups(product.optionGroups, selections).valid
}
