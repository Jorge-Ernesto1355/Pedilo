'use client'

import { lazy, Suspense, useState, type ComponentProps } from 'react'
import {
    IngredientFormModalSkeleton,
    InventorySettingsModalSkeleton,
    MovementHistoryModalSkeleton,
    MovementModalSkeleton,
} from './InventoryModalSkeletons'

const IngredientFormModal = lazy(() =>
    import('./IngredientFormModal').then((m) => ({ default: m.IngredientFormModal })),
)
const MovementModal = lazy(() =>
    import('./MovementModal').then((m) => ({ default: m.MovementModal })),
)
const MovementHistoryModal = lazy(() =>
    import('./MovementHistoryModal').then((m) => ({ default: m.MovementHistoryModal })),
)
const InventorySettingsModal = lazy(() =>
    import('./InventorySettingsModal').then((m) => ({ default: m.InventorySettingsModal })),
)

// Each wrapper renders nothing until its modal is first opened, so the chunk only
// downloads on demand and a skeleton shows while it loads. After that it stays
// mounted so the modal's exit animation still plays on close.

function useOpenedOnce(open: boolean) {
    const [opened, setOpened] = useState(open)
    if (open && !opened) setOpened(true)
    return opened || open
}

export function LazyIngredientFormModal(props: ComponentProps<typeof IngredientFormModal>) {
    if (!useOpenedOnce(props.open)) return null
    return (
        <Suspense
            fallback={
                <IngredientFormModalSkeleton
                    ingredient={props.ingredient}
                    onClose={props.onClose}
                />
            }
        >
            <IngredientFormModal {...props} />
        </Suspense>
    )
}

export function LazyMovementModal(props: ComponentProps<typeof MovementModal>) {
    if (!useOpenedOnce(props.open)) return null
    return (
        <Suspense
            fallback={
                <MovementModalSkeleton ingredient={props.ingredient} onClose={props.onClose} />
            }
        >
            <MovementModal {...props} />
        </Suspense>
    )
}

export function LazyMovementHistoryModal(props: ComponentProps<typeof MovementHistoryModal>) {
    if (!useOpenedOnce(props.ingredient !== null)) return null
    return (
        <Suspense
            fallback={
                <MovementHistoryModalSkeleton
                    ingredient={props.ingredient}
                    onClose={props.onClose}
                />
            }
        >
            <MovementHistoryModal {...props} />
        </Suspense>
    )
}

export function LazyInventorySettingsModal(props: ComponentProps<typeof InventorySettingsModal>) {
    if (!useOpenedOnce(props.open)) return null
    return (
        <Suspense fallback={<InventorySettingsModalSkeleton onClose={props.onClose} />}>
            <InventorySettingsModal {...props} />
        </Suspense>
    )
}
