import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import type { Product, ProductInput, ProductUpdateInput } from './product.types'

const credentials = { withCredentials: true }
type Wrapped<T> = { data?: T; product?: T; products?: T[] }

function unwrap<T>(value: T | Wrapped<T>): T {
    if (typeof value === 'object' && value !== null && 'data' in value && value.data !== undefined) return value.data
    if (typeof value === 'object' && value !== null && 'product' in value && value.product !== undefined) return value.product
    return value as T
}

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        return (await callback()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
    return request(async () => apiClient.get<Product[] | { products?: Product[] }>(`/businesses/categories/${categoryId}/products`, credentials)).then((body) => Array.isArray(body) ? body : body.products ?? [])
}

export async function getProducts(): Promise<Product[]> {
    return request(async () => apiClient.get<Product[] | { products?: Product[] }>('/businesses/mine/products', credentials)).then((body) => Array.isArray(body) ? body : body.products ?? [])
}

export async function getProduct(productId: string): Promise<Product> {
    return request(async () => apiClient.get<Product | Wrapped<Product>>(`/businesses/products/${productId}`, credentials)).then(unwrap)
}

export async function createProduct(businessId: string, categoryId: string, input: ProductInput): Promise<Product> {
    return request(async () => apiClient.post<Product | Wrapped<Product>>(`/businesses/${businessId}/products`, { ...input, price: Number(input.price), categoryId }, credentials)).then(unwrap)
}

export async function updateProduct(productId: string, input: ProductUpdateInput): Promise<Product> {
    return request(async () => apiClient.patch<Product | Wrapped<Product>>(`/businesses/products/${productId}`, { ...input, price: Number(input.price) }, credentials)).then(unwrap)
}

export async function updateProductStatus(productId: string, isAvailable: boolean): Promise<Product> {
    return request(async () => apiClient.patch<Product | Wrapped<Product>>(`/businesses/products/${productId}/status`, { isAvailable }, credentials)).then(unwrap)
}

export async function deleteProduct(productId: string): Promise<void> {
    await request(async () => apiClient.delete<void>(`/businesses/products/${productId}`, credentials))
}

export async function moveProductToCategory(productId: string, targetCategoryId: string): Promise<Product> {
    return request(async () => apiClient.patch<Product | Wrapped<Product>>(`/businesses/products/${productId}/category`, { targetCategoryId }, credentials)).then(unwrap)
}

export async function reorderProducts(categoryId: string, productIds: string[]): Promise<void> {
    await request(async () => apiClient.post<void>(`/businesses/categories/${categoryId}/products/reorder`, { productIds }, credentials))
}
