import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Términos para Restaurantes | Pedilo',
    description: LEGAL_DOCUMENTS.restaurantTerms.description,
}

export default function RestaurantTermsPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.restaurantTerms} />
}
