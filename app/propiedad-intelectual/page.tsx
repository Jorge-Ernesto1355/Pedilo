import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Propiedad Intelectual | Pedilo',
    description: LEGAL_DOCUMENTS.intellectualProperty.description,
}

export default function IntellectualPropertyPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.intellectualProperty} />
}
