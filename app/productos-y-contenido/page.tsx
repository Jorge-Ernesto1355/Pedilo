import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Productos y Contenido | Pedilo',
    description: LEGAL_DOCUMENTS.products.description,
}

export default function ProductsAndContentPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.products} />
}
