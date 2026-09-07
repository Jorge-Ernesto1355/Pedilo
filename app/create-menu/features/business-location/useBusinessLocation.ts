'use client'

import { useState } from 'react'
import { locationCoordinatesSchema, type LocationCoordinates } from './location.schema'

export function useBusinessLocation(initialLocation: LocationCoordinates | null = null) {
    const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(initialLocation)
    const [isOpen, setIsOpen] = useState(false)

    function saveLocation(value: LocationCoordinates) {
        const parsed = locationCoordinatesSchema.safeParse(value)
        if (!parsed.success) return
        setCoordinates(parsed.data)
        setIsOpen(false)
    }

    return { coordinates, isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), saveLocation }
}
