'use client'

import 'leaflet-defaulticon-compatibility'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet'
import type { LocationCoordinates } from './location.schema'
import { useEffect } from 'react'

type LeafletLocationMapProps = { center: LocationCoordinates; onSelect: (coordinates: LocationCoordinates) => void }

function MapViewport({ center }: { center: LocationCoordinates }) {
    const map = useMap()

    useEffect(() => {
        map.setView([center.latitude, center.longitude], 17, { animate: true })
    }, [center.latitude, center.longitude, map])

    return null
}

function MapClickHandler({ onSelect }: { onSelect: (coordinates: LocationCoordinates) => void }) {
    useMapEvents({
        click: (event: LeafletMouseEvent) => onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    })
    return null
}

export function LeafletLocationMap({ center, onSelect }: LeafletLocationMapProps) {
    const markerPosition: LatLngExpression = [center.latitude, center.longitude]

    return <MapContainer center={markerPosition} zoom={17} scrollWheelZoom className="h-[360px] w-full"><TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapViewport center={center} /><MapClickHandler onSelect={onSelect} /><Marker position={markerPosition} draggable eventHandlers={{ dragend: (event) => { const marker = event.target as { getLatLng: () => { lat: number; lng: number } }; const position = marker.getLatLng(); onSelect({ latitude: position.lat, longitude: position.lng }) } }} /></MapContainer>
}
