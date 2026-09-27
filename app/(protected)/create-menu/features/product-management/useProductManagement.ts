'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'
import { useAuthStore } from '@/store/authStore'
import {
    createProduct,
    deleteProduct,
    getProduct,
    getProducts,
    getProductsByCategory,
    moveProductToCategory,
    reorderProducts,
    updateProduct,
    updateProductStatus,
} from './productApi'
import type { ProductInput, ProductUpdateInput } from './product.types'

export const productQueryKeys = {
    all: ['products'] as const,
    list: (businessId: string) => ['products', 'list', businessId] as const,
    byCategory: (categoryId: string) => ['products', 'category', categoryId] as const,
    detail: (productId: string) => ['products', 'detail', productId] as const,
}

export function useProducts() {
    const businessId = useAuthStore((state) => state.user?.businessId)
    return useQuery({
        queryKey: productQueryKeys.list(businessId ?? 'none'),
        queryFn: getProducts,
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
    })
}

export function useProductsByCategory(categoryId: string) {
    return useQuery({
        queryKey: productQueryKeys.byCategory(categoryId),
        queryFn: () => getProductsByCategory(categoryId),
        enabled: Boolean(categoryId),
        staleTime: 5 * 60 * 1000,
    })
}

export function useProduct(productId: string | null) {
    return useQuery({
        queryKey: productId ? productQueryKeys.detail(productId) : ['products', 'detail', 'none'],
        queryFn: () => getProduct(productId as string),
        enabled: Boolean(productId),
        staleTime: 5 * 60 * 1000,
    })
}

export function useProductManagement() {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const queryClient = useQueryClient()

    function invalidateProducts(categoryIds: string[] = []) {
        void queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
        void queryClient.invalidateQueries({ queryKey: ['product-catalog'] })
        void queryClient.invalidateQueries({ queryKey: ['product-stats'] })
        void queryClient.invalidateQueries({ queryKey: ['product-analytics'] })
        categoryIds.forEach(
            (categoryId) =>
                void queryClient.invalidateQueries({
                    queryKey: productQueryKeys.byCategory(categoryId),
                }),
        )
    }

    const createProductMutation = useMutation({
        mutationFn: ({ categoryId, input }: { categoryId: string; input: ProductInput }) => {
            if (!businessId) throw new Error('No encontramos el negocio del usuario.')
            return createProduct(businessId, categoryId, input)
        },
        onSuccess: (_, variables) => {
            invalidateProducts([variables.categoryId])
            sileo.success({ title: 'Producto creado' })
        },
    })
    const updateProductMutation = useMutation({
        mutationFn: ({ productId, input }: { productId: string; input: ProductUpdateInput }) =>
            updateProduct(productId, input),
        onSuccess: (product) => {
            invalidateProducts([product.categoryId])
            sileo.success({ title: 'Producto actualizado' })
        },
    })
    const deleteProductMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            invalidateProducts()
            sileo.success({ title: 'Producto eliminado' })
        },
    })
    const updateProductStatusMutation = useMutation({
        mutationFn: ({ productId, active }: { productId: string; active: boolean }) =>
            updateProductStatus(productId, active),
        onSuccess: (product) => {
            invalidateProducts([product.categoryId])
            sileo.success({
                title: product.active === false ? 'Producto desactivado' : 'Producto activado',
            })
        },
    })
    const moveProductMutation = useMutation({
        mutationFn: ({
            productId,
            targetCategoryId,
        }: {
            productId: string
            targetCategoryId: string
            sourceCategoryId: string
        }) => moveProductToCategory(productId, targetCategoryId),
        onSuccess: (_, variables) => {
            invalidateProducts([variables.sourceCategoryId, variables.targetCategoryId])
            sileo.success({ title: 'Producto movido' })
        },
    })
    const reorderProductsMutation = useMutation({
        mutationFn: ({ categoryId, productIds }: { categoryId: string; productIds: string[] }) =>
            reorderProducts(categoryId, productIds),
        onSuccess: (_, variables) => invalidateProducts([variables.categoryId]),
    })

    return {
        createProduct: createProductMutation,
        updateProduct: updateProductMutation,
        deleteProduct: deleteProductMutation,
        updateProductStatus: updateProductStatusMutation,
        moveProductToCategory: moveProductMutation,
        reorderProducts: reorderProductsMutation,
    }
}
