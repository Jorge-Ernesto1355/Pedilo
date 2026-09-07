import PublicMenuPage from './PublicMenuPage'

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    return <PublicMenuPage slug={slug} />
}
