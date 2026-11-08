import { DashboardNavSkeleton } from '@/components/AppLoadingSkeleton'
import { OverviewSkeleton } from './dashboard/components/DashboardSkeletons'

export default function Loading() {
    return <><DashboardNavSkeleton /><OverviewSkeleton /></>
}
