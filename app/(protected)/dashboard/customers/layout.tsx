import type { ReactNode } from 'react'
import { requireCurrentBusiness } from '@/lib/auth/getBusiness'

export default async function CustomersLayout({ children }: { children: ReactNode }) {
    await requireCurrentBusiness()
    return children
}
