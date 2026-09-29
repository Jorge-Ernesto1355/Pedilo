import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Marketing | Pedilo',
    description: LEGAL_DOCUMENTS.marketing.description,
}

export default function MarketingPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.marketing} />
}
