import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentBusiness } from '@/lib/auth/getBusiness'
import { RedirectedUrls } from '@/src/lib/RedirectUrls'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const business = await getCurrentBusiness()

    if (!business.exists && !business.unavailable) {
        redirect(`${RedirectedUrls.createMenu}?notice=business-required`)
    }

    return children
}
