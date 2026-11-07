import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { Product } from './product.types'

export type ComboGroupInput = {
    name: string
    productIds: string[]
}

export type ComboOptionGroup = ComboGroupInput & {
    id: string
    comboProductId: string
    businessId: string
    minSelections: number
    maxSelections: number
    sortOrder: number
    createdAt: string
    updatedAt: string
    products: Array<{
        id: string
        productId: string
        sortOrder: number
        product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl' | 'categoryId' | 'isAvailable'>
    }>
}

export type ComboIncludedProduct = {
    id: string
    productId: string
    sortOrder: number
    quantity?: number
    product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl' | 'categoryId' | 'isAvailable'>
}

export type ComboDetails = Omit<Product, 'optionGroups'> & {
    businessId: string
    description: string | null
    category: { id: string; name: string; menuId: string }
    optionGroups: ComboOptionGroup[]
    includedProducts: ComboIncludedProduct[]
}

export type CreateComboInput = {
    categoryId: string
    name: string
    description: string
    price: number
    imageUrl?: string
    imageFile?: File
    includedProductIds?: string[]
    includedProducts?: Array<{ productId: string; quantity: number }>
    optionGroups: ComboGroupInput[]
}

export type UpdateComboDetailsInput = {
    name: string
    description: string
    price: number
    imageFile?: File
}

const credentials = { withCredentials: true }

type Envelope<T> = { combo?: T; product?: T; group?: T; option?: T; includedProduct?: T; data?: T }

function unwrap<T>(value: T | Envelope<T>): T {
    if (typeof value === 'object' && value !== null && 'data' in value && value.data)
        return value.data
    if (typeof value === 'object' && value !== null && 'combo' in value && value.combo)
        return value.combo
    if (typeof value === 'object' && value !== null && 'product' in value && value.product)
        return value.product
    if (typeof value === 'object' && value !== null && 'group' in value && value.group)
        return value.group
    if (typeof value === 'object' && value !== null && 'option' in value && value.option)
        return value.option
    if (
        typeof value === 'object' &&
        value !== null &&
        'includedProduct' in value &&
        value.includedProduct
    )
        return value.includedProduct
    return value as T
}

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        return (await callback()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function createCombo(input: CreateComboInput): Promise<ComboDetails> {
    const payload = {
        ...input,
        optionGroups: input.optionGroups.map((group) => ({
            ...group,
            minSelections: 1,
            maxSelections: 1,
        })),
    }
    if (!input.imageFile) {
        return request(() =>
            apiClient.post<ComboDetails | Envelope<ComboDetails>>(
                '/businesses/products/combos',
                payload,
                credentials,
            ),
        ).then(unwrap)
    }
    const form = new FormData()
    form.append('categoryId', input.categoryId)
    form.append('name', input.name)
    form.append('description', input.description)
    form.append('price', String(input.price))
    form.append('includedProducts', JSON.stringify(input.includedProducts ?? []))
    form.append('optionGroups', JSON.stringify(payload.optionGroups))
    form.append('image', input.imageFile)
    return request(() =>
        apiClient.post<ComboDetails | Envelope<ComboDetails>>('/businesses/products/combos', form, credentials),
    ).then(unwrap)
}

export async function getCombo(productId: string): Promise<ComboDetails> {
    return request(() =>
        apiClient.get<ComboDetails | Envelope<ComboDetails>>(
            `/businesses/products/${productId}/combo-option-groups`,
            credentials,
        ),
    ).then(unwrap)
}

export async function updateComboDetails(
    productId: string,
    input: UpdateComboDetailsInput,
): Promise<Product> {
    if (!input.imageFile) {
        return request(() =>
            apiClient.patch<Product | Envelope<Product>>(
                `/businesses/products/${productId}`,
                input,
                credentials,
            ),
        ).then(unwrap)
    }
    const form = new FormData()
    form.append('name', input.name)
    form.append('description', input.description)
    form.append('price', String(input.price))
    form.append('image', input.imageFile)
    return request(() =>
        apiClient.patch<Product | Envelope<Product>>(`/businesses/products/${productId}`, form, credentials),
    ).then(unwrap)
}

export async function addIncludedProduct(productId: string, includedProductId: string) {
    return request(() =>
        apiClient.post<ComboIncludedProduct | Envelope<ComboIncludedProduct>>(
            `/businesses/products/${productId}/combo-included-products`,
            { productId: includedProductId },
            credentials,
        ),
    ).then(unwrap)
}

export async function removeIncludedProduct(productId: string, includedId: string) {
    return request(() =>
        apiClient.delete<void>(
            `/businesses/products/${productId}/combo-included-products/${includedId}`,
            credentials,
        ),
    )
}

export async function updateIncludedProductQuantity(
    productId: string,
    includedId: string,
    quantity: number,
) {
    return request(() =>
        apiClient.patch<ComboIncludedProduct | Envelope<ComboIncludedProduct>>(
            `/businesses/products/${productId}/combo-included-products/${includedId}`,
            { quantity },
            credentials,
        ),
    ).then(unwrap)
}

export async function createComboGroup(productId: string, input: ComboGroupInput) {
    return request(() =>
        apiClient.post<ComboOptionGroup | Envelope<ComboOptionGroup>>(
            `/businesses/products/${productId}/combo-option-groups`,
            { ...input, minSelections: 1, maxSelections: 1 },
            credentials,
        ),
    ).then(unwrap)
}

export async function updateComboGroup(
    productId: string,
    groupId: string,
    input: Partial<ComboGroupInput>,
) {
    return request(() =>
        apiClient.patch<ComboOptionGroup | Envelope<ComboOptionGroup>>(
            `/businesses/products/${productId}/combo-option-groups/${groupId}`,
            input,
            credentials,
        ),
    ).then(unwrap)
}

export async function deleteComboGroup(productId: string, groupId: string) {
    return request(() =>
        apiClient.delete<void>(
            `/businesses/products/${productId}/combo-option-groups/${groupId}`,
            credentials,
        ),
    )
}

export async function addComboChoice(productId: string, groupId: string, choiceProductId: string) {
    return request(() =>
        apiClient.post<
            ComboOptionGroup['products'][number] | Envelope<ComboOptionGroup['products'][number]>
        >(
            `/businesses/products/${productId}/combo-option-groups/${groupId}/products`,
            { productId: choiceProductId },
            credentials,
        ),
    ).then(unwrap)
}

export async function removeComboChoice(
    productId: string,
    groupId: string,
    choiceProductId: string,
) {
    return request(() =>
        apiClient.delete<void>(
            `/businesses/products/${productId}/combo-option-groups/${groupId}/products/${choiceProductId}`,
            credentials,
        ),
    )
}
