import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import type { Product, ProductInput, ProductUpdateInput } from './product.types'

const credentials = { withCredentials: true }
type Wrapped<T> = { data?: T; product?: T; products?: T[] }
type ProductRankingPayload = {
    id?: string
    productId?: string
    product?: { id?: string; name?: string }
    name?: string
    productName?: string
    soldQuantity?: number
    quantitySold?: number
    totalSold?: number
    quantity?: number
    orderCount?: number
    ordersCount?: number
    totalOrders?: number
    orders?: number
    requestedQuantity?: number
    quantityRequested?: number
    totalRequested?: number
    requestCount?: number
    revenue?: number
}
type RankingEnvelope = {
    products?: ProductRankingPayload[]
    rankings?: ProductRankingPayload[]
    bestSellingProducts?: ProductRankingPayload[]
    mostRequestedProducts?: ProductRankingPayload[]
    data?: ProductRankingPayload[]
}

export type ProductListParams = {
    categoryId?: string
    active?: boolean
    isAvailable?: boolean
    search?: string
    from?: string
    to?: string
    createdFrom?: string
    createdTo?: string
    updatedFrom?: string
    updatedTo?: string
    page: number
    limit: number
    sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt' | 'sortOrder'
    sortOrder?: 'asc' | 'desc'
}

export type ProductListResponse = {
    products: Product[]
    page: number
    limit: number
    total: number
}
export type ProductStats = {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    uncategorizedProducts: number
    categoriesWithProducts: number
}
export type ProductRanking = {
    productId: string
    productName: string
    soldQuantity?: number
    orderCount: number
    requestedQuantity?: number
    revenue?: number
}
export type ProductAnalyticsParams = {
    from?: string
    to?: string
    categoryId?: string
    limit?: number
}
export type ProductSummary = ProductStats & {
    topSellingProducts: ProductRanking[]
    mostRequestedProducts: ProductRanking[]
}
type ProductSummaryEnvelope = Partial<ProductStats> & {
    stats?: ProductStats
    topSellingProducts?: ProductRanking[]
    mostRequestedProducts?: ProductRanking[]
    bestSelling?: ProductRanking[]
    mostRequested?: ProductRanking[]
}

function searchParams(params: Record<string, string | number | boolean | undefined>) {
    const value = new URLSearchParams()
    Object.entries(params).forEach(([key, item]) => {
        if (item !== undefined && item !== '' && item !== 'all') value.set(key, String(item))
    })
    return value.toString()
}

function normalizeRankings(rows: ProductRankingPayload[]): ProductRanking[] {
    return rows.map((row) => ({
        productId:
            row.productId ??
            row.product?.id ??
            row.id ??
            row.productName ??
            row.name ??
            'unknown-product',
        productName: row.productName ?? row.product?.name ?? row.name ?? 'Producto sin nombre',
        soldQuantity: row.soldQuantity ?? row.quantitySold ?? row.totalSold ?? row.quantity ?? 0,
        orderCount: row.orderCount ?? row.ordersCount ?? row.totalOrders ?? row.orders ?? 0,
        requestedQuantity:
            row.requestedQuantity ??
            row.quantityRequested ??
            row.totalRequested ??
            row.requestCount ??
            row.quantity ??
            0,
        revenue: row.revenue ?? 0,
    }))
}

function unwrap<T>(value: T | Wrapped<T>): T {
    if (typeof value === 'object' && value !== null && 'data' in value && value.data !== undefined)
        return unwrap(value.data as T | Wrapped<T>)
    if (
        typeof value === 'object' &&
        value !== null &&
        'product' in value &&
        value.product !== undefined
    )
        return value.product
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
    return request(async () =>
        apiClient.get<Product[] | { products?: Product[] }>(
            `/businesses/categories/${categoryId}/products`,
            credentials,
        ),
    ).then((body) => (Array.isArray(body) ? body : (body.products ?? [])))
}

export async function getProducts(): Promise<Product[]> {
    return request(async () =>
        apiClient.get<Product[] | { products?: Product[] }>(
            '/businesses/mine/products',
            credentials,
        ),
    ).then((body) => (Array.isArray(body) ? body : (body.products ?? [])))
}
export async function getProductsPaged(businessId: string, params: ProductListParams) {
    return request(() =>
        apiClient.get<ProductListResponse>(
            `/businesses/${businessId}/products?${searchParams(params)}`,
            credentials,
        ),
    )
}
export async function getProductStats(businessId: string) {
    return request(() =>
        apiClient.get<ProductStats | { stats: ProductStats }>(
            `/businesses/${businessId}/products/stats`,
            credentials,
        ),
    ).then((body) => ('stats' in body ? body.stats : body))
}
export async function getBestSellingProducts(businessId: string, params: ProductAnalyticsParams) {
    return request(() =>
        apiClient.get<ProductRankingPayload[] | RankingEnvelope>(
            `/businesses/${businessId}/products/analytics/best-selling?${searchParams(params)}`,
            credentials,
        ),
    ).then((body) =>
        normalizeRankings(
            Array.isArray(body)
                ? body
                : (body.products ??
                      body.rankings ??
                      body.bestSellingProducts ??
                      body.mostRequestedProducts ??
                      body.data ??
                      []),
        ),
    )
}
export async function getMostRequestedProducts(businessId: string, params: ProductAnalyticsParams) {
    return request(() =>
        apiClient.get<ProductRankingPayload[] | RankingEnvelope>(
            `/businesses/${businessId}/products/analytics/most-requested?${searchParams(params)}`,
            credentials,
        ),
    ).then((body) =>
        normalizeRankings(
            Array.isArray(body)
                ? body
                : (body.products ??
                      body.rankings ??
                      body.bestSellingProducts ??
                      body.mostRequestedProducts ??
                      body.data ??
                      []),
        ),
    )
}
export async function getProductSummary(businessId: string, params: ProductAnalyticsParams) {
    return request(() =>
        apiClient.get<ProductSummaryEnvelope>(
            `/businesses/${businessId}/products/analytics/summary?${searchParams(params)}`,
            credentials,
        ),
    ).then((body) => {
        const source = body.stats ?? body
        return {
            totalProducts: source.totalProducts ?? 0,
            activeProducts: source.activeProducts ?? 0,
            inactiveProducts: source.inactiveProducts ?? 0,
            uncategorizedProducts: source.uncategorizedProducts ?? 0,
            categoriesWithProducts: source.categoriesWithProducts ?? 0,
            topSellingProducts: body.topSellingProducts ?? body.bestSelling ?? [],
            mostRequestedProducts: body.mostRequestedProducts ?? body.mostRequested ?? [],
        }
    })
}

export async function getProduct(productId: string): Promise<Product> {
    return request(async () =>
        apiClient.get<Product | Wrapped<Product>>(`/businesses/products/${productId}`, credentials),
    ).then(unwrap)
}

export async function createProduct(
    businessId: string,
    categoryId: string,
    input: ProductInput,
): Promise<Product> {
    const formData = new FormData()
    formData.append('categoryId', input.categoryId ?? categoryId)
    formData.append('name', input.name)
    formData.append('description', input.description)
    formData.append('price', String(Number(input.price)))
    formData.append('active', String(input.active ?? true))
    if (input.image) formData.append('image', input.image)
    return request(async () =>
        apiClient.post<Product | Wrapped<Product>>(
            `/businesses/${businessId}/products`,
            formData,
            credentials,
        ),
    ).then(unwrap)
}

export async function updateProduct(
    productId: string,
    input: ProductUpdateInput,
): Promise<Product> {
    const formData = new FormData()
    formData.append('name', input.name)
    formData.append('description', input.description)
    formData.append('price', String(Number(input.price)))
    if (input.categoryId) formData.append('categoryId', input.categoryId)
    if (input.active !== undefined) formData.append('active', String(input.active))
    if (input.image) formData.append('image', input.image)
    return request(async () =>
        apiClient.patch<Product | Wrapped<Product>>(
            `/businesses/products/${productId}`,
            formData,
            credentials,
        ),
    ).then(unwrap)
}

export async function updateProductStatus(productId: string, active: boolean): Promise<Product> {
    return request(async () =>
        apiClient.patch<Product | Wrapped<Product>>(
            `/businesses/products/${productId}/status`,
            { active },
            credentials,
        ),
    ).then(unwrap)
}

export async function deleteProduct(productId: string): Promise<void> {
    await request(async () =>
        apiClient.delete<void>(`/businesses/products/${productId}`, credentials),
    )
}

export async function moveProductToCategory(
    productId: string,
    targetCategoryId: string,
): Promise<Product> {
    return request(async () =>
        apiClient.patch<Product | Wrapped<Product>>(
            `/businesses/products/${productId}/category`,
            { targetCategoryId },
            credentials,
        ),
    ).then(unwrap)
}

export async function reorderProducts(categoryId: string, productIds: string[]): Promise<void> {
    await request(async () =>
        apiClient.post<void>(
            `/businesses/categories/${categoryId}/products/reorder`,
            { productIds },
            credentials,
        ),
    )
}
