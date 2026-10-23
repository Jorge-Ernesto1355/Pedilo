'use client'

import { useCallback, useEffect, useState } from 'react'

export type NominatimResult = {
    place_id: number
    display_name: string
    lat: string
    lon: string
    address?: {
        city?: string
        town?: string
        village?: string
        locality?: string
        hamlet?: string
        city_district?: string
        municipality?: string
        county?: string
        state_district?: string
        state?: string
        region?: string
        country?: string
        country_code?: string
    }
}

export function formatLocationResult(result: NominatimResult) {
    const address = result.address
    const locality =
        address?.city ??
        address?.town ??
        address?.village ??
        address?.locality ??
        address?.hamlet ??
        address?.city_district
    const municipality = address?.municipality ?? address?.county ?? address?.state_district
    const state = address?.state ?? address?.region
    const parts = [locality, municipality, state].filter(
        (part, index, values): part is string => {
            if (!part?.trim()) return false
            const normalizedPart = part.trim().toLocaleLowerCase()
            return (
                values.findIndex(
                    (value) => value?.trim().toLocaleLowerCase() === normalizedPart,
                ) === index
            )
        },
    )

    return parts.length >= 2 ? parts.join(', ') : null
}

function normalizeResults(results: NominatimResult[]) {
    const seen = new Set<string>()

    return results.filter((result) => {
        const formatted = formatLocationResult(result)
        if (!formatted) return false

        const key = formatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

async function searchNominatim(query: string, signal?: AbortSignal) {
    const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
        signal,
    })
    if (!response.ok) throw new Error(`Location search returned ${response.status}`)

    const payload = (await response.json()) as { results?: NominatimResult[] }
    return normalizeResults(payload.results ?? [])
}

export function useNominatimSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<NominatimResult[]>([])
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle')

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
        if (normalizedQuery.length < 2) {
            const clearTimer = window.setTimeout(() => {
                setResults([])
                setStatus('idle')
            }, 0)
            return () => window.clearTimeout(clearTimer)
        }

        const controller = new AbortController()
        const timer = window.setTimeout(() => {
            setStatus('loading')
            setResults([])
            void searchNominatim(normalizedQuery, controller.signal)
                .then((matches) => {
                    setResults(matches)
                    setStatus(matches.length > 0 ? 'success' : 'empty')
                })
                .catch((error: unknown) => {
                    if (error instanceof DOMException && error.name === 'AbortError') return
                    if (controller.signal.aborted) return
                    setResults([])
                    setStatus('error')
                })
                .finally(() => {
                    if (controller.signal.aborted) setStatus('idle')
                })
        }, 600)

        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [query])

    return {
        query,
        setQuery,
        results,
        status,
        isSearching: status === 'loading',
        searchError: status === 'error',
        geocode,
    }
}

// Nominatim is intentionally used only for light browser traffic here. Production
// traffic should go through a self-hosted Nominatim instance or paid geocoding fallback.
