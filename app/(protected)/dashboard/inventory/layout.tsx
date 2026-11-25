import type { ReactNode } from 'react'
import { requireCurrentBusiness } from '@/lib/auth/getBusiness'

export default async function InventoryLayout({ children }: { children: ReactNode }) {
    await requireCurrentBusiness()
    return children
}
