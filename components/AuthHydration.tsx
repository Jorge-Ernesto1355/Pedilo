"use client";

import { useEffect, type ReactNode } from "react";
import type { User } from "@/lib/auth/getSession";
import { useAuthStore } from "@/store/authStore";

interface AuthHydrationProps {
  user: User;
  children: ReactNode;
}

export function AuthHydration({ user, children }: AuthHydrationProps) {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    setUser(user);
  }, [setUser, user]);

  return children;
}
