import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type {
    OptionGroup,
    OptionGroupInput,
    OptionGroupUpdateInput,
    OptionInput,
    OptionUpdateInput,
    ProductOption,
} from './option.types'

const credentials = { withCredentials: true }
type Wrapped<T> = { data?: T; optionGroup?: T; optionGroups?: T[]; option?: T; options?: T[] }
type ListWrapped<T> = { data?: T[]; optionGroups?: T[]; options?: T[] }

function unwrap<T>(value: T | Wrapped<T>): T {
    if (typeof value === 'object' && value !== null && 'data' in value && value.data !== undefined)
        return value.data
    if (
        typeof value === 'object' &&
        value !== null &&
        'optionGroup' in value &&
        value.optionGroup !== undefined
    )
        return value.optionGroup
    if (
        typeof value === 'object' &&
        value !== null &&
        'option' in value &&
        value.option !== undefined
    )
        return value.option
    return value as T
}

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        return (await callback()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function getOptionGroups(productId: string): Promise<OptionGroup[]> {
    return request(() =>
        apiClient.get<OptionGroup[] | ListWrapped<OptionGroup>>(
            `/businesses/products/${productId}/option-groups`,
            credentials,
        ),
    ).then((body) => (Array.isArray(body) ? body : (body.optionGroups ?? body.data ?? [])))
}
export async function getOptionGroup(id: string) {
    return request(() =>
        apiClient.get<OptionGroup | Wrapped<OptionGroup>>(
            `/businesses/option-groups/${id}`,
            credentials,
        ),
    ).then(unwrap)
}
export async function createOptionGroup(productId: string, input: OptionGroupInput) {
    return request(() =>
        apiClient.post<OptionGroup | Wrapped<OptionGroup>>(
            `/businesses/products/${productId}/option-groups`,
            input,
            credentials,
        ),
    ).then(unwrap)
}
export async function updateOptionGroup(
    productId: string,
    optionGroupId: string,
    input: OptionGroupUpdateInput,
) {
    return request(() =>
        apiClient.patch<OptionGroup | Wrapped<OptionGroup>>(
            `/businesses/products/${productId}/option-groups/${optionGroupId}`,
            input,
            credentials,
        ),
    ).then(unwrap)
}
export async function updateOptionGroupStatus(id: string, isActive: boolean) {
    return request(() =>
        apiClient.patch<OptionGroup | Wrapped<OptionGroup>>(
            `/businesses/option-groups/${id}/status`,
            { isActive },
            credentials,
        ),
    ).then(unwrap)
}
export async function deleteOptionGroup(id: string) {
    await request(() => apiClient.delete<void>(`/businesses/option-groups/${id}`, credentials))
}
export async function reorderOptionGroups(productId: string, optionGroupIds: string[]) {
    await request(() =>
        apiClient.post<void>(
            `/businesses/products/${productId}/option-groups/reorder`,
            { optionGroupIds },
            credentials,
        ),
    )
}

export async function getOptions(optionGroupId: string): Promise<ProductOption[]> {
    return request(() =>
        apiClient.get<ProductOption[] | ListWrapped<ProductOption>>(
            `/businesses/option-groups/${optionGroupId}/options`,
            credentials,
        ),
    ).then((body) => (Array.isArray(body) ? body : (body.options ?? body.data ?? [])))
}
export async function getOption(id: string) {
    return request(() =>
        apiClient.get<ProductOption | Wrapped<ProductOption>>(
            `/businesses/options/${id}`,
            credentials,
        ),
    ).then(unwrap)
}
export async function createOption(optionGroupId: string, input: OptionInput) {
    return request(() =>
        apiClient.post<ProductOption | Wrapped<ProductOption>>(
            `/businesses/option-groups/${optionGroupId}/options`,
            input,
            credentials,
        ),
    ).then(unwrap)
}
export async function updateOption(id: string, input: OptionUpdateInput) {
    return request(() =>
        apiClient.patch<ProductOption | Wrapped<ProductOption>>(
            `/businesses/options/${id}`,
            input,
            credentials,
        ),
    ).then(unwrap)
}
export async function updateOptionStatus(id: string, isAvailable: boolean) {
    return request(() =>
        apiClient.patch<ProductOption | Wrapped<ProductOption>>(
            `/businesses/options/${id}/status`,
            { isAvailable },
            credentials,
        ),
    ).then(unwrap)
}
export async function deleteOption(id: string) {
    await request(() => apiClient.delete<void>(`/businesses/options/${id}`, credentials))
}
export async function reorderOptions(optionGroupId: string, optionIds: string[]) {
    await request(() =>
        apiClient.post<void>(
            `/businesses/option-groups/${optionGroupId}/options/reorder`,
            { optionIds },
            credentials,
        ),
    )
}
