import { cache } from 'react'
import type { Metadata } from 'next'
import PublicMenuPage from '@/app/menu/[slug]/PublicMenuPage'
import {
    getPublicBusinessCatalog,
    getPublicBusinessDiscounts,
} from '@/app/menu/[slug]/features/public-menu/publicCatalogApi'
import type { PublicMenuInitialData } from '@/app/menu/[slug]/features/public-menu/useBusinessMenu'

// Shared by generateMetadata and the page so each request hits the API once.
const loadCatalog = cache((slug: string) => getPublicBusinessCatalog(slug))
const loadDiscounts = cache((slug: string) => getPublicBusinessDiscounts(slug))

async function loadInitialData(slug: string): Promise<PublicMenuInitialData | undefined> {
    // Discounts only need the slug, so start both requests together instead of
    // waiting for the catalog first. A discounts failure is optional: the
    // client retries on its own.
    const discountsRequest = loadDiscounts(slug).catch(() => undefined)
    try {
        const catalog = await loadCatalog(slug)
        const hasEmbeddedDiscounts = catalog.menus.some((menu) =>
            menu.categories.some((category) => category.products.some((product) => product.discount)),
        )
        const discounts = hasEmbeddedDiscounts ? undefined : await discountsRequest
        return { catalog, discounts, fetchedAt: Date.now() }
    } catch {
        // Missing business or API error: let the client query surface the error state.
        return undefined
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    try {
        const { business } = await loadCatalog(slug)
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
    const initialData = await loadInitialData(slug)
    return <PublicMenuPage slug={slug} initialData={initialData} />
}
