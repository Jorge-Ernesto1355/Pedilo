'use client'

import { ExternalLink, MapPinned } from 'lucide-react'
import type { LocationCoordinates } from './location.schema'

type ViewOnMapsButtonProps = { coordinates: LocationCoordinates | null }

export function ViewOnMapsButton({ coordinates }: ViewOnMapsButtonProps) {
    if (!coordinates) return null
    const href = `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2451C5] transition hover:text-[#183991] hover:underline"><MapPinned className="size-3.5" />Ver en Google Maps <ExternalLink className="size-3" /></a>
}
