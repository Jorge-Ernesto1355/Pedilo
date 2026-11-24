'use client'

import { useQuery } from '@tanstack/react-query'
import { Gift, LoaderCircle } from 'lucide-react'
import { getLoyaltyCard, listLoyaltyCards } from '@/app/components/loyalty/loyaltyOwnerApi'
import { useLoyaltyProgram } from '../../customers/loyalty/useCustomerLoyalty'

/** Premio disponible del cliente con ese teléfono (o null). */
async function availableRewardForPhone(phone: string) {
    const list = await listLoyaltyCards({ search: phone, filter: 'reward', limit: 5 })
    const card = list.cards.find((item) => item.customer.phone === phone)
    if (!card) return null
    const detail = await getLoyaltyCard(card.customer.id)
    return detail.rewards.find((reward) => reward.status === 'AVAILABLE') ?? null
}

/**
 * "Aplicar premio" en Nueva orden: si el cliente elegido tiene un premio disponible, se
 * ofrece aplicarlo. El canje lo hace el servidor al crear el pedido (y lo valida ahí).
 */
export function NewOrderLoyaltyReward({
    phone,
    rewardId,
    onChange,
}: {
    phone: string
    rewardId: string | null
    onChange: (rewardId: string | null) => void
}) {
    const program = useLoyaltyProgram()
    const lookupPhone = /^\d{10}$/.test(phone) ? phone : null
    const reward = useQuery({
        queryKey: ['loyalty', 'reward-by-phone', lookupPhone],
        queryFn: () => availableRewardForPhone(lookupPhone!),
        enabled: program.active && Boolean(lookupPhone),
        staleTime: 15_000,
    })
    const available = lookupPhone ? reward.data : null
    // La búsqueda son dos peticiones seguidas: mientras tarda se avisa para que el
    // dueño no confunda "cargando" con "este cliente no tiene premio".
    const searching = Boolean(lookupPhone) && (program.isPending || reward.isLoading)
    if (searching) {
        return (
            <p
                role="status"
                data-cy="new-order-loyalty-loading"
                className="flex min-h-11 items-center gap-2.5 rounded-xl border border-[#D7E1EF] bg-[#F7F9FC] px-3 py-2.5 text-sm font-semibold text-[#53647D]"
            >
                <LoaderCircle
                    className="size-4 shrink-0 animate-spin text-[#2451C5] motion-reduce:animate-none"
                    aria-hidden="true"
                />
                Buscando premio de lealtad…
            </p>
        )
    }
    if (program.active && lookupPhone && reward.isError) {
        return (
            <p
                role="alert"
                data-cy="new-order-loyalty-error"
                className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#F3C2BD] bg-[#FFF3F1] px-3 py-2.5 text-sm text-[#B42318]"
            >
                No pudimos revisar el premio de lealtad.
                <button
                    type="button"
                    onClick={() => void reward.refetch()}
                    className="font-bold underline underline-offset-2"
                >
                    Reintentar
                </button>
            </p>
        )
    }
    if (!program.active || !available) return null
    const applied = rewardId === available.id
    return (
        <label
            data-cy="new-order-loyalty-reward"
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#1E40AF]/20 ${
                applied ? 'border-[#1E40AF] bg-[#EEF3FF]' : 'border-[#D7E1EF] bg-white'
            }`}
        >
            <input
                type="checkbox"
                data-cy="new-order-apply-reward"
                checked={applied}
                onChange={(event) => onChange(event.target.checked ? available.id : null)}
                className="mt-0.5 size-4 shrink-0 accent-[#1E40AF]"
            />
            <span>
                <span className="flex items-center gap-1.5 font-bold text-[#12234A]">
                    <Gift className="size-4 text-[#2451C5]" aria-hidden="true" /> Aplicar premio
                </span>
                <span className="block text-xs text-[#53647D]">
                    {available.label}. El descuento se calcula al guardar la orden.
                </span>
            </span>
        </label>
    )
}
