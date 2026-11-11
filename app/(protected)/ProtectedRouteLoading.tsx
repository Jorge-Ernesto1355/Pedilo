'use client'

import { usePathname } from 'next/navigation'
import { DashboardNavSkeleton } from '@/components/AppLoadingSkeleton'
import { CreateMenuPageSkeleton } from './create-menu/components/CreateMenuStates'
import { DashboardRouteLoading } from './dashboard/components/DashboardRouteLoading'

export function ProtectedRouteLoading() {
    const pathname = usePathname()

    if (pathname.startsWith('/create-menu')) {
        return (
            <>
                <DashboardNavSkeleton />
                <CreateMenuPageSkeleton />
            </>
        )
    }

    return (
        <>
            <DashboardNavSkeleton />
            <DashboardRouteLoading />
        </>
    )
}
