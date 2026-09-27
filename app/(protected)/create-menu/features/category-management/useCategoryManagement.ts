'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createCategory, createMenu, deleteCategory, deleteMenu, getMenu, getMenus, moveProductToCategory, moveProductsAndDeleteCategory, reorderCategories, updateCategory, updateCategoryStatus, updateMenu, updateMenuStatus } from './menuApi'
import type { CategoryInput, MenuCreationInput, MenuUpdateInput } from './menu.types'

export const menuQueryKeys = {
    all: ['menus'] as const,
    list: (businessId: string) => ['menus', 'list', businessId] as const,
    detail: (menuId: string) => ['menus', 'detail', menuId] as const,
}

export function useCategoryManagement() {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const queryClient = useQueryClient()
    const [isOpen, setIsOpen] = useState(false)
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)

    const menusQuery = useQuery({
        queryKey: menuQueryKeys.list(businessId ?? 'none'),
        queryFn: getMenus,
        enabled: Boolean(businessId),
        staleTime: 5 * 60 * 1000,
    })
    const menuQuery = useQuery({
        queryKey: selectedMenuId ? menuQueryKeys.detail(selectedMenuId) : ['menus', 'detail', 'none'],
        queryFn: () => getMenu(selectedMenuId as string),
        enabled: Boolean(selectedMenuId),
        staleTime: 5 * 60 * 1000,
    })

    function invalidateMenus() {
        void queryClient.invalidateQueries({ queryKey: menuQueryKeys.all })
        if (selectedMenuId) void queryClient.invalidateQueries({ queryKey: menuQueryKeys.detail(selectedMenuId) })
    }

    const createMenuMutation = useMutation({
        mutationFn: (input: MenuCreationInput) => {
            if (!businessId) throw new Error('No encontramos el negocio del usuario.')
            return createMenu(businessId, input)
        },
        onSuccess: () => {
            setIsOpen(false)
            invalidateMenus()
            sileo.success({ title: '¡Menú creado!', description: 'Tu menú y sus categorías ya están listos.' })
        },
    })
    const updateMenuMutation = useMutation({ mutationFn: ({ menuId, input }: { menuId: string; input: MenuUpdateInput }) => updateMenu(menuId, input), onSuccess: () => { invalidateMenus(); sileo.success({ title: 'Menú actualizado' }) } })
    const updateMenuStatusMutation = useMutation({ mutationFn: ({ menuId, isActive }: { menuId: string; isActive: boolean }) => updateMenuStatus(menuId, isActive), onSuccess: invalidateMenus })
    const deleteMenuMutation = useMutation({ mutationFn: deleteMenu, onSuccess: () => { setSelectedMenuId(null); invalidateMenus(); sileo.success({ title: 'Menú eliminado' }) } })
    const createCategoryMutation = useMutation({ mutationFn: ({ menuId, input }: { menuId: string; input: CategoryInput }) => { if (!businessId) throw new Error('No encontramos el negocio del usuario.'); return createCategory(businessId, menuId, input) }, onSuccess: invalidateMenus })
    const updateCategoryMutation = useMutation({ mutationFn: ({ categoryId, input }: { categoryId: string; input: CategoryInput }) => updateCategory(categoryId, input), onSuccess: () => { invalidateMenus(); sileo.success({ title: 'Categoría actualizada' }) } })
    const updateCategoryStatusMutation = useMutation({ mutationFn: ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => updateCategoryStatus(categoryId, isActive), onSuccess: invalidateMenus })
    const deleteCategoryMutation = useMutation({ mutationFn: deleteCategory, onSuccess: invalidateMenus })
    const moveProductsMutation = useMutation({ mutationFn: ({ categoryId, targetCategoryId }: { categoryId: string; targetCategoryId: string }) => moveProductsAndDeleteCategory(categoryId, targetCategoryId), onSuccess: () => { invalidateMenus(); sileo.success({ title: 'Categoría eliminada' }) } })
    const reorderCategoriesMutation = useMutation({ mutationFn: ({ menuId, categoryIds }: { menuId: string; categoryIds: string[] }) => reorderCategories(menuId, categoryIds), onSuccess: invalidateMenus })
    const moveProductMutation = useMutation({ mutationFn: ({ productId, targetCategoryId }: { productId: string; targetCategoryId: string }) => moveProductToCategory(productId, targetCategoryId), onSuccess: invalidateMenus })

    const selectedMenu = menuQuery.data
    const categories = selectedMenu?.categories?.map((category) => category.name) ?? []

    return {
        menus: menusQuery.data ?? [],
        categories,
        selectedMenu,
        selectedMenuId,
        selectMenu: setSelectedMenuId,
        menusQuery,
        menuQuery,
        isOpen,
        open: () => { createMenuMutation.reset(); setIsOpen(true) },
        close: () => { createMenuMutation.reset(); setIsOpen(false) },
        createMenu: createMenuMutation,
        updateMenu: updateMenuMutation,
        updateMenuStatus: updateMenuStatusMutation,
        deleteMenu: deleteMenuMutation,
        createCategory: createCategoryMutation,
        updateCategory: updateCategoryMutation,
        updateCategoryStatus: updateCategoryStatusMutation,
        deleteCategory: deleteCategoryMutation,
        moveProductsAndDeleteCategory: moveProductsMutation,
        reorderCategories: reorderCategoriesMutation,
        moveProductToCategory: moveProductMutation,
    }
}
