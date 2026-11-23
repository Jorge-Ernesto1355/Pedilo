'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
    getPublicLoyaltyProgram,
    isLoyaltyCardNotFound,
    quoteLoyaltyReward,
} from '@/app/components/loyalty/loyaltyPublicApi'
import {
    clearCardToken,
    readCardToken,
    saveCardToken,
} from '@/app/components/loyalty/loyaltyStorage'

export type LoyaltyCheckoutChange = {
    expectedDiscount: number
    currentDiscount: number
    reason: string | null
}

function useDebounced<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs)
        return () => window.clearTimeout(timer)
    }, [value, delayMs])
    return debounced
}

/**
 * Tarjeta de lealtad en el menú público y el checkout.
 * - La llave de la tarjeta vive en el navegador (una por restaurante); nunca se pide el
 *   teléfono para canjear.
 * - El descuento lo calcula el servidor (cotización) y se vuelve a validar al crear el pedido.
 */
export function useMenuLoyalty(slug: string, subtotal: number) {
    const [token, setToken] = useState<string | null>(() =>
        typeof window === 'undefined' ? null : readCardToken(slug),
    )
    const [useReward, setUseReward] = useState(false)
    const [change, setChange] = useState<LoyaltyCheckoutChange | null>(null)
    const quotedSubtotal = useDebounced(Math.round(subtotal * 100) / 100, 250)

    const program = useQuery({
        queryKey: ['public-loyalty-program', slug],
        queryFn: () => getPublicLoyaltyProgram(slug),
        staleTime: 60_000,
        retry: false,
    })

    const quote = useQuery({
        queryKey: ['public-loyalty-quote', slug, token, quotedSubtotal],
        queryFn: async () => {
            try {
                return await quoteLoyaltyReward(slug, token!, quotedSubtotal)
            } catch (error) {
                // Token regenerado, de otro restaurante o inválido: se olvida en silencio.
                if (isLoyaltyCardNotFound(error)) {
                    clearCardToken(slug)
                    return null
                }
                throw error
            }
        },
        enabled: Boolean(token && program.data),
        placeholderData: keepPreviousData,
        retry: false,
        staleTime: 0,
    })

    const data = quote.data ?? null
    const reward = data?.programActive ? data.reward : null
    const usable = Boolean(reward && data && data.discount > 0 && !data.unavailableReason)
    const applied = useReward && usable && quotedSubtotal === Math.round(subtotal * 100) / 100

    return {
        program: program.data ?? null,
        token,
        quote: data,
        reward,
        usable,
        useReward,
        setUseReward: (value: boolean) => {
            setUseReward(value)
            setChange(null)
        },
        applied,
        discount: applied && data ? data.discount : 0,
        freeProduct: applied && data ? data.freeProduct : null,
        /** Datos para el pedido: llave de la tarjeta, premio y descuento que vio el cliente. */
        payload:
            applied && data && reward && token
                ? { cardToken: token, rewardId: reward.id, expectedDiscount: data.discount }
                : undefined,
        quoting: quote.isFetching,
        change,
        /** El premio cambió al crear el pedido: se recalcula y el cliente confirma el nuevo total. */
        markChanged: (next: LoyaltyCheckoutChange) => {
            setChange(next)
            if (next.currentDiscount <= 0) setUseReward(false)
            void quote.refetch()
        },
        /** Cliente nuevo: el servidor le dio su tarjeta; se guarda la llave en este navegador. */
        rememberToken: (value: string) => {
            saveCardToken(slug, value)
            setToken(readCardToken(slug))
        },
        /** Tras un pedido con premio, el premio ya no está disponible. */
        reset: () => {
            setUseReward(false)
            setChange(null)
            void quote.refetch()
        },
    }
}

export type MenuLoyalty = ReturnType<typeof useMenuLoyalty>
