'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sileo } from 'sileo'
import { productQueryKeys } from '../product-management/useProductManagement'
import {
    createOption,
    createOptionGroup,
    deleteOption,
    deleteOptionGroup,
    getOption,
    getOptionGroup,
    getOptionGroups,
    getOptions,
    reorderOptionGroups,
    reorderOptions,
    updateOption,
    updateOptionGroup,
    updateOptionGroupStatus,
    updateOptionStatus,
} from './optionApi'
import type {
    OptionGroup,
    OptionGroupInput,
    OptionGroupUpdateInput,
    OptionInput,
    OptionUpdateInput,
    ProductOption,
} from './option.types'

export const optionQueryKeys = {
    all: ['option-groups'] as const,
    groups: (productId: string) => ['option-groups', 'product', productId] as const,
    group: (id: string) => ['option-groups', 'detail', id] as const,
    options: (groupId: string) => ['options', 'group', groupId] as const,
    option: (id: string) => ['options', 'detail', id] as const,
}

export function useOptionGroups(productId: string | null) {
    return useQuery({
        queryKey: productId
            ? optionQueryKeys.groups(productId)
            : ['option-groups', 'product', 'none'],
        queryFn: () => getOptionGroups(productId as string),
        enabled: Boolean(productId),
    })
}

export function useOptionGroup(id: string | null) {
    return useQuery({
        queryKey: id ? optionQueryKeys.group(id) : ['option-groups', 'detail', 'none'],
        queryFn: () => getOptionGroup(id as string),
        enabled: Boolean(id),
    })
}

export function useOptions(optionGroupId: string | null) {
    return useQuery({
        queryKey: optionGroupId
            ? optionQueryKeys.options(optionGroupId)
            : ['options', 'group', 'none'],
        queryFn: () => getOptions(optionGroupId as string),
        enabled: Boolean(optionGroupId),
    })
}

export function useOption(id: string | null) {
    return useQuery({
        queryKey: id ? optionQueryKeys.option(id) : ['options', 'detail', 'none'],
        queryFn: () => getOption(id as string),
        enabled: Boolean(id),
    })
}

export function useOptionManagement() {
    const queryClient = useQueryClient()
    const invalidateProduct = (productId?: string) => {
        if (productId)
            void queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) })
    }
    const invalidateGroup = (groupId?: string, productId?: string) => {
        if (groupId)
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.options(groupId) })
        if (groupId)
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.group(groupId) })
        invalidateProduct(productId)
    }

    const createGroup = useMutation({
        mutationFn: ({ productId, input }: { productId: string; input: OptionGroupInput }) =>
            createOptionGroup(productId, input),
        onSuccess: (_, v) => {
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.groups(v.productId) })
            invalidateProduct(v.productId)
            sileo.success({ title: 'Grupo creado' })
        },
    })
    const updateGroup = useMutation({
        mutationFn: (variables: {
            optionGroupId: string
            productId: string
            input: OptionGroupUpdateInput
        }) => updateOptionGroup(variables.productId, variables.optionGroupId, variables.input),
        onSuccess: (_, v) => {
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.groups(v.productId) })
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.group(v.optionGroupId) })
            invalidateProduct(v.productId)
            sileo.success({ title: 'Grupo actualizado' })
        },
    })
    const statusGroup = useMutation({
        mutationFn: (variables: { optionGroupId: string; productId: string; isActive: boolean }) =>
            updateOptionGroupStatus(variables.optionGroupId, variables.isActive),
        onSuccess: (_, v) => {
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.groups(v.productId) })
            invalidateProduct(v.productId)
        },
    })
    const removeGroup = useMutation({
        mutationFn: (variables: { optionGroupId: string; productId: string }) =>
            deleteOptionGroup(variables.optionGroupId),
        onSuccess: (_, v) => {
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.groups(v.productId) })
            invalidateProduct(v.productId)
            sileo.success({ title: 'Grupo eliminado' })
        },
    })
    const reorderGroups = useMutation({
        mutationFn: ({
            productId,
            optionGroupIds,
        }: {
            productId: string
            optionGroupIds: string[]
        }) => reorderOptionGroups(productId, optionGroupIds),
        onMutate: async ({ productId, optionGroupIds }) => {
            const key = optionQueryKeys.groups(productId)
            await queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<OptionGroup[]>(key)
            if (previous)
                queryClient.setQueryData(
                    key,
                    optionGroupIds
                        .map((id) => previous.find((group) => group.id === id))
                        .filter((group): group is OptionGroup => Boolean(group)),
                )
            return { key, previous }
        },
        onError: (_, __, context) => {
            if (context?.previous) queryClient.setQueryData(context.key, context.previous)
            sileo.error({ title: 'No se pudo reordenar los grupos' })
        },
        onSettled: (_, __, v) => {
            void queryClient.invalidateQueries({ queryKey: optionQueryKeys.groups(v.productId) })
            invalidateProduct(v.productId)
        },
    })

    const createOpt = useMutation({
        mutationFn: ({
            optionGroupId,
            input,
        }: {
            optionGroupId: string
            productId: string
            input: OptionInput
        }) => createOption(optionGroupId, input),
        onSuccess: (_, v) => {
            invalidateGroup(v.optionGroupId, v.productId)
            sileo.success({ title: 'Opción creada' })
        },
    })
    const updateOpt = useMutation({
        mutationFn: ({
            optionId,
            input,
        }: {
            optionId: string
            optionGroupId: string
            productId: string
            input: OptionUpdateInput
        }) => updateOption(optionId, input),
        onSuccess: (_, v) => {
            invalidateGroup(v.optionGroupId, v.productId)
            sileo.success({ title: 'Opción actualizada' })
        },
    })
    const statusOpt = useMutation({
        mutationFn: ({
            optionId,
            isAvailable,
        }: {
            optionId: string
            optionGroupId: string
            productId: string
            isAvailable: boolean
        }) => updateOptionStatus(optionId, isAvailable),
        onSuccess: (_, v) => invalidateGroup(v.optionGroupId, v.productId),
    })
    const removeOpt = useMutation({
        mutationFn: ({
            optionId,
        }: {
            optionId: string
            optionGroupId: string
            productId: string
        }) => deleteOption(optionId),
        onSuccess: (_, v) => {
            invalidateGroup(v.optionGroupId, v.productId)
            sileo.success({ title: 'Opción eliminada' })
        },
    })
    const reorderOpts = useMutation({
        mutationFn: ({
            optionGroupId,
            optionIds,
        }: {
            optionGroupId: string
            productId: string
            optionIds: string[]
        }) => reorderOptions(optionGroupId, optionIds),
        onMutate: async ({ optionGroupId, optionIds }) => {
            const key = optionQueryKeys.options(optionGroupId)
            await queryClient.cancelQueries({ queryKey: key })
            const previous = queryClient.getQueryData<ProductOption[]>(key)
            if (previous)
                queryClient.setQueryData(
                    key,
                    optionIds
                        .map((id) => previous.find((option) => option.id === id))
                        .filter((option): option is ProductOption => Boolean(option)),
                )
            return { key, previous }
        },
        onError: (_, __, context) => {
            if (context?.previous) queryClient.setQueryData(context.key, context.previous)
            sileo.error({ title: 'No se pudo reordenar las opciones' })
        },
        onSettled: (_, __, v) => {
            void queryClient.invalidateQueries({
                queryKey: optionQueryKeys.options(v.optionGroupId),
            })
            invalidateProduct(v.productId)
        },
    })

    return {
        createGroup,
        updateGroup,
        statusGroup,
        removeGroup,
        reorderGroups,
        createOpt,
        updateOpt,
        statusOpt,
        removeOpt,
        reorderOpts,
    }
}
