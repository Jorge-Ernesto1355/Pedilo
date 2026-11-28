'use client'

import { createContext, use, useEffect, useRef, type ReactNode } from 'react'
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

// Id del usuario autenticado de este request. A diferencia del store de zustand (que en
// el servidor y durante la hidratación siempre devuelve su estado inicial), el contexto
// tiene el valor correcto en SSR y no se comparte entre requests.
const AuthenticatedUserIdContext = createContext<string | null>(null)

export function useAuthenticatedUserId() {
    return use(AuthenticatedUserIdContext)
}

export function AuthHydration({ user, initialBusiness, children }: AuthHydrationProps) {
    const queryClient = useQueryClient()
    const setUser = useAuthStore((state) => state.setUser)
    const currentUser = useAuthStore((state) => state.user)
    const currentUserId = currentUser?.id ?? null
    const identifiedUserId = useRef<string | null>(null)
    // Usuario que había en el store antes de hidratar. Durante SSR/hidratación zustand
    // devuelve su estado inicial (null), así que en una carga completa vale null.
    const lastHydratedUserId = useRef<string | null>(currentUserId)
    // El servidor puede responder sin negocio justo después de crearlo (sesión o lectura
    // con datos previos). Para el mismo usuario nunca se pierde un negocio ya conocido en
    // el cliente: no existe borrado de negocios, así que un `null` posterior es obsoleto y
    // dejaría sin `businessId` a las acciones que dependen de él (p. ej. crear un menú).
    const knownBusinessId = currentUserId === user.id ? (currentUser?.businessId ?? null) : null
    const serverBusinessId = initialBusiness?.id ?? user.businessId ?? null
    const keepKnownBusiness = serverBusinessId === null && knownBusinessId !== null
    const initialIdentity = { ...user, businessId: serverBusinessId ?? knownBusinessId }

    // Seed both stores before descendants render. This prevents every enabled
    // query from waiting for the post-mount hydration effect.
    if (
        currentUserId !== initialIdentity.id ||
        currentUser?.businessId !== initialIdentity.businessId
    ) {
        useAuthStore.setState({ user: initialIdentity })
        // `undefined` means the server did not resolve the business. Do not cache it as
        // `null`: the client query has infinite stale time and would consequently never
        // fetch the actual business (hiding business-scoped panels such as global groups).
        if (initialBusiness !== undefined && !keepKnownBusiness) {
            queryClient.setQueryData(['business', 'mine', initialIdentity.id], initialBusiness)
        }
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
        // Drop every cached result when the identity changes from one account to
        // another. This also cancels placeholder/previous data from the other user.
        // On a full load there is no previous account (the store starts empty and
        // logout already clears the cache); clearing there wiped the data seeded from
        // the server (business, dashboard KPIs) and forced every request to repeat.
        if (lastHydratedUserId.current !== null && lastHydratedUserId.current !== user.id) {
            queryClient.clear()
        }
        lastHydratedUserId.current = user.id
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
    return <AuthenticatedUserIdContext value={user.id}>{children}</AuthenticatedUserIdContext>
}
