import type { ReactNode } from 'react'
import { requireCurrentBusiness } from '@/lib/auth/getBusiness'

export default async function SalesLayout({ children }: { children: ReactNode }) {
    await requireCurrentBusiness()
    return children
}
