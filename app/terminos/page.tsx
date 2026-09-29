import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Términos para Clientes | Pedilo',
    description: LEGAL_DOCUMENTS.clientTerms.description,
}

export default function TermsPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.clientTerms} />
}
