import { CreditCard } from 'lucide-react'
import type { PaymentCard } from './paymentCardApi'
import type { ClabeBank } from '@/src/lib/validation/clabe'

export function PaymentCardView({ card, restaurantName, bank }: { card: PaymentCard; restaurantName?: string; bank?: ClabeBank }) {
    const theme = bank?.theme ?? { background: '#12234A', foreground: '#FFFFFF' }
    return <div data-cy="payment-card" style={{ background: theme.background, color: theme.foreground }} className="rounded-2xl p-5 shadow-[0_18px_45px_-25px_rgba(18,35,74,.7)]">
        <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><CreditCard className="size-4" /> Transferencias</span><span data-cy="payment-card-bank" className="text-xs font-semibold opacity-80">{bank?.name ?? card.bankName}</span></div>
        <p data-cy="payment-card-clabe" className="mt-7 break-all text-xl font-bold tracking-[.12em]">{card.clabe}</p>
        <div className="mt-5 grid grid-cols-2 gap-4 text-xs"><span><span className="block text-white/60">Beneficiario</span><strong data-cy="payment-card-beneficiary" className="mt-1 block break-words">{card.beneficiaryName}</strong></span><span><span className="block text-white/60">Negocio</span><strong data-cy="payment-card-restaurant" className="mt-1 block break-words">{restaurantName ?? 'Restaurante'}</strong></span></div>
    </div>
}
