import { DashboardOverview } from '@/app/(protected)/dashboard/features/dashboard-overview/DashboardOverview'
import { requireCurrentBusiness } from '@/lib/auth/getBusiness'

export default async function DashboardPage() {
    await requireCurrentBusiness()
    return <DashboardOverview />
}
