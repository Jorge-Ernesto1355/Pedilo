import type { ReactNode } from 'react'
import { DashboardNav } from './DashboardNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return <div className="dashboard-shell min-h-screen"><DashboardNav />{children}</div>
}
