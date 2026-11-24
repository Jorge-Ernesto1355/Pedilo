'use client'

import { Gift } from 'lucide-react'
import type { MenuLoyalty } from './useMenuLoyalty'

const money = (value: number) => value.toLocaleString('es-MX', { minimumFractionDigits: 2 })

/**
 * Bloque de la tarjeta de lealtad en el checkout. No pide datos nuevos al cliente:
 * - Con premio disponible: interruptor "Usar mi premio".
 * - Sin premio: una línea sutil con los sellos que faltan.
 * - Sin llave de tarjeta en este navegador: no muestra nada.
 */
export function CheckoutLoyaltyPanel({ loyalty }: { loyalty: MenuLoyalty }) {
    const { program, quote, reward } = loyalty
    if (!program || !quote || !quote.programActive) return null

    const remaining = Math.max(
        0,
        quote.card.stampsRequired - Math.min(quote.card.stampsCount, quote.card.stampsRequired),
    )

    return (
        <div data-cy="checkout-loyalty" className="mt-3 space-y-2">
            {reward && loyalty.usable ? (
                <label
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#1E40AF]/20 ${
                        loyalty.useReward
                            ? 'border-[#1E40AF] bg-[#EEF3FF]'
                            : 'border-[#DCE5F3] bg-white'
                    }`}
                >
                    <input
                        type="checkbox"
                        role="switch"
                        aria-checked={loyalty.useReward}
                        data-cy="checkout-loyalty-toggle"
                        checked={loyalty.useReward}
                        onChange={(event) => loyalty.setUseReward(event.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-[#1E40AF]"
                    />
                    <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-bold text-[#12234A]">
                            <Gift className="size-4 shrink-0 text-[#2451C5]" aria-hidden="true" />
                            Usar mi premio: {reward.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#65738A]">
                            {quote.freeProduct
                                ? `Se agrega ${quote.freeProduct.name} a tu pedido sin costo.`
                                : `Ahorras $${money(quote.discount)} en este pedido.`}
                            {reward.expiresAt
                                ? ` Vence el ${new Date(reward.expiresAt).toLocaleDateString('es-MX')}.`
                                : ''}
                        </span>
                    </span>
                </label>
            ) : reward && quote.unavailableReason === 'PRODUCT_UNAVAILABLE' ? (
                <p
                    data-cy="checkout-loyalty-unavailable"
                    className="rounded-xl bg-[#F7F9FD] px-3.5 py-2.5 text-xs text-[#53647D]"
                >
                    Tu premio ({reward.label}) no está disponible hoy porque el producto se agotó.
                    Lo conservas para tu siguiente pedido.
                </p>
            ) : (
                <p data-cy="checkout-loyalty-progress" className="px-1 text-xs text-[#65738A]">
                    {remaining === 1
                        ? 'Te falta 1 sello para tu premio.'
                        : `Te faltan ${remaining} sellos para tu premio.`}
                </p>
            )}
            {loyalty.change ? (
                <div
                    data-cy="checkout-loyalty-changed"
                    role="alert"
                    className="rounded-xl border border-[#F1C46A] bg-[#FFF9E8] px-3 py-3"
                >
                    <p className="text-sm font-bold text-[#8A5A00]">
                        Tu premio cambió mientras hacías tu pedido
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8A5A00]">
                        {loyalty.change.currentDiscount > 0
                            ? `El descuento ahora es $${money(loyalty.change.currentDiscount)} (antes $${money(loyalty.change.expectedDiscount)}).`
                            : 'Ya no se puede aplicar a este pedido.'}{' '}
                        Tu pedido no se envió: revisa el total y confírmalo de nuevo.
                    </p>
                </div>
            ) : null}
        </div>
    )
}
