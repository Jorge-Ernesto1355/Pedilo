import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import type { CategoryInput, Menu, MenuCategory, MenuCreationInput, MenuProduct, MenuUpdateInput } from './menu.types'

const credentials = { withCredentials: true }

type Wrapped<T> = { data?: T; menu?: T; menus?: T[]; category?: T }

function unwrap<T>(response: Wrapped<T> | T): T {
    if (typeof response === 'object' && response !== null && 'data' in response && response.data !== undefined) return response.data
    if (typeof response === 'object' && response !== null && 'menu' in response && response.menu !== undefined) return response.menu
    if (typeof response === 'object' && response !== null && 'category' in response && response.category !== undefined) return response.category
    return response as T
}

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        const response = await callback()
        return response.data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function getMenus(): Promise<Menu[]> {
    return request(async () => apiClient.get<Menu[] | { menus?: Menu[] }>('/businesses/mine/menus', credentials)).then((body) => {
        if (Array.isArray(body)) return body
        return Array.isArray(body.menus) ? body.menus : []
    })
}

export async function getMenu(menuId: string): Promise<Menu> {
    return request(async () => apiClient.get<Menu | Wrapped<Menu>>(`/businesses/menus/${menuId}`, credentials)).then(unwrap)
}

export async function createMenu(businessId: string, input: MenuCreationInput): Promise<Menu> {
    return request(async () => apiClient.post<Menu | Wrapped<Menu>>(`/businesses/${businessId}/menus`, {
        name: input.name,
        description: input.description,
        isActive: true,
        categories: input.categories,
    }, credentials)).then(unwrap)
}

export async function updateMenu(menuId: string, input: MenuUpdateInput): Promise<Menu> {
    return request(async () => apiClient.patch<Menu | Wrapped<Menu>>(`/businesses/menus/${menuId}`, input, credentials)).then(unwrap)
}

export async function updateMenuStatus(menuId: string, isActive: boolean): Promise<Menu> {
    return request(async () => apiClient.patch<Menu | Wrapped<Menu>>(`/businesses/menus/${menuId}/status`, { isActive }, credentials)).then(unwrap)
}

export async function deleteMenu(menuId: string): Promise<void> {
    await request(async () => apiClient.delete<void>(`/businesses/menus/${menuId}`, credentials))
}

export async function createCategory(businessId: string, menuId: string, input: CategoryInput): Promise<MenuCategory> {
    return request(async () => apiClient.post<MenuCategory | Wrapped<MenuCategory>>(`/businesses/${businessId}/categories`, { menuId, ...input }, credentials)).then(unwrap)
}

export async function updateCategory(categoryId: string, input: CategoryInput): Promise<MenuCategory> {
    return request(async () => apiClient.patch<MenuCategory | Wrapped<MenuCategory>>(`/businesses/categories/${categoryId}`, input, credentials)).then(unwrap)
}

export async function updateCategoryStatus(categoryId: string, isActive: boolean): Promise<MenuCategory> {
    return request(async () => apiClient.patch<MenuCategory | Wrapped<MenuCategory>>(`/businesses/categories/${categoryId}/status`, { isActive }, credentials)).then(unwrap)
}

export async function deleteCategory(categoryId: string): Promise<void> {
    await request(async () => apiClient.delete<void>(`/businesses/categories/${categoryId}`, credentials))
}

export async function moveProductsAndDeleteCategory(categoryId: string, targetCategoryId: string): Promise<void> {
    await request(async () => apiClient.post<void>(`/businesses/categories/${categoryId}/move-products-and-delete`, { targetCategoryId }, credentials))
}

export async function reorderCategories(menuId: string, categoryIds: string[]): Promise<void> {
    await request(async () => apiClient.post<void>(`/businesses/menus/${menuId}/categories/reorder`, { categoryIds }, credentials))
}

export async function moveProductToCategory(productId: string, targetCategoryId: string): Promise<MenuProduct> {
    return request(async () => apiClient.patch<MenuProduct | Wrapped<MenuProduct>>(`/businesses/products/${productId}/category`, { targetCategoryId }, credentials)).then(unwrap)
}
