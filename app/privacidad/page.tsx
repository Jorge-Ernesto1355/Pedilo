import type { Metadata } from 'next'
import { LegalDocumentPage, LEGAL_DOCUMENTS } from '@/app/legal/LegalDocumentPage'

export const metadata: Metadata = {
    title: 'Aviso de Privacidad | Pedilo',
    description: LEGAL_DOCUMENTS.privacy.description,
}

export default function PrivacyPage() {
    return <LegalDocumentPage document={LEGAL_DOCUMENTS.privacy} />
}
