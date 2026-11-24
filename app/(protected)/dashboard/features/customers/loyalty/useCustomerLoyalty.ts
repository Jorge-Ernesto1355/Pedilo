'use client'

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import {
    getLoyaltyCard,
    getLoyaltyProgram,
    getLoyaltySummary,
    giveWalkInStamp,
    listLoyaltyCards,
    loyaltyErrorMessage,
    loyaltyQueryKeys,
    redeemLoyaltyReward,
    rotateLoyaltyCardToken,
    voidLoyaltyStamp,
    type LoyaltyCardFilter,
    type LoyaltyCardList,
    type LoyaltyStampResult,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import { notify } from '@/src/lib/notifications/notify'

/** Programa del restaurante; la tarjeta solo se muestra si existe y está activo. */
export function useLoyaltyProgram() {
    const query = useQuery({
        queryKey: loyaltyQueryKeys.program,
        queryFn: getLoyaltyProgram,
        staleTime: 60_000,
    })
    const program = query.data
    return { ...query, active: Boolean(program?.exists && program.enabled) }
}

export function useLoyaltySummary(enabled: boolean) {
    return useQuery({
        queryKey: loyaltyQueryKeys.summary,
        queryFn: getLoyaltySummary,
        enabled,
        staleTime: 15_000,
    })
}

/** Avance de los clientes visibles en la página: UNA petición para todos (sin N+1). */
export function useLoyaltyCardsFor(customerIds: string[], enabled: boolean) {
    const ids = [...customerIds].sort()
    return useQuery({
        queryKey: loyaltyQueryKeys.cards({ customerIds: ids }),
        queryFn: () => listLoyaltyCards({ customerIds: ids, limit: 100 }),
        enabled: enabled && ids.length > 0,
        staleTime: 15_000,
    })
}

/** Lista filtrada ("Cerca del premio" / "Con premio disponible"). */
export function useFilteredLoyaltyCards(
    filter: LoyaltyCardFilter,
    search: string,
    page: number,
    enabled: boolean,
) {
    return useQuery({
        queryKey: loyaltyQueryKeys.cards({ filter, search, page }),
        queryFn: () => listLoyaltyCards({ filter, search, page, limit: 10 }),
        enabled: enabled && filter !== 'all',
        placeholderData: (previous) => previous,
    })
}

export function useLoyaltyCardDetail(customerId: string | null) {
    return useQuery({
        queryKey: loyaltyQueryKeys.card(customerId ?? ''),
        queryFn: () => getLoyaltyCard(customerId!),
        enabled: Boolean(customerId),
    })
}

type CardListSnapshot = Array<[QueryKey, LoyaltyCardList | undefined]>

/** Aplica el sello esperado a las listas en caché (actualización optimista). */
function optimisticStamp(
    list: LoyaltyCardList | undefined,
    customerId: string,
): LoyaltyCardList | undefined {
    if (!list) return list
    return {
        ...list,
        cards: list.cards.map((card) => {
            if (card.customer.id !== customerId) return card
            const next = card.stampsCount + 1
            return next >= list.stampsRequired
                ? {
                      ...card,
                      stampsCount: 0,
                      cyclesCompleted: card.cyclesCompleted + 1,
                      availableRewards: card.availableRewards + 1,
                  }
                : { ...card, stampsCount: next }
        }),
    }
}

export function stampToastTitle(result: LoyaltyStampResult) {
    const who = result.customerFirstName ?? 'tu cliente'
    if (result.reward) return `${who} completó su tarjeta, premio disponible`
    return `Sello dado a ${who} (${result.stamp.position} de ${result.card.stampsRequired})`
}

/**
 * Acciones de lealtad desde Clientes. Bloquean el botón mientras corren (el servidor
 * igual es idempotente), actualizan la interfaz al instante y revierten si fallan.
 */
export function useLoyaltyActions() {
    const client = useQueryClient()

    const refresh = (customerId: string) => {
        void client.invalidateQueries({ queryKey: ['loyalty', 'cards'] })
        void client.invalidateQueries({ queryKey: loyaltyQueryKeys.card(customerId) })
        void client.invalidateQueries({ queryKey: loyaltyQueryKeys.summary })
    }

    const stamp = useMutation({
        mutationFn: ({ customerId, note }: { customerId: string; note: string | null }) =>
            giveWalkInStamp(customerId, note),
        onMutate: async ({ customerId }) => {
            await client.cancelQueries({ queryKey: ['loyalty', 'cards'] })
            const snapshot: CardListSnapshot = client.getQueriesData<LoyaltyCardList>({
                queryKey: ['loyalty', 'cards'],
            })
            client.setQueriesData<LoyaltyCardList>({ queryKey: ['loyalty', 'cards'] }, (list) =>
                optimisticStamp(list, customerId),
            )
            return { snapshot }
        },
        onError: (error, variables, context) => {
            context?.snapshot.forEach(([key, value]) => client.setQueryData(key, value))
            notify.error({
                title: 'No se pudo dar el sello',
                description: loyaltyErrorMessage(error),
                dedupeKey: `loyalty-stamp-error-${variables.customerId}`,
            })
        },
        onSuccess: (result) => notify.success({ title: stampToastTitle(result) }),
        onSettled: (_data, _error, variables) => refresh(variables.customerId),
    })

    const redeem = useMutation({
        mutationFn: ({ rewardId }: { rewardId: string; customerId: string }) =>
            redeemLoyaltyReward(rewardId),
        onSuccess: (result) =>
            notify.success({ title: 'Premio canjeado', description: result.reward.label }),
        onError: (error) =>
            notify.error({
                title: 'No se pudo canjear el premio',
                description: loyaltyErrorMessage(error),
            }),
        onSettled: (_data, _error, variables) => refresh(variables.customerId),
    })

    const voidStamp = useMutation({
        mutationFn: ({
            stampId,
            reason,
        }: {
            stampId: string
            reason: string
            customerId: string
        }) => voidLoyaltyStamp(stampId, reason),
        onSuccess: (result) =>
            notify.success({
                title: 'Sello anulado',
                description: result.voidedRewardId
                    ? 'También se anuló el premio que había generado.'
                    : undefined,
            }),
        onError: (error) =>
            notify.error({
                title: 'No se pudo anular el sello',
                description: loyaltyErrorMessage(error),
            }),
        onSettled: (_data, _error, variables) => refresh(variables.customerId),
    })

    const rotate = useMutation({
        mutationFn: ({ customerId }: { customerId: string }) => rotateLoyaltyCardToken(customerId),
        onSuccess: () =>
            notify.success({
                title: 'Link regenerado',
                description: 'El link anterior ya no funciona.',
            }),
        onError: (error) =>
            notify.error({
                title: 'No se pudo regenerar el link',
                description: loyaltyErrorMessage(error),
            }),
        onSettled: (_data, _error, variables) => refresh(variables.customerId),
    })

    return { stamp, redeem, voidStamp, rotate }
}
