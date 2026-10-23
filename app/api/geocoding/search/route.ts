import { NextResponse } from 'next/server'

const NOMINATIM_ENDPOINT =
    process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org/search'

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] })
    }

    try {
        const results = await requestNominatim(query)
        if (results.length > 0 || /méxico|mexico/i.test(query)) {
            return NextResponse.json({ results })
        }

        return NextResponse.json({ results: await requestNominatim(`${query}, México`) })
    } catch (error) {
        console.error('Location search failed', error)
        return NextResponse.json(
            { error: 'No se pudieron cargar las ubicaciones.' },
            { status: 502 },
        )
    }
}

async function requestNominatim(query: string) {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '5',
        addressdetails: '1',
        countrycodes: 'mx',
    })
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
        headers: {
            Accept: 'application/json',
            'Accept-Language': 'es-MX,es;q=0.9',
            'User-Agent': 'Pedilo restaurant location search',
        },
        next: { revalidate: 300 },
    })

    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`)
    return response.json()
}
