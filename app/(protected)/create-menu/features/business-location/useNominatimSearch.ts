'use client'

import { useCallback, useEffect, useState } from 'react'

export type NominatimResult = {
    place_id: number
    display_name: string
    lat: string
    lon: string
}

async function searchNominatim(query: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', addressdetails: '1' })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { Accept: 'application/json', 'Accept-Language': 'es' },
        referrerPolicy: 'origin',
        signal,
    })
    if (!response.ok) throw new Error('Nominatim search failed')
    return response.json() as Promise<NominatimResult[]>
}

export function useNominatimSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<NominatimResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState(false)

    const geocode = useCallback(async (value: string) => {
        if (!value.trim()) return null
        try {
            const matches = await searchNominatim(value.trim())
            return matches[0] ?? null
        } catch {
            return null
        }
    }, [])

    useEffect(() => {
        const normalizedQuery = query.trim()
        if (normalizedQuery.length < 3) {
            const clearTimer = window.setTimeout(() => {
                setResults([])
                setIsSearching(false)
            }, 0)
            return () => window.clearTimeout(clearTimer)
        }

        const controller = new AbortController()
        const timer = window.setTimeout(() => {
            setIsSearching(true)
            setSearchError(false)
            void searchNominatim(normalizedQuery, controller.signal).then((matches) => {
                setResults(matches)
            }).catch((error: unknown) => {
                if (error instanceof DOMException && error.name === 'AbortError') return
                if (controller.signal.aborted) return
                setResults([])
                setSearchError(true)
            }).finally(() => {
                if (!controller.signal.aborted) setIsSearching(false)
            })
        }, 600)

        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [query])

    return { query, setQuery, results, isSearching, searchError, geocode }
}

// Nominatim is intentionally used only for light browser traffic here. Production
// traffic should go through a self-hosted Nominatim instance or paid geocoding fallback.
