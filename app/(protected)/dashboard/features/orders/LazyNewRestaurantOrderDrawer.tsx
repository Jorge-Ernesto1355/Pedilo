'use client'

import { lazy, Suspense } from 'react'
import { NewRestaurantOrderDrawerSkeleton } from './NewRestaurantOrderDrawerSkeleton'

const NewRestaurantOrderDrawer = lazy(() =>
    import('./NewRestaurantOrderDrawer').then((module) => ({
        default: module.NewRestaurantOrderDrawer,
    })),
)

export function LazyNewRestaurantOrderDrawer({
    open,
    onClose,
}: {
    open: boolean
    onClose: () => void
}) {
    return (
        <Suspense fallback={<NewRestaurantOrderDrawerSkeleton />}>
            <NewRestaurantOrderDrawer open={open} onClose={onClose} />
        </Suspense>
    )
}
