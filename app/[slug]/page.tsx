import type { Metadata } from 'next'
import PublicMenuPage from '@/app/menu/[slug]/PublicMenuPage'
import { getPublicBusinessCatalog } from '@/app/menu/[slug]/features/public-menu/publicCatalogApi'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    try {
        const { business } = await getPublicBusinessCatalog(slug)
        return {
            title: `${business.name} | Menú`,
            description: business.description ?? `Consulta el menú de ${business.name}.`,
            openGraph: {
                title: `${business.name} | Menú`,
                description: business.description ?? undefined,
                images: business.coverUrl
                    ? [business.coverUrl]
                    : business.logoUrl
                      ? [business.logoUrl]
                      : undefined,
            },
        }
    } catch {
        return { title: 'Menú | Pedilo' }
    }
}

export default async function PublicSlugPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <PublicMenuPage slug={slug} />
}
