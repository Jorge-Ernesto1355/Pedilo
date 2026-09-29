import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Procedimiento ARCO | Pedilo',
    description: LEGAL_DOCUMENTS.arco.description,
}

export default function ArcoPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.arco} />
}
