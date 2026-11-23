'use client'

import { useQuery } from '@tanstack/react-query'
import { loyaltyCardLink, loyaltyProgressLine } from '@/app/components/loyalty/loyaltyMessages'
import { getLoyaltyCard, listLoyaltyCards } from '@/app/components/loyalty/loyaltyOwnerApi'
import { displayedStamps } from '@/app/components/loyalty/loyaltyStorage'
import { useLoyaltyProgram } from '../../customers/loyalty/useCustomerLoyalty'

/**
 * Línea "Llevas 5 de 8 sellos. Tu tarjeta: {link}" para los mensajes que el restaurante
 * ya manda al cliente (p. ej. "En camino"). Solo si el cliente YA tiene tarjeta: no se
 * crean tarjetas por mandar un aviso. No se manda ningún mensaje adicional.
 */
export function useLoyaltyMessageLine(customerId: string | null | undefined) {
    const program = useLoyaltyProgram()
    const query = useQuery({
        queryKey: ['loyalty', 'message-line', customerId],
        queryFn: async () => {
            const list = await listLoyaltyCards({ customerIds: [customerId!], limit: 1 })
            if (list.cards.length === 0) return null
            const detail = await getLoyaltyCard(customerId!)
            const rewardAvailable = detail.rewards.some((reward) => reward.status === 'AVAILABLE')
            return loyaltyProgressLine(
                displayedStamps({ ...detail.card, rewardAvailable }),
                detail.card.stampsRequired,
                loyaltyCardLink(detail.card.cardToken),
            )
        },
        enabled: program.active && Boolean(customerId),
        staleTime: 30_000,
        retry: false,
    })
    return program.active ? (query.data ?? null) : null
}
