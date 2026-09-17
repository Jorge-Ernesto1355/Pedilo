'use client'

import { useCallback, useState } from 'react'
import { locationCoordinatesSchema, type LocationCoordinates } from './location.schema'

export function useBusinessLocation(initialLocation: LocationCoordinates | null = null) {
    const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(initialLocation)
    const [isOpen, setIsOpen] = useState(false)

    const saveLocation = useCallback((value: LocationCoordinates) => {
        const parsed = locationCoordinatesSchema.safeParse(value)
        if (!parsed.success) return
        setCoordinates(parsed.data)
        setIsOpen(false)
    }, [])

    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])

    return { coordinates, isOpen, open, close, saveLocation }
}
