import fs from 'node:fs'
import path from 'node:path'
import type { ReactNode } from 'react'
import { LegalPageLayout } from './LegalPageLayout'

export const LEGAL_DOCUMENTS = {
    privacy: { file: 'aviso-privacidad.md', title: 'Aviso de Privacidad', description: 'Aviso de Privacidad Integral de Pedilo.' },
    clientTerms: { file: 'terminos-clientes.md', title: 'Términos y Condiciones para Clientes', description: 'Términos y Condiciones para Clientes de Pedilo.' },
    restaurantTerms: { file: 'terminos-restaurantes.md', title: 'Términos y Condiciones para Restaurantes', description: 'Términos y Condiciones para Restaurantes de Pedilo.' },
    arco: { file: 'procedimiento-arco.md', title: 'Procedimiento ARCO', description: 'Procedimiento para el ejercicio de derechos ARCO en Pedilo.' },
    products: { file: 'productos-y-contenido.md', title: 'Productos y Contenido', description: 'Política de Productos y Contenido de Pedilo.' },
    intellectualProperty: { file: 'propiedad-intelectual.md', title: 'Propiedad Intelectual', description: 'Política de Propiedad Intelectual de Pedilo.' },
    marketing: { file: 'marketing.md', title: 'Comunicaciones Comerciales y Marketing', description: 'Política de Comunicaciones Comerciales y Marketing de Pedilo.' },
} as const

type LegalDocument = (typeof LEGAL_DOCUMENTS)[keyof typeof LEGAL_DOCUMENTS]

function readLegalDocument(file: string) {
    return fs.readFileSync(path.join(process.cwd(), 'docs', 'legal', file), 'utf8')
}

function renderInline(text: string): ReactNode {
    const parts = text.split(/(soporte@pedilo\.mx|privacidad@pedilo\.mx)/g)
    return parts.map((part, index) => {
        if (part === 'soporte@pedilo.mx' || part === 'privacidad@pedilo.mx') {
            return <a key={`${part}-${index}`} href={`mailto:${part}`} className="font-semibold text-[#2451C5] underline underline-offset-2">{part}</a>
        }
        return part
    })
}

function MarkdownDocument({ source }: { source: string }) {
    const lines = source.replaceAll('\r\n', '\n').split('\n')
    const blocks: ReactNode[] = []
    let paragraph: string[] = []
    let unordered: string[] = []
    let ordered: string[] = []
    let lastContentEndedWithColon = false

    const flushParagraph = () => {
        if (paragraph.length === 0) return
        blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInline(paragraph.join(' '))}</p>)
        paragraph = []
    }

    const flushLists = () => {
        if (unordered.length > 0) {
            blocks.push(<ul key={`unordered-${blocks.length}`} className="list-disc space-y-1 pl-5">{unordered.map((item, index) => <li key={`${item}-${index}`}>{renderInline(item)}</li>)}</ul>)
            unordered = []
        }
        if (ordered.length > 0) {
            blocks.push(<ol key={`ordered-${blocks.length}`} className="list-decimal space-y-1 pl-5">{ordered.map((item, index) => <li key={`${item}-${index}`}>{renderInline(item)}</li>)}</ol>)
            ordered = []
        }
    }

    const flushText = () => { flushParagraph(); flushLists() }

    lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) { flushText(); return }
        if (trimmed === '⸻') { flushText(); blocks.push(<hr key={`rule-${index}`} className="border-[#DCE5F3]" />); return }

        const unorderedMatch = trimmed.match(/^-\s+(.*)$/)
        if (unorderedMatch) { flushParagraph(); unordered.push(unorderedMatch[1]); return }

        const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
        if (orderedMatch && (paragraph.at(-1)?.endsWith(':') || lastContentEndedWithColon || ordered.length > 0)) {
            flushParagraph()
            ordered.push(orderedMatch[1])
            lastContentEndedWithColon = false
            return
        }

        const headingMatch = trimmed.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/)
        if (headingMatch) {
            flushText()
            const Heading = headingMatch[1].includes('.') ? 'h3' : 'h2'
            blocks.push(<Heading key={`heading-${index}`} className="font-display text-xl tracking-[-.035em] text-[#12234A]">{renderInline(`${headingMatch[1]}. ${headingMatch[2]}`)}</Heading>)
            return
        }

        if (index === 0) {
            flushText()
            blocks.push(<p key="document-title" className="font-display text-2xl font-semibold tracking-[-.04em] text-[#10224A]">{renderInline(trimmed)}</p>)
            return
        }
        paragraph.push(trimmed)
        lastContentEndedWithColon = trimmed.endsWith(':')
    })
    flushText()
    return <div className="space-y-5">{blocks}</div>
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
    const source = readLegalDocument(document.file)
    return (
        <LegalPageLayout eyebrow="Documento legal" title={document.title} description={document.description}>
            {source ? <MarkdownDocument source={source} /> : <div className="rounded-xl border border-dashed border-[#D9B873] bg-[#FFF9EC] px-4 py-3 text-sm leading-6 text-[#765A20]">El documento fuente todavía no contiene texto publicado.</div>}
        </LegalPageLayout>
    )
}
