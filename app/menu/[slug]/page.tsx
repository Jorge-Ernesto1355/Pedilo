import { redirect } from 'next/navigation'

export default async function LegacyMenuPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    redirect(`/${encodeURIComponent(slug)}`)
}
