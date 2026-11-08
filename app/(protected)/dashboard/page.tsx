import { DashboardOverviewProgressive } from '@/app/(protected)/dashboard/features/dashboard-overview/DashboardOverviewProgressive'
import { requireCurrentBusiness } from '@/lib/auth/getBusiness'

export default async function DashboardPage() {
    await requireCurrentBusiness()
    return <DashboardOverviewProgressive todayIso={new Date().toISOString()} />
}
