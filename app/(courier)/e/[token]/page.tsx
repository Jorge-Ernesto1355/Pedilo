import type { Metadata } from 'next'
import { CourierOfferPage } from '../../features/courier/CourierOfferPage'

// Oferta pública para repartidores (link compartido por WhatsApp). Sin login.
export const metadata: Metadata = {
    title: 'Entrega disponible | Pedilo',
    robots: { index: false, follow: false },
}

export default async function CourierOfferRoute({ params }: PageProps<'/e/[token]'>) {
    const { token } = await params
    return <CourierOfferPage token={token} />
}
