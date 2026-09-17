import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthHydration } from "@/components/AuthHydration";
import { getSession } from "@/lib/auth/getSession";
import { DashboardNav } from "@/app/(protected)/dashboard/DashboardNav";
import { RedirectedUrls } from "@/src/lib/RedirectUrls";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await getSession();

  // Esta verificación server-side es la protección real y funciona sin JavaScript.
  if (!user) {
    redirect(RedirectedUrls.login);
  }

  return (
    <AuthHydration user={user}>
      <div className="dashboard-shell min-h-screen">
        <DashboardNav />
        {children}
      </div>
    </AuthHydration>
  );
}
