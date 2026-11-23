import type { Metadata } from 'next'
import { PublicLoyaltyCardScreen } from '../PublicLoyaltyCardScreen'

// Link privado de la tarjeta de lealtad del cliente (sin cuenta). noindex, no-store y
// no-referrer también van como cabeceras HTTP en next.config.ts.
// Siempre al momento (nunca prerenderizada ni cacheada): es un link privado.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Mi tarjeta de lealtad | Pedilo',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
}

export default async function PublicLoyaltyCardRoute({ params }: PageProps<'/tarjeta/[token]'>) {
    const { token } = await params
    return <PublicLoyaltyCardScreen token={token} />
}
