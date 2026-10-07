'use client'

import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@/lib/auth/getSession'
import { useAuthStore } from '@/store/authStore'

interface AuthHydrationProps {
    user: User
    children: ReactNode
}

export function AuthHydration({ user, children }: AuthHydrationProps) {
    const queryClient = useQueryClient()
    const setUser = useAuthStore((state) => state.setUser)
    const currentUser = useAuthStore((state) => state.user)
    const currentUserId = currentUser?.id ?? null

    useEffect(() => {
        if (currentUserId !== user.id) {
            // Drop every cached result before rendering the new identity. This also
            // cancels the possibility of placeholder/previous data from another user.
            queryClient.clear()
        }
        const nextUser =
            currentUserId === user.id && currentUser
                ? { ...user, businessId: currentUser.businessId }
                : user
        if (
            !currentUser ||
            currentUser.id !== nextUser.id ||
            currentUser.name !== nextUser.name ||
            currentUser.email !== nextUser.email ||
            currentUser.image !== nextUser.image ||
            currentUser.businessId !== nextUser.businessId
        ) {
            setUser(nextUser)
        }
    }, [currentUser, currentUserId, queryClient, setUser, user])

    return currentUserId === user.id ? children : null
}
