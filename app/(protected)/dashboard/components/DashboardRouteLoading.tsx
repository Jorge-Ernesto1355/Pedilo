'use client'

import { usePathname } from 'next/navigation'
import { AccountSkeleton } from '../account/AccountSkeleton'
import {
    CustomersSkeleton,
    InsightsSkeleton,
    OrdersSkeleton,
    OverviewSkeleton,
    ProductsSkeleton,
    SalesSkeleton,
} from './DashboardSkeletons'
import { DiscountsPageSkeleton } from './DashboardSkeletons'

export function DashboardRouteLoading() {
    const pathname = usePathname()

    if (pathname === '/dashboard' || pathname === '/dashboard/') return <OverviewSkeleton />
    if (pathname.startsWith('/dashboard/sales')) return <SalesSkeleton />
    if (pathname.startsWith('/dashboard/orders')) return <OrdersSkeleton />
    if (pathname.startsWith('/dashboard/customers')) return <CustomersSkeleton />
    if (pathname.startsWith('/dashboard/products')) return <ProductsSkeleton />
    if (pathname.startsWith('/dashboard/discounts')) return <DiscountsPageSkeleton />
    if (pathname.startsWith('/dashboard/insights')) return <InsightsSkeleton />
    if (pathname.startsWith('/dashboard/account')) return <AccountSkeleton />

    return <OverviewSkeleton />
}
