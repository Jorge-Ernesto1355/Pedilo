'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'
import {
    assignGlobalGroupProducts,
    getGlobalOptionGroup,
    getGlobalOptionGroupsForProduct,
    listGlobalOptionGroups,
} from '../option-management/globalOptionApi'

const globalGroupKeys = {
    list: ['global-option-groups', 'list'] as const,
    forProduct: (productId: string) => ['global-option-groups', 'product', productId] as const,
}

/** Adds (or removes) one product from a global group; the API replaces the whole product list. */
export async function setGlobalGroupAssignment(
    groupId: string,
    productId: string,
    assigned: boolean,
) {
    const group = await getGlobalOptionGroup(groupId)
    const without = group.productIds.filter((id) => id !== productId)
    return assignGlobalGroupProducts(
        groupId,
        assigned ? [...without, productId] : without,
        group.version,
    )
}

/**
 * Global option groups that can be applied to a combo. With `comboId` it edits the
 * saved combo; without it, it only collects the ids in `selectedIds` so the parent
 * can assign them once the combo is created.
 */
export function ComboGlobalOptions({
    comboId,
    selectedIds = [],
    onChange,
}: {
    comboId?: string
    selectedIds?: string[]
    onChange?: (ids: string[]) => void
}) {
    const queryClient = useQueryClient()
    const groups = useQuery({ queryKey: globalGroupKeys.list, queryFn: listGlobalOptionGroups })
    const applied = useQuery({
        queryKey: globalGroupKeys.forProduct(comboId ?? 'none'),
        queryFn: () => getGlobalOptionGroupsForProduct(comboId as string),
        enabled: Boolean(comboId),
    })
    const toggle = useMutation({
        mutationFn: ({ groupId, assigned }: { groupId: string; assigned: boolean }) =>
            setGlobalGroupAssignment(groupId, comboId as string, assigned),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['global-option-groups'] })
        },
        onError: (error) =>
            notify.error({
                title: 'No se pudo actualizar la opción global',
                description: friendlyNotificationError(error, 'Inténtalo nuevamente.'),
            }),
    })
    const activeGroups = (groups.data ?? []).filter((group) => group.isActive)
    const appliedById = new Map((applied.data ?? []).map((group) => [group.id, group]))
    const isChecked = (id: string) => (comboId ? appliedById.has(id) : selectedIds.includes(id))

    return (
        <section
            data-testid="combo-global-options"
            aria-labelledby="combo-global-options-title"
            className="rounded-xl border border-[#DCE5F3] bg-white p-4"
        >
            <h3 id="combo-global-options-title" className="text-sm font-bold text-[#243556]">
                Opciones globales
            </h3>
            <p className="mt-1 text-xs text-[#65738A]">
                Extras y variantes que ya creaste una vez. Marca los que el cliente podrá elegir en
                este combo; los administras desde “Opciones globales” del menú.
            </p>
            {groups.isLoading || (comboId && applied.isLoading) ? (
                <div role="status" className="mt-3 flex items-center gap-2 text-xs text-[#65738A]">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Cargando opciones globales…
                </div>
            ) : groups.isError || applied.isError ? (
                <p role="alert" className="mt-3 text-xs text-[#B42318]">
                    No pudimos cargar las opciones globales.{' '}
                    <button
                        type="button"
                        className="font-bold underline"
                        onClick={() => {
                            void groups.refetch()
                            void applied.refetch()
                        }}
                    >
                        Reintentar
                    </button>
                </p>
            ) : activeGroups.length === 0 ? (
                <p className="mt-3 text-xs text-[#8996A9]">
                    Todavía no tienes grupos globales. Créalos en “Opciones globales” y aparecerán
                    aquí.
                </p>
            ) : (
                <ul className="mt-3 space-y-2">
                    {activeGroups.map((group) => {
                        const checked = isChecked(group.id)
                        const options = appliedById.get(group.id)?.options ?? []
                        const pending = toggle.isPending && toggle.variables?.groupId === group.id
                        return (
                            <li
                                key={group.id}
                                className="rounded-lg border border-[#E8EEF6] bg-[#FBFCFE] px-3 py-2.5"
                            >
                                <label className="flex cursor-pointer items-start gap-2.5">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 size-4"
                                        checked={checked}
                                        disabled={pending || (Boolean(comboId) && toggle.isPending)}
                                        onChange={(event) => {
                                            if (comboId)
                                                toggle.mutate({
                                                    groupId: group.id,
                                                    assigned: event.target.checked,
                                                })
                                            else
                                                onChange?.(
                                                    event.target.checked
                                                        ? [...selectedIds, group.id]
                                                        : selectedIds.filter(
                                                              (id) => id !== group.id,
                                                          ),
                                                )
                                        }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-[#243556]">
                                            {group.name}
                                        </span>
                                        <span className="block text-xs text-[#65738A]">
                                            {group.isRequired
                                                ? 'El cliente debe elegir'
                                                : 'Opcional'}
                                            {` · se usa en ${group.productsCount} ${group.productsCount === 1 ? 'producto' : 'productos'}`}
                                        </span>
                                        {checked && options.length > 0 && (
                                            <span className="mt-1 block text-xs text-[#53617A]">
                                                {options
                                                    .map(
                                                        (option) =>
                                                            `${option.name}${Number(option.price) > 0 ? ` +$${Number(option.price).toFixed(2)}` : ''}`,
                                                    )
                                                    .join(' · ')}
                                            </span>
                                        )}
                                    </span>
                                    {pending && (
                                        <LoaderCircle
                                            className="size-4 animate-spin text-[#65738A]"
                                            aria-label="Guardando"
                                        />
                                    )}
                                </label>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
