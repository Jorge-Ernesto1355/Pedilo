'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import posthog from 'posthog-js'
import type { User } from '@/lib/auth/getSession'
import { useAuthStore } from '@/store/authStore'
import type { CurrentBusiness } from '@/app/(protected)/create-menu/features/business-profile/useCurrentBusiness'

interface AuthHydrationProps {
    user: User
    initialBusiness?: CurrentBusiness | null
    children: ReactNode
}

export function AuthHydration({ user, initialBusiness = null, children }: AuthHydrationProps) {
    const queryClient = useQueryClient()
    const setUser = useAuthStore((state) => state.setUser)
    const currentUser = useAuthStore((state) => state.user)
    const currentUserId = currentUser?.id ?? null
    const identifiedUserId = useRef<string | null>(null)
    const initialIdentity = { ...user, businessId: initialBusiness?.id ?? user.businessId ?? null }

    // Seed both stores before descendants render. This prevents every enabled
    // query from waiting for the post-mount hydration effect.
    if (
        currentUserId !== initialIdentity.id ||
        currentUser?.businessId !== initialIdentity.businessId
    ) {
        useAuthStore.setState({ user: initialIdentity })
        queryClient.setQueryData(['business', 'mine', initialIdentity.id], initialBusiness)
    }

    useEffect(() => {
        if (identifiedUserId.current === user.id) return

        if (identifiedUserId.current !== null) {
            posthog.reset()
        }

        posthog.identify(user.id, {
            email: user.email,
            name: user.name,
        })
        identifiedUserId.current = user.id
    }, [user.email, user.id, user.name])

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

    // Keep the protected shell mounted while Zustand hydrates. Data hooks remain
    // disabled until the store has the authenticated user, while the navbar and
    // page fallbacks provide continuous visual feedback.
    return children
}
