import BusinessSetupScreen from './BusinessSetupScreen'

type CreateMenuPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function CreateMenuPage({ searchParams }: CreateMenuPageProps) {
    const params = searchParams ? await searchParams : undefined
    const notice = Array.isArray(params?.notice) ? params.notice[0] : params?.notice

    return <BusinessSetupScreen businessRequiredNotice={notice === 'business-required'} />
}
