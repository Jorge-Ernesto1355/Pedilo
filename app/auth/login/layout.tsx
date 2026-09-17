import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/getSession";

export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await getSession();

  // La comprobación server-side evita renderizar el login para una sesión ya válida.
  if (user) {
    redirect("/dashboard");
  }

  return children;
}
