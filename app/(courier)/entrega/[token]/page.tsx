import type { Metadata } from 'next'
import { CourierDeliveryPage } from '../../features/courier/CourierDeliveryPage'

// Link personal del repartidor que tomó la entrega. Sobrevive recargas: el token va en la URL.
export const metadata: Metadata = {
    title: 'Tu entrega | Pedilo',
    robots: { index: false, follow: false },
}

export default async function CourierDeliveryRoute({ params }: PageProps<'/entrega/[token]'>) {
    const { token } = await params
    return <CourierDeliveryPage token={token} />
}
