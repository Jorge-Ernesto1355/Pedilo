'use client'

import { useMemo, useState } from 'react'
import { Package, Plus, RefreshCw } from 'lucide-react'
import { sileo } from 'sileo'
import { ApiError } from '@/app/auth/lib/client/api-error'
import type {
    Product,
    ProductInput,
} from '@/app/(protected)/create-menu/features/product-management/product.types'
import type { ProductListParams } from '@/app/(protected)/create-menu/features/product-management/productApi'
import { useProduct } from './hooks/useProduct'
import { useProductMutations } from './hooks/useProductMutations'
import { useProductAnalytics } from './hooks/useProductAnalytics'
import { useProductCatalog, useProductCategories, useProductStats } from './hooks/useProducts'
import { ProductForm } from './components/ProductForm'
import { ProductDetails } from './components/ProductDetails'
import { ProductFilters } from './components/ProductFilters'
import { ProductPagination, ProductTable } from './components/ProductTable'
import { ProductStatsCards } from './components/ProductStatsCards'
import { ProductAnalytics } from './analytics/ProductAnalytics'
import type { ProductCategoryOption } from '../features/dashboard-products/ProductAdminModal'
import { DashboardErrorState } from '../components/DashboardErrorState'
import { ProductsSkeleton } from '../components/DashboardSkeletons'
import { EmptyState as DashboardEmptyState } from '../components/EmptyState'

type StatusFilter = '' | 'true' | 'false'
type Filters = {
    search: string
    categoryId: string
    active: StatusFilter
    createdFrom: string
    createdTo: string
    updatedFrom: string
    updatedTo: string
    sortBy: NonNullable<ProductListParams['sortBy']>
    sortOrder: 'asc' | 'desc'
}

export default function ProductsPage() {
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState<Filters>({
        search: '',
        categoryId: 'all',
        active: '',
        createdFrom: '',
        createdTo: '',
        updatedFrom: '',
        updatedTo: '',
        sortBy: 'createdAt',
        sortOrder: 'desc',
    })
    const [analyticsFilters, setAnalyticsFilters] = useState({
        category: 'all',
        from: '',
        to: '',
        limit: 5,
    })
    const [editor, setEditor] = useState<'create' | 'edit' | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [formError, setFormError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const params: ProductListParams = {
        page,
        limit: 10,
        search: filters.search || undefined,
        categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId,
        active: filters.active === '' ? undefined : filters.active === 'true',
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
        updatedFrom: filters.updatedFrom || undefined,
        updatedTo: filters.updatedTo || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
    }
    const analyticsParams = {
        from: analyticsFilters.from || undefined,
        to: analyticsFilters.to || undefined,
        categoryId: analyticsFilters.category === 'all' ? undefined : analyticsFilters.category,
        limit: analyticsFilters.limit,
    }
    const catalog = useProductCatalog(params),
        stats = useProductStats(),
        analytics = useProductAnalytics(analyticsParams),
        categoriesQuery = useProductCategories(),
        management = useProductMutations(),
        detail = useProduct(selectedProduct?.id ?? null)
    const categories = useMemo<ProductCategoryOption[]>(
        () =>
            categoriesQuery.data?.flatMap((menu) =>
                menu.categories.map((category) => ({
                    id: category.id,
                    name: category.name,
                    label: `${menu.name} · ${category.name}`,
                })),
            ) ?? [],
        [categoriesQuery.data],
    )
    const categoryNames = useMemo(
        () => new Map(categories.map((category) => [category.id, category.name])),
        [categories],
    )
    const totalPages = Math.max(
        1,
        Math.ceil((catalog.data?.total ?? 0) / (catalog.data?.limit ?? 10)),
    )
    const initialLoading =
        catalog.isLoading ||
        stats.isLoading ||
        analytics.bestSelling.isLoading ||
        analytics.mostRequested.isLoading ||
        analytics.summary.isLoading ||
        categoriesQuery.isLoading
    const patchFilters = (patch: Partial<Filters>) => {
        setFilters((current) => ({ ...current, ...patch }))
        setPage(1)
    }
    const clearFormErrors = () => {
        setFormError('')
        setFieldErrors({})
    }
    const mutationError = (error: unknown) => {
        const apiError = error instanceof ApiError ? error : undefined
        if (apiError?.code === 'PRODUCT_HAS_ORDERS')
            return 'Este producto tiene historial de pedidos y no puede eliminarse. Desactívalo en lugar de eliminarlo.'
        if (apiError?.code === 'BUSINESS_ACCESS_DENIED') return 'No tienes acceso a este negocio.'
        return apiError?.message ?? 'No pudimos completar la operación. Inténtalo de nuevo.'
    }
    const saveProduct = (input: ProductInput) => {
        if (management.createProduct.isPending || management.updateProduct.isPending) return
        clearFormErrors()
        if (!input.categoryId) return
        const onError = (error: unknown) => {
            const apiError = error instanceof ApiError ? error : undefined
            if (apiError?.code === 'VALIDATION_ERROR')
                setFieldErrors(
                    Object.fromEntries(
                        Object.entries(apiError.fieldErrors).map(([key, messages]) => [
                            key,
                            messages[0] ?? 'Campo inválido.',
                        ]),
                    ),
                )
            setFormError(mutationError(error))
        }
        if (editor === 'edit' && selectedProduct)
            management.updateProduct.mutate(
                { productId: selectedProduct.id, input },
                {
                    onSuccess: () => {
                        setEditor(null)
                        setSelectedProduct(null)
                    },
                    onError,
                },
            )
        else
            management.createProduct.mutate(
                { categoryId: input.categoryId, input },
                {
                    onSuccess: (product) => {
                        setSelectedProduct(product)
                        setEditor('edit')
                    },
                    onError,
                },
            )
    }
    const deleteProduct = (product: Product) => {
        if (management.deleteProduct.isPending) return
        if (!window.confirm(`¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`))
            return
        management.deleteProduct.mutate(product.id, {
            onSuccess: () => {
                if ((catalog.data?.products.length ?? 1) === 1 && page > 1)
                    setPage((current) => current - 1)
            },
            onError: (error) => sileo.error({ title: mutationError(error) }),
        })
    }
    const toggleProduct = (product: Product) => {
        if (management.updateProductStatus.isPending) return
        management.updateProductStatus.mutate(
            { productId: product.id, active: !(product.active ?? product.isAvailable) },
            { onError: (error) => sileo.error({ title: mutationError(error) }) },
        )
    }
    const openCreate = () => {
        clearFormErrors()
        setSelectedProduct(null)
        setEditor('create')
    }
    const closeEditor = () => {
        clearFormErrors()
        setEditor(null)
        setSelectedProduct(null)
    }

    if (initialLoading && !catalog.data) return <ProductsSkeleton />

    return (
        <main className="mx-auto max-w-[1440px] space-y-7 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-medium text-[#65738A]">
                        Administra tu catálogo y entiende qué se está pidiendo
                    </p>
                    <h1 className="mt-2 font-display text-3xl tracking-[-.06em] text-[#12234A] sm:text-4xl">
                        Productos
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2451C5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1E40AF]"
                >
                    <Plus className="size-4" />
                    Nuevo producto
                </button>
            </header>
            <ProductStatsCards stats={stats.data} isLoading={stats.isLoading} />
            <section className="rounded-2xl border border-[#DCE5F3] bg-white p-4 shadow-[0_8px_22px_rgb(20_48_105_/_0.055)] sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#2451C5]">
                            Catálogo
                        </p>
                        <h2 className="mt-1 font-display text-xl tracking-[-.035em] text-[#12234A]">
                            Todos tus productos
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => void catalog.refetch()}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#2451C5] hover:bg-[#EEF3FF]"
                    >
                        <RefreshCw className="size-3.5" />
                        Actualizar
                    </button>
                </div>
                <ProductFilters value={filters} categories={categories} onChange={patchFilters} />
                {catalog.isError ? (
                    <DashboardErrorState
                        title="No pudimos cargar tus productos"
                        description="No logramos consultar el catálogo de tu negocio. Inténtalo nuevamente para continuar administrándolo."
                        onRetry={() => void catalog.refetch()}
                    />
                ) : catalog.isLoading ? (
                    <LoadingRows />
                ) : catalog.data?.products.length ? (
                    <ProductTable
                        products={catalog.data.products}
                        categoryNames={categoryNames}
                        onView={setSelectedProduct}
                        onEdit={(product) => {
                            clearFormErrors()
                            setSelectedProduct(product)
                            setEditor('edit')
                        }}
                        onToggle={toggleProduct}
                        onDelete={deleteProduct}
                        actionsPending={
                            management.updateProductStatus.isPending ||
                            management.deleteProduct.isPending
                        }
                    />
                ) : (
                    <DashboardEmptyState
                        icon={Package}
                        title="Aún no tienes productos"
                        description="Crea tu primer producto para comenzar a recibir pedidos."
                        action={{ label: 'Crear producto', onClick: openCreate }}
                    />
                )}
                {!catalog.isLoading && !catalog.isError && (catalog.data?.total ?? 0) > 0 && (
                    <ProductPagination page={page} totalPages={totalPages} onChange={setPage} />
                )}
            </section>
            <ProductAnalytics
                categories={categories}
                params={{
                    category: analyticsFilters.category,
                    from: analyticsFilters.from,
                    to: analyticsFilters.to,
                    limit: analyticsFilters.limit,
                    setCategory: (category) =>
                        setAnalyticsFilters((current) => ({ ...current, category })),
                    setFrom: (from) => setAnalyticsFilters((current) => ({ ...current, from })),
                    setTo: (to) => setAnalyticsFilters((current) => ({ ...current, to })),
                    setLimit: (limit) => setAnalyticsFilters((current) => ({ ...current, limit })),
                }}
                bestSelling={analytics.bestSelling.data ?? []}
                mostRequested={analytics.mostRequested.data ?? []}
                summary={analytics.summary.data}
                isLoading={
                    analytics.bestSelling.isLoading ||
                    analytics.mostRequested.isLoading ||
                    analytics.summary.isLoading
                }
            />
            <ProductForm
                key={`${editor ?? 'closed'}-${selectedProduct?.id ?? 'new'}-${detail.data?.updatedAt ?? 'loading'}-${detail.data?.optionGroups?.length ?? 0}-${categories.length}`}
                open={editor !== null}
                product={editor === 'edit' ? (detail.data ?? selectedProduct) : null}
                categories={categories}
                isSaving={management.createProduct.isPending || management.updateProduct.isPending}
                errorMessage={formError}
                fieldErrors={fieldErrors}
                onClose={closeEditor}
                onSave={saveProduct}
            />
            <ProductDetails
                open={Boolean(selectedProduct) && editor === null}
                product={detail.data}
                categoryName={
                    detail.data?.categoryName ?? categoryNames.get(detail.data?.categoryId ?? '')
                }
                isLoading={detail.isLoading}
                onClose={() => setSelectedProduct(null)}
            />
        </main>
    )
}

function LoadingRows() {
    return (
        <div className="mt-5 space-y-3">
            {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-[#F4F7FB]" />
            ))}
        </div>
    )
}
