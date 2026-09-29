/* eslint-disable @next/next/no-img-element -- Product image URLs come directly from the backend. */

'use client'

import { useState } from 'react'
import type { UseFormSetError } from 'react-hook-form'
import { motion, useReducedMotion } from 'framer-motion'
import { GripVertical, LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { sileo } from 'sileo'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import type { MenuCategory } from './menu.types'
import type { useCategoryManagement } from './useCategoryManagement'
import { AddProductModal } from '../product-management/AddProductModal'
import {
    useProductManagement,
    useProductsByCategory,
} from '../product-management/useProductManagement'
import type { Product } from '../product-management/product.types'
import type { ProductFormValues } from '../product-management/product.schema'
import {
    CreateMenuEmptyState,
    CreateMenuErrorState,
    MenuManagementSkeleton,
} from '../../components/CreateMenuStates'

type MenuManagement = ReturnType<typeof useCategoryManagement>
type ProductManagement = ReturnType<typeof useProductManagement>

function errorMessage(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) return fallback
    const messages: Record<string, string> = {
        MENU_CONTAINS_PRODUCTS: 'No puedes eliminar este menú mientras contenga productos.',
        CATEGORY_CONTAINS_PRODUCTS:
            'La categoría contiene productos; muévelos a otra categoría para eliminarla.',
        SAME_CATEGORY: 'Selecciona una categoría diferente a la de origen.',
        INVALID_CATEGORY_ORDER:
            'El orden de categorías ya no es válido. Actualiza el menú e inténtalo de nuevo.',
        PRODUCT_SAME_CATEGORY: 'El producto ya pertenece a esa categoría.',
        INVALID_PRODUCT_ORDER:
            'El orden de productos ya no es válido. Actualiza la categoría e inténtalo de nuevo.',
        BUSINESS_ACCESS_DENIED: 'No tienes permiso para administrar este negocio.',
        NOT_AUTHENTICATED: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    }
    return (error.code && messages[error.code]) ?? error.message ?? fallback
}

function ReorderStatus({ children }: { children: string }) {
    const reducedMotion = useReducedMotion()

    return (
        <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            aria-live="polite"
            className="mb-2 flex items-center gap-2 rounded-lg border border-[#C9D8FF] bg-[#F4F7FF] px-3 py-2 text-xs font-semibold text-[#2451C5]"
        >
            <LoaderCircle
                className={`size-3.5 shrink-0 ${reducedMotion ? '' : 'animate-spin'}`}
                aria-hidden="true"
            />
            <span>{children}</span>
            <span className="ml-auto hidden text-[10px] font-medium text-[#6B7FAF] sm:inline">
                Actualizando la lista
            </span>
        </motion.div>
    )
}

function CategoryProducts({
    category,
    categories,
    productManagement,
}: {
    category: MenuCategory
    categories: MenuCategory[]
    productManagement: ProductManagement
}) {
    const productsQuery = useProductsByCategory(category.id)
    const [productModalOpen, setProductModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [draggedProductId, setDraggedProductId] = useState<string | null>(null)
    const [reorderingProductId, setReorderingProductId] = useState<string | null>(null)
    const reducedMotion = useReducedMotion()
    const products = productsQuery.data ?? []

    function saveProduct(values: ProductFormValues, setError: UseFormSetError<ProductFormValues>) {
        if (productManagement.createProduct.isPending || productManagement.updateProduct.isPending)
            return
        const onError = (error: unknown) => {
            if (error instanceof ApiError) {
                Object.entries(error.fieldErrors).forEach(([field, messages]) => {
                    if (field in values)
                        setError(field as keyof ProductFormValues, {
                            type: 'server',
                            message: messages[0],
                        })
                })
                sileo.error({ title: errorMessage(error, 'Revisa los datos del producto.') })
                return
            }
            sileo.error({ title: 'No pudimos guardar el producto. Inténtalo de nuevo.' })
        }
        if (editingProduct) {
            productManagement.updateProduct.mutate(
                { productId: editingProduct.id, input: values },
                {
                    onSuccess: () => {
                        setProductModalOpen(false)
                        setEditingProduct(null)
                    },
                    onError,
                },
            )
        } else {
            productManagement.createProduct.mutate(
                { categoryId: category.id, input: values },
                { onSuccess: (product) => setEditingProduct(product), onError },
            )
        }
    }

    function dropProduct(targetId: string) {
        if (
            productManagement.reorderProducts.isPending ||
            !draggedProductId ||
            draggedProductId === targetId
        )
            return
        const next = [...products]
        const from = next.findIndex((product) => product.id === draggedProductId)
        const to = next.findIndex((product) => product.id === targetId)
        if (from < 0 || to < 0) return
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        setReorderingProductId(draggedProductId)
        setDraggedProductId(null)
        productManagement.reorderProducts.mutate(
            { categoryId: category.id, productIds: next.map((product) => product.id) },
            {
                onError: (error) =>
                    sileo.error({
                        title: errorMessage(error, 'No pudimos reordenar los productos.'),
                    }),
                onSettled: () => setReorderingProductId(null),
            },
        )
    }

    function removeProduct(product: Product) {
        if (!window.confirm(`¿Eliminar “${product.name}”?`)) return
        productManagement.deleteProduct.mutate(product.id, {
            onError: (error) =>
                sileo.error({ title: errorMessage(error, 'No pudimos eliminar el producto.') }),
        })
    }

    return (
        <div className="mt-3 border-t border-[#E8EEF6] pt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span
                        className="grid size-6 place-items-center rounded-md border border-[#D7E1EF] bg-[#F8FAFF] text-[#5572B8]"
                        title="Mover para cambiar el orden"
                        aria-hidden="true"
                    >
                        <GripVertical className="size-3.5" />
                    </span>
                    <p className="text-xs font-semibold text-[#8996A9]">
                        {productsQuery.isLoading
                            ? 'Cargando productos…'
                            : `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setEditingProduct(null)
                        setProductModalOpen(true)
                    }}
                    disabled={productManagement.reorderProducts.isPending}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#2451C5] hover:bg-[#EEF3FF] disabled:cursor-wait disabled:opacity-50"
                >
                    <Plus className="size-3.5" />
                    Agregar producto
                </button>
            </div>
            {productsQuery.isError && (
                <p role="alert" className="text-xs text-[#B42318]">
                    {errorMessage(productsQuery.error, 'No pudimos cargar los productos.')}
                </p>
            )}
            {reorderingProductId && productManagement.reorderProducts.isPending && (
                <ReorderStatus>Guardando el nuevo orden de productos…</ReorderStatus>
            )}
            {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 && (
                <p className="rounded-lg border border-dashed border-[#DCE5F3] px-3 py-3 text-xs text-[#8996A9]">
                    Esta categoría todavía no tiene productos.
                </p>
            )}
            <div className="space-y-2">
                {products.map((product) => (
                    <motion.div
                        key={product.id}
                        layout={!reducedMotion}
                        animate={
                            reorderingProductId === product.id
                                ? { scale: [1, 1.015, 1] }
                                : { scale: 1 }
                        }
                        transition={{ duration: reducedMotion ? 0 : 0.22 }}
                        draggable={!productManagement.reorderProducts.isPending}
                        aria-busy={reorderingProductId === product.id}
                        aria-label={`Reordenar producto ${product.name}`}
                        onDragStart={() => {
                            if (!productManagement.reorderProducts.isPending)
                                setDraggedProductId(product.id)
                        }}
                        onDragEnd={() => setDraggedProductId(null)}
                        onDragOver={(event) => {
                            if (!productManagement.reorderProducts.isPending)
                                event.preventDefault()
                        }}
                        onDrop={() => dropProduct(product.id)}
                        className={`group rounded-lg border bg-white px-3 py-2 transition-colors ${reorderingProductId === product.id ? 'border-[#8EA9F5] bg-[#F8FAFF] ring-2 ring-[#2451C5]/10' : 'border-[#E8EEF6] hover:border-[#B8C8E5]'} ${productManagement.reorderProducts.isPending ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <GripVertical
                                    className="size-4 shrink-0 text-[#B7C3D5] transition-colors group-hover:text-[#5572B8]"
                                    aria-hidden="true"
                                />
                                <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EEF3FF] text-[#2451C5]">
                                    {product.imageUrl ? (
                                        <img
                                            width={36}
                                            height={36}
                                            src={product.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs">☰</span>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#243556]">
                                        {product.name}
                                    </p>
                                    {product.description && (
                                        <p className="truncate text-xs text-[#8996A9]">
                                            {product.description}
                                        </p>
                                    )}
                                    <p className="mt-0.5 text-xs font-bold text-[#2451C5]">
                                        ${Number(product.price).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        productManagement.updateProductStatus.mutate({
                                            productId: product.id,
                                            active: !(product.active ?? product.isAvailable),
                                        })
                                    }
                                    disabled={productManagement.reorderProducts.isPending}
                                    className={`rounded px-1.5 py-1 text-[11px] font-semibold disabled:cursor-wait disabled:opacity-50 ${(product.active ?? product.isAvailable) ? 'text-[#23794A]' : 'text-[#8996A9]'}`}
                                >
                                    {(product.active ?? product.isAvailable)
                                        ? 'Disponible'
                                        : 'No disponible'}
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Editar ${product.name}`}
                                    onClick={() => {
                                        setEditingProduct(product)
                                        setProductModalOpen(true)
                                    }}
                                    disabled={productManagement.reorderProducts.isPending}
                                    className="grid size-7 place-items-center rounded text-[#65738A] hover:bg-[#EEF3FF] hover:text-[#1E40AF] disabled:cursor-wait disabled:opacity-50"
                                >
                                    <Pencil className="size-3.5" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Eliminar ${product.name}`}
                                    onClick={() => removeProduct(product)}
                                    disabled={productManagement.reorderProducts.isPending}
                                    className="grid size-7 place-items-center rounded text-[#65738A] hover:bg-[#FDECEC] hover:text-[#B42318] disabled:cursor-wait disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 border-t border-[#E8EEF6] pt-2">
                            <span className="text-[11px] text-[#8996A9]">Mover a</span>
                            <select
                                aria-label={`Mover ${product.name}`}
                                value={product.categoryId}
                                onChange={(event) => {
                                    if (event.target.value !== category.id)
                                        productManagement.moveProductToCategory.mutate({
                                            productId: product.id,
                                            sourceCategoryId: category.id,
                                            targetCategoryId: event.target.value,
                                        })
                                }}
                                disabled={productManagement.reorderProducts.isPending}
                                className="min-w-0 flex-1 rounded border border-[#D7E1EF] bg-white px-1.5 py-1 text-[11px] disabled:cursor-wait disabled:opacity-50"
                            >
                                <option value={category.id}>{category.name}</option>
                                {categories
                                    .filter((target) => target.id !== category.id)
                                    .map((target) => (
                                        <option key={target.id} value={target.id}>
                                            {target.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </motion.div>
                ))}
            </div>
            <AddProductModal
                open={productModalOpen}
                categoryName={category.name}
                product={editingProduct}
                isSaving={
                    productManagement.createProduct.isPending ||
                    productManagement.updateProduct.isPending
                }
                onClose={() => {
                    setProductModalOpen(false)
                    setEditingProduct(null)
                }}
                onSave={saveProduct}
            />
        </div>
    )
}

export function MenuManagementPanel({ management }: { management: MenuManagement }) {
    const { menus, selectedMenu, selectedMenuId, selectMenu, menusQuery, menuQuery } = management
    const [editingMenu, setEditingMenu] = useState(false)
    const [menuName, setMenuName] = useState('')
    const [menuDescription, setMenuDescription] = useState('')
    const [categoryFormOpen, setCategoryFormOpen] = useState(false)
    const [categoryName, setCategoryName] = useState('')
    const [categoryDescription, setCategoryDescription] = useState('')
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
    const [movingCategory, setMovingCategory] = useState<MenuCategory | null>(null)
    const [targetCategoryId, setTargetCategoryId] = useState('')
    const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null)
    const [reorderingCategoryId, setReorderingCategoryId] = useState<string | null>(null)
    const reducedMotion = useReducedMotion()
    const productManagement = useProductManagement()

    if (menusQuery.isLoading) return <MenuManagementSkeleton />

    function startEditingMenu() {
        if (!selectedMenu) return
        setMenuName(selectedMenu.name)
        setMenuDescription(selectedMenu.description ?? '')
        setEditingMenu(true)
    }

    function saveMenu() {
        if (management.updateMenu.isPending) return
        if (!selectedMenu || !menuName.trim()) {
            sileo.error({ title: 'Escribe un nombre para el menú.' })
            return
        }
        management.updateMenu.mutate(
            {
                menuId: selectedMenu.id,
                input: { name: menuName.trim(), description: menuDescription.trim() },
            },
            { onSuccess: () => setEditingMenu(false) },
        )
    }

    function saveCategory() {
        if (management.createCategory.isPending) return
        if (!selectedMenu || !categoryName.trim()) {
            sileo.error({ title: 'Escribe un nombre para la categoría.' })
            return
        }
        management.createCategory.mutate(
            {
                menuId: selectedMenu.id,
                input: { name: categoryName.trim(), description: categoryDescription.trim() },
            },
            {
                onSuccess: () => {
                    setCategoryFormOpen(false)
                    setCategoryName('')
                    setCategoryDescription('')
                },
            },
        )
    }

    function saveEditedCategory() {
        if (management.updateCategory.isPending) return
        if (!editingCategory || !editingCategory.name.trim()) return
        management.updateCategory.mutate(
            {
                categoryId: editingCategory.id,
                input: {
                    name: editingCategory.name.trim(),
                    description: editingCategory.description ?? '',
                },
            },
            { onSuccess: () => setEditingCategory(null) },
        )
    }

    function deleteCategory(category: MenuCategory) {
        if (management.deleteCategory.isPending) return
        management.deleteCategory.mutate(category.id, {
            onSuccess: () => sileo.success({ title: 'Categoría eliminada' }),
            onError: (error) => {
                if (error instanceof ApiError && error.code === 'CATEGORY_CONTAINS_PRODUCTS') {
                    setMovingCategory(category)
                    setTargetCategoryId('')
                    return
                }
                sileo.error({ title: errorMessage(error, 'No pudimos eliminar la categoría.') })
            },
        })
    }

    function confirmDeleteMenu() {
        if (management.deleteMenu.isPending) return
        if (!selectedMenu || !window.confirm(`¿Eliminar el menú “${selectedMenu.name}”?`)) return
        management.deleteMenu.mutate(selectedMenu.id, {
            onError: (error) =>
                sileo.error({ title: errorMessage(error, 'No pudimos eliminar el menú.') }),
        })
    }

    function reorderCategories(categoryIds: string[]) {
        if (!selectedMenu || management.reorderCategories.isPending) return
        management.reorderCategories.mutate(
            { menuId: selectedMenu.id, categoryIds },
            {
                onError: (error) =>
                    sileo.error({
                        title: errorMessage(error, 'No pudimos reordenar las categorías.'),
                    }),
                onSettled: () => setReorderingCategoryId(null),
            },
        )
    }

    function dropCategory(targetId: string) {
        if (
            management.reorderCategories.isPending ||
            !selectedMenu ||
            !draggedCategoryId ||
            draggedCategoryId === targetId
        )
            return
        const next = [...(selectedMenu.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
        const from = next.findIndex((category) => category.id === draggedCategoryId)
        const to = next.findIndex((category) => category.id === targetId)
        if (from < 0 || to < 0) return
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        setReorderingCategoryId(draggedCategoryId)
        setDraggedCategoryId(null)
        reorderCategories(next.map((category) => category.id))
    }

    function moveAndDelete() {
        if (!movingCategory || !targetCategoryId || movingCategory.id === targetCategoryId) return
        management.moveProductsAndDeleteCategory.mutate(
            { categoryId: movingCategory.id, targetCategoryId },
            {
                onSuccess: () => {
                    setMovingCategory(null)
                    setTargetCategoryId('')
                },
                onError: (error) =>
                    sileo.error({ title: errorMessage(error, 'No pudimos mover los productos.') }),
            },
        )
    }

    return (
        <section
            className="rounded-[24px] border border-[#DCE5F3] bg-white p-5 shadow-[0_22px_70px_-52px_rgba(19,49,117,.4)] sm:p-6"
            aria-labelledby="menus-title"
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                        Administración
                    </p>
                    <h2
                        id="menus-title"
                        className="mt-1 font-display text-2xl tracking-[-.05em] text-[#10224A]"
                    >
                        Tus menús
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => void menusQuery.refetch()}
                    aria-label="Actualizar menús"
                    className="grid size-9 place-items-center rounded-lg text-[#65738A] transition hover:bg-[#F5F8FC] hover:text-[#1E40AF]"
                >
                    <RefreshCw className="size-4" />
                </button>
            </div>
            {menusQuery.isError && (
                <CreateMenuErrorState
                    title="No pudimos cargar tus menús"
                    description={errorMessage(
                        menusQuery.error,
                        'No logramos consultar la configuración de tus menús.',
                    )}
                    onRetry={() => void menusQuery.refetch()}
                />
            )}
            {!menusQuery.isLoading && !menusQuery.isError && menus.length === 0 && (
                <CreateMenuEmptyState
                    title="Aún no tienes menús"
                    description="Crea tu primer menú para organizar tus categorías y productos."
                    actionLabel="Crear menú"
                    onAction={management.open}
                />
            )}
            {menus.length > 0 && (
                <div className="grid gap-5 lg:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)]">
                    <div className="space-y-2">
                        {menus.map((menu) => (
                            <button
                                key={menu.id}
                                type="button"
                                onClick={() => selectMenu(menu.id)}
                                className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${selectedMenuId === menu.id ? 'border-[#2451C5] bg-[#EEF3FF]' : 'border-[#E8EEF6] hover:border-[#BFCDE1]'}`}
                            >
                                <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold text-[#243556]">
                                        {menu.name}
                                    </span>
                                    <span
                                        className={`size-2 shrink-0 rounded-full ${menu.isActive ? 'bg-[#39A86B]' : 'bg-[#C8D1DE]'}`}
                                    />
                                </span>
                                <span className="mt-1 block text-xs text-[#8996A9]">
                                    {menu.categories?.length ?? 0} categorías
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="min-w-0 border-t border-[#E8EEF6] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                        {menuQuery.isLoading && (
                            <p className="text-sm text-[#8996A9]">Cargando menú…</p>
                        )}
                        {selectedMenu && (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#243556]">
                                            {selectedMenu.name}
                                        </h3>
                                        {selectedMenu.description && (
                                            <p className="mt-1 text-sm text-[#65738A]">
                                                {selectedMenu.description}
                                            </p>
                                        )}
                                        <p className="mt-2 text-xs font-semibold text-[#8996A9]">
                                            {selectedMenu.isActive ? 'Activo' : 'Inactivo'}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            aria-label="Editar menú"
                                            onClick={startEditingMenu}
                                            className="grid size-8 place-items-center rounded-lg text-[#65738A] hover:bg-[#F5F8FC] hover:text-[#1E40AF]"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                management.updateMenuStatus.mutate({
                                                    menuId: selectedMenu.id,
                                                    isActive: !selectedMenu.isActive,
                                                })
                                            }
                                            disabled={management.updateMenuStatus.isPending}
                                            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#2451C5] hover:bg-[#EEF3FF] disabled:cursor-wait disabled:opacity-50"
                                        >
                                            {selectedMenu.isActive ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Eliminar menú"
                                            onClick={confirmDeleteMenu}
                                            disabled={management.deleteMenu.isPending}
                                            className="grid size-8 place-items-center rounded-lg text-[#65738A] hover:bg-[#FDECEC] hover:text-[#B42318] disabled:cursor-wait disabled:opacity-50"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-5 flex items-center justify-between gap-3">
                                    <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.13em] text-[#8996A9]">
                                        <GripVertical className="size-3.5 text-[#5572B8]" aria-hidden="true" />
                                        Categorías
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setCategoryFormOpen((current) => !current)}
                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#2451C5] hover:bg-[#EEF3FF]"
                                    >
                                        <Plus className="size-3.5" />
                                        Agregar
                                    </button>
                                </div>
                                {categoryFormOpen && (
                                    <div className="mt-3 space-y-2 rounded-xl border border-[#DCE5F3] bg-[#FBFCFE] p-3">
                                        <input
                                            value={categoryName}
                                            onChange={(event) =>
                                                setCategoryName(event.target.value)
                                            }
                                            placeholder="Nombre de categoría"
                                            className="w-full rounded-lg border border-[#D7E1EF] px-3 py-2 text-sm outline-none focus:border-[#2451C5]"
                                        />
                                        <textarea
                                            value={categoryDescription}
                                            onChange={(event) =>
                                                setCategoryDescription(event.target.value)
                                            }
                                            placeholder="Descripción (opcional)"
                                            rows={2}
                                            className="w-full resize-none rounded-lg border border-[#D7E1EF] px-3 py-2 text-sm outline-none focus:border-[#2451C5]"
                                        />
                                        <button
                                            type="button"
                                            onClick={saveCategory}
                                            disabled={management.createCategory.isPending}
                                            className="rounded-lg bg-[#1E40AF] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                                        >
                                            {management.createCategory.isPending
                                                ? 'Guardando…'
                                                : 'Guardar categoría'}
                                        </button>
                                    </div>
                                )}
                                {(selectedMenu.categories ?? []).length === 0 ? (
                                    <div className="mt-3">
                                        <CreateMenuEmptyState
                                            title="Aún no tienes categorías"
                                            description="Crea una categoría para organizar los productos de este menú."
                                            actionLabel="Crear categoría"
                                            onAction={() => setCategoryFormOpen(true)}
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-3 space-y-2">
                                        {reorderingCategoryId &&
                                            management.reorderCategories.isPending && (
                                                <ReorderStatus>
                                                    Guardando el nuevo orden de categorías…
                                                </ReorderStatus>
                                            )}
                                        {[...(selectedMenu.categories ?? [])]
                                            .sort((a, b) => a.sortOrder - b.sortOrder)
                                            .map((category) => (
                                                <motion.div
                                                    key={category.id}
                                                    layout={!reducedMotion}
                                                    animate={
                                                        reorderingCategoryId === category.id
                                                            ? { scale: [1, 1.01, 1] }
                                                            : { scale: 1 }
                                                    }
                                                    transition={{
                                                        duration: reducedMotion ? 0 : 0.22,
                                                    }}
                                                    draggable={!management.reorderCategories.isPending}
                                                    aria-busy={
                                                        reorderingCategoryId === category.id
                                                    }
                                                    aria-label={`Reordenar categoría ${category.name}`}
                                                    onDragStart={() => {
                                                        if (!management.reorderCategories.isPending)
                                                            setDraggedCategoryId(category.id)
                                                    }}
                                                    onDragEnd={() => setDraggedCategoryId(null)}
                                                    onDragOver={(event) => {
                                                        if (!management.reorderCategories.isPending)
                                                            event.preventDefault()
                                                    }}
                                                    onDrop={() => dropCategory(category.id)}
                                                    className={`group rounded-xl border bg-[#FBFCFE] px-3 py-2.5 transition-colors ${reorderingCategoryId === category.id ? 'border-[#8EA9F5] bg-[#F8FAFF] ring-2 ring-[#2451C5]/10' : 'border-[#E8EEF6] hover:border-[#B8C8E5]'} ${management.reorderCategories.isPending ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-start gap-2.5">
                                                            <GripVertical
                                                                className="mt-0.5 size-4 shrink-0 text-[#B7C3D5] transition-colors group-hover:text-[#5572B8]"
                                                                aria-hidden="true"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-[#243556]">
                                                                    {category.name}
                                                                </p>
                                                                {category.description && (
                                                                    <p className="mt-0.5 text-xs text-[#8996A9]">
                                                                        {category.description}
                                                                    </p>
                                                                )}
                                                                <p className="mt-1 text-[11px] text-[#8996A9]">
                                                                    {category.isActive ? 'Activa' : 'Inactiva'}{' '}
                                                                    <span className="mx-1 text-[#C2CCDA]">·</span>
                                                                    <span className="text-[#5572B8]">Orden</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex shrink-0 gap-1">
                                                            <button
                                                                type="button"
                                                                aria-label={`Editar ${category.name}`}
                                                                onClick={() =>
                                                                    setEditingCategory({
                                                                        ...category,
                                                                    })
                                                                }
                                                                disabled={
                                                                    management.reorderCategories
                                                                        .isPending
                                                                }
                                                                className="grid size-7 place-items-center rounded text-[#65738A] hover:bg-[#EEF3FF] hover:text-[#1E40AF]"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    management.updateCategoryStatus.mutate(
                                                                        {
                                                                            categoryId: category.id,
                                                                            isActive:
                                                                                !category.isActive,
                                                                        },
                                                                    )
                                                                }
                                                                disabled={
                                                                    management.updateCategoryStatus
                                                                        .isPending ||
                                                                    management.reorderCategories
                                                                        .isPending
                                                                }
                                                                className="rounded px-1.5 py-1 text-[11px] font-semibold text-[#2451C5] disabled:cursor-wait disabled:opacity-50"
                                                            >
                                                                {category.isActive ? 'Off' : 'On'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label={`Eliminar ${category.name}`}
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            `¿Eliminar “${category.name}”?`,
                                                                        )
                                                                    )
                                                                        deleteCategory(category)
                                                                }}
                                                                disabled={
                                                                    management.deleteCategory
                                                                        .isPending ||
                                                                    management.reorderCategories
                                                                        .isPending
                                                                }
                                                                className="grid size-7 place-items-center rounded text-[#65738A] hover:bg-[#FDECEC] hover:text-[#B42318] disabled:cursor-wait disabled:opacity-50"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <CategoryProducts
                                                        category={category}
                                                        categories={selectedMenu.categories ?? []}
                                                        productManagement={productManagement}
                                                    />
                                                </motion.div>
                                            ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <Modal
                open={editingMenu}
                onClose={() => setEditingMenu(false)}
                title="Editar menú"
                description="Actualiza la información del menú."
            >
                <div className="space-y-4">
                    <input
                        value={menuName}
                        onChange={(event) => setMenuName(event.target.value)}
                        placeholder="Nombre del menú"
                        className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm"
                    />
                    <textarea
                        value={menuDescription}
                        onChange={(event) => setMenuDescription(event.target.value)}
                        placeholder="Descripción (opcional)"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setEditingMenu(false)}
                            disabled={management.updateMenu.isPending}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={saveMenu}
                            disabled={management.updateMenu.isPending}
                            className="rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white"
                        >
                            {management.updateMenu.isPending ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                open={Boolean(editingCategory)}
                onClose={() => setEditingCategory(null)}
                title="Editar categoría"
                description="Actualiza el nombre o la descripción sin modificar sus productos."
            >
                <div className="space-y-4">
                    {editingCategory && (
                        <>
                            <input
                                value={editingCategory.name}
                                onChange={(event) =>
                                    setEditingCategory({
                                        ...editingCategory,
                                        name: event.target.value,
                                    })
                                }
                                placeholder="Nombre de categoría"
                                className="w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm"
                            />
                            <textarea
                                value={editingCategory.description ?? ''}
                                onChange={(event) =>
                                    setEditingCategory({
                                        ...editingCategory,
                                        description: event.target.value,
                                    })
                                }
                                placeholder="Descripción (opcional)"
                                rows={3}
                                className="w-full resize-none rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingCategory(null)}
                                    disabled={management.updateCategory.isPending}
                                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={saveEditedCategory}
                                    disabled={management.updateCategory.isPending}
                                    className="rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white"
                                >
                                    {management.updateCategory.isPending ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
            <Modal
                open={Boolean(movingCategory)}
                onClose={() => setMovingCategory(null)}
                title="Mover productos"
                description="Esta categoría contiene productos. Elige otra categoría para moverlos antes de eliminarla."
            >
                <div className="space-y-4">
                    <select
                        value={targetCategoryId}
                        onChange={(event) => setTargetCategoryId(event.target.value)}
                        className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm"
                    >
                        <option value="">Selecciona una categoría</option>
                        {selectedMenu?.categories
                            .filter((category) => category.id !== movingCategory?.id)
                            .map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                    </select>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setMovingCategory(null)}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={
                                !targetCategoryId ||
                                management.moveProductsAndDeleteCategory.isPending
                            }
                            onClick={moveAndDelete}
                            className="rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                        >
                            Mover y eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    )
}
