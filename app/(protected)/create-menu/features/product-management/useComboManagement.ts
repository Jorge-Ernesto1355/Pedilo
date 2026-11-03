'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notify } from '@/src/lib/notifications/notify'
import {
    createCombo,
    getCombo,
    addIncludedProduct,
    removeIncludedProduct,
    createComboGroup,
    updateComboGroup,
    deleteComboGroup,
    addComboChoice,
    removeComboChoice,
    updateComboDetails,
} from './comboApi'
import type {
    ComboDetails,
    ComboGroupInput,
    CreateComboInput,
    UpdateComboDetailsInput,
} from './comboApi'

export const comboQueryKeys = {
    detail: (productId: string) => ['combo', productId] as const,
}

export function useCombo(productId: string | null) {
    return useQuery({
        queryKey: productId ? comboQueryKeys.detail(productId) : ['combo', 'none'],
        queryFn: () => getCombo(productId as string),
        enabled: Boolean(productId),
        staleTime: 0,
    })
}

export function useComboManagement() {
    const queryClient = useQueryClient()
    function updateDetailsCache(
        productId: string,
        updater: (current: ComboDetails) => ComboDetails,
    ) {
        queryClient.setQueryData<ComboDetails>(comboQueryKeys.detail(productId), (current) =>
            current ? updater(current) : current,
        )
    }
    function refresh(productId?: string) {
        void queryClient.invalidateQueries({ queryKey: ['products'] })
        void queryClient.invalidateQueries({ queryKey: ['product-catalog'] })
        if (productId)
            void queryClient.invalidateQueries({ queryKey: comboQueryKeys.detail(productId) })
    }

    const createMutation = useMutation({
        mutationFn: (input: CreateComboInput) => createCombo(input),
        onSuccess: (combo) => {
            refresh()
            notify.success({
                title: 'Combo creado',
                description: `“${combo.name}” ya está en tu menú.`,
            })
        },
    })
    const addIncludedMutation = useMutation({
        mutationFn: ({ comboId, productId }: { comboId: string; productId: string }) =>
            addIncludedProduct(comboId, productId),
        onSuccess: (included, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                includedProducts: current.includedProducts.some((item) => item.id === included.id)
                    ? current.includedProducts
                    : [...current.includedProducts, included],
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Producto incluido',
                description: 'El combo se actualizó correctamente.',
            })
        },
    })
    const removeIncludedMutation = useMutation({
        mutationFn: ({ comboId, includedId }: { comboId: string; includedId: string }) =>
            removeIncludedProduct(comboId, includedId),
        onSuccess: (_, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                includedProducts: current.includedProducts.filter(
                    (item) => item.id !== variables.includedId,
                ),
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Producto quitado',
                description: 'Se guardaron los cambios del combo.',
            })
        },
    })
    const createGroupMutation = useMutation({
        mutationFn: ({ comboId, input }: { comboId: string; input: ComboGroupInput }) =>
            createComboGroup(comboId, input),
        onSuccess: (group, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                optionGroups: current.optionGroups.some((item) => item.id === group.id)
                    ? current.optionGroups
                    : [...current.optionGroups, group],
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Grupo creado',
                description: 'Las opciones ya están disponibles en el combo.',
            })
        },
    })
    const updateGroupMutation = useMutation({
        mutationFn: ({
            comboId,
            groupId,
            input,
        }: {
            comboId: string
            groupId: string
            input: Partial<ComboGroupInput>
        }) => updateComboGroup(comboId, groupId, input),
        onSuccess: (group, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                optionGroups: current.optionGroups.map((item) =>
                    item.id === group.id ? group : item,
                ),
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Grupo actualizado',
                description: 'Se guardó el nombre del grupo.',
            })
        },
    })
    const deleteGroupMutation = useMutation({
        mutationFn: ({ comboId, groupId }: { comboId: string; groupId: string }) =>
            deleteComboGroup(comboId, groupId),
        onSuccess: (_, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                optionGroups: current.optionGroups.filter((item) => item.id !== variables.groupId),
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Grupo eliminado',
                description: 'Se quitaron sus opciones del combo.',
            })
        },
    })
    const addChoiceMutation = useMutation({
        mutationFn: ({
            comboId,
            groupId,
            productId,
        }: {
            comboId: string
            groupId: string
            productId: string
        }) => addComboChoice(comboId, groupId, productId),
        onSuccess: (choice, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                optionGroups: current.optionGroups.map((group) =>
                    group.id !== variables.groupId ||
                    group.products.some((item) => item.productId === choice.productId)
                        ? group
                        : { ...group, products: [...group.products, choice] },
                ),
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Opción agregada',
                description: 'El cliente ya puede elegir este producto.',
            })
        },
    })
    const removeChoiceMutation = useMutation({
        mutationFn: ({
            comboId,
            groupId,
            productId,
        }: {
            comboId: string
            groupId: string
            productId: string
        }) => removeComboChoice(comboId, groupId, productId),
        onSuccess: (_, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                optionGroups: current.optionGroups.map((group) =>
                    group.id === variables.groupId
                        ? {
                              ...group,
                              products: group.products.filter(
                                  (item) => item.productId !== variables.productId,
                              ),
                          }
                        : group,
                ),
            }))
            refresh(variables.comboId)
            notify.success({
                title: 'Opción quitada',
                description: 'Se guardaron los cambios del grupo.',
            })
        },
    })
    const updateDetailsMutation = useMutation({
        mutationFn: ({ comboId, input }: { comboId: string; input: UpdateComboDetailsInput }) =>
            updateComboDetails(comboId, input),
        onSuccess: (product, variables) => {
            updateDetailsCache(variables.comboId, (current) => ({
                ...current,
                name: product.name,
                description: product.description,
                price: product.price,
            }))
            refresh(variables.comboId)
            notify.success({ title: 'Combo actualizado', description: 'Se guardaron los cambios.' })
        },
    })

    return {
        create: createMutation,
        addIncluded: addIncludedMutation,
        removeIncluded: removeIncludedMutation,
        createGroup: createGroupMutation,
        updateGroup: updateGroupMutation,
        deleteGroup: deleteGroupMutation,
        addChoice: addChoiceMutation,
        removeChoice: removeChoiceMutation,
        updateDetails: updateDetailsMutation,
    }
}
