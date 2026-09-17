"use client";

import { DashboardOverview } from "@/app/(protected)/dashboard/features/dashboard-overview/DashboardOverview";
import { useAuthStore } from "@/store/authStore";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <p className="sr-only">Sesión iniciada como {user?.name}</p>
      <DashboardOverview />
    </>
  );
}
