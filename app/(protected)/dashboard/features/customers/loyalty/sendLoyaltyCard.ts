'use client'

import type { QueryClient } from '@tanstack/react-query'
import {
    loyaltyCardLink,
    loyaltyCardMessage,
    loyaltyCompletedMessage,
    whatsAppUrl,
} from '@/app/components/loyalty/loyaltyMessages'
import {
    getLoyaltyCard,
    loyaltyQueryKeys,
    type LoyaltyCardDetail,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import { displayedStamps } from '@/app/components/loyalty/loyaltyStorage'
import { notify } from '@/src/lib/notifications/notify'

/** Mensaje de "Enviar tarjeta por WhatsApp" a partir del detalle de la tarjeta. */
export function loyaltyCardWhatsAppUrl(
    detail: LoyaltyCardDetail,
    restaurantName: string,
    programRewardLabel: string,
) {
    const available = detail.rewards.find((reward) => reward.status === 'AVAILABLE')
    const message = loyaltyCardMessage({
        customerName: detail.card.customer.name,
        restaurantName,
        stampsCount: displayedStamps({ ...detail.card, rewardAvailable: Boolean(available) }),
        stampsRequired: detail.card.stampsRequired,
        rewardReady: Boolean(available),
        rewardLabel: available?.label ?? programRewardLabel,
        link: loyaltyCardLink(detail.card.cardToken),
    })
    return whatsAppUrl(detail.card.customer.phone, message)
}

/**
 * Abre WhatsApp con la tarjeta del cliente (o el aviso de tarjeta completada). La ventana
 * se abre en el mismo clic (para que el navegador no la bloquee) y se llena cuando llega
 * el link.
 */
export async function sendLoyaltyCardByWhatsApp(
    client: QueryClient,
    customerId: string,
    restaurantName: string,
    programRewardLabel: string,
    kind: 'card' | 'completed' = 'card',
) {
    const popup = window.open('about:blank', '_blank')
    try {
        const detail = await client.fetchQuery({
            queryKey: loyaltyQueryKeys.card(customerId),
            queryFn: () => getLoyaltyCard(customerId),
            staleTime: 0,
        })
        const url =
            kind === 'completed'
                ? whatsAppUrl(
                      detail.card.customer.phone,
                      loyaltyCompletedMessage({
                          customerName: detail.card.customer.name,
                          restaurantName,
                          rewardLabel:
                              detail.rewards.find((reward) => reward.status === 'AVAILABLE')
                                  ?.label ?? programRewardLabel,
                          link: loyaltyCardLink(detail.card.cardToken),
                      }),
                  )
                : loyaltyCardWhatsAppUrl(detail, restaurantName, programRewardLabel)
        if (!url) throw new Error('missing phone')
        if (popup) {
            popup.opener = null
            popup.location.href = url
        } else {
            window.location.assign(url)
        }
    } catch {
        popup?.close()
        notify.error({
            title: 'No se pudo abrir WhatsApp',
            description: 'Revisa que el cliente tenga un teléfono de 10 dígitos.',
        })
    }
}
