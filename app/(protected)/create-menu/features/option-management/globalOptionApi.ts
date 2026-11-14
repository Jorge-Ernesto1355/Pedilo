import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { normalizeOptionGroup } from './option.types'
import type { OptionGroup } from './option.types'

export type GlobalOption = { id?: string; name: string; price: number; minSelections: number; maxSelections: number; isAvailable: boolean }
export type GlobalOptionGroup = { id: string; name: string; isRequired: boolean; minSelections: number; maxSelections: number; isActive: boolean; version: number; productsCount: number; productIds: string[]; options: GlobalOption[] }
export type GlobalOptionGroupSummary = Omit<GlobalOptionGroup, 'productIds' | 'options'>
const credentials = { withCredentials: true }
async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try { return (await callback()).data } catch (error) { throw normalizeApiError(error) }
}
type GroupsResponse = { groups?: GlobalOptionGroupSummary[]; data?: { groups?: GlobalOptionGroupSummary[] } }
export async function listGlobalOptionGroups() {
    const response = await request<GroupsResponse | GlobalOptionGroupSummary[]>(() => apiClient.get('/businesses/global-option-groups', credentials))
    if (Array.isArray(response)) return response
    return response.groups ?? response.data?.groups ?? []
}

export async function getGlobalOptionGroupsForProduct(productId: string): Promise<OptionGroup[]> {
    const response = await request<
        | { groups?: GlobalOptionGroup[]; data?: { groups?: GlobalOptionGroup[] } }
        | GlobalOptionGroup[]
    >(() =>
        apiClient.get(
            `/businesses/products/${productId}/global-option-groups`,
            credentials,
        ),
    )
    const groups = Array.isArray(response)
        ? response
        : (response.groups ?? response.data?.groups ?? [])

    return groups.map((group, groupIndex) =>
        normalizeOptionGroup({
            id: group.id,
            productId,
            name: group.name,
            isRequired: group.isRequired,
            minSelections: group.minSelections,
            maxSelections: group.maxSelections,
            isActive: group.isActive,
            sortOrder: groupIndex,
            options: group.options.map((option, optionIndex) => ({
                id: option.id ?? `${group.id}-option-${optionIndex}`,
                optionGroupId: group.id,
                name: option.name,
                price: option.price,
                minSelections: option.minSelections,
                maxSelections: option.maxSelections,
                isAvailable: option.isAvailable,
                sortOrder: optionIndex,
            })),
        }),
    )
}

export async function getGlobalOptionGroup(id: string) { return request(() => apiClient.get<{ group: GlobalOptionGroup }>(`/businesses/global-option-groups/${id}`, credentials)).then((r) => r.group) }
export async function createGlobalOptionGroup(input: Omit<GlobalOptionGroup, 'id' | 'version' | 'productsCount' | 'productIds'>) { return request(() => apiClient.post<{ group: GlobalOptionGroup }>('/businesses/global-option-groups', input, credentials)).then((r) => r.group) }
export async function updateGlobalOptionGroup(id: string, input: Partial<Pick<GlobalOptionGroup, 'name' | 'isRequired' | 'minSelections' | 'maxSelections' | 'isActive'>> & { expectedVersion?: number }) { return request(() => apiClient.patch<{ group: GlobalOptionGroup }>(`/businesses/global-option-groups/${id}`, input, credentials)).then((r) => r.group) }
export async function replaceGlobalGroupOptions(id: string, options: GlobalOption[]) { return request(() => apiClient.put<{ group: GlobalOptionGroup }>(`/businesses/global-option-groups/${id}/options`, { options }, credentials)).then((r) => r.group) }
export async function assignGlobalGroupProducts(id: string, productIds: string[], expectedVersion?: number) { return request(() => apiClient.put<{ group: GlobalOptionGroup }>(`/businesses/global-option-groups/${id}/products`, { productIds, expectedVersion }, credentials)).then((r) => r.group) }
export async function archiveGlobalOptionGroup(id: string) { return request(() => apiClient.delete(`/businesses/global-option-groups/${id}`, credentials)) }
