'use client'

// Se carga con dynamic(): Leaflet solo se descarga si el cliente elige "A domicilio".
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'
import { useEffect } from 'react'
import type { LeafletMouseEvent } from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { DeliveryPin } from './deliveryQuote'

type DeliveryPinMapProps = {
    center: DeliveryPin
    pin: DeliveryPin | null
    onPinChange: (pin: DeliveryPin) => void
}

function FollowPin({ pin }: { pin: DeliveryPin | null }) {
    const map = useMap()
    useEffect(() => {
        if (pin) map.setView([pin.latitude, pin.longitude], Math.max(map.getZoom(), 16))
    }, [map, pin])
    return null
}

function PickOnClick({ onPinChange }: { onPinChange: (pin: DeliveryPin) => void }) {
    useMapEvents({
        click: (event: LeafletMouseEvent) =>
            onPinChange({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    })
    return null
}

export function DeliveryPinMap({ center, pin, onPinChange }: DeliveryPinMapProps) {
    return (
        <MapContainer
            center={[center.latitude, center.longitude]}
            zoom={15}
            scrollWheelZoom={false}
            className="h-56 w-full"
        >
            <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PickOnClick onPinChange={onPinChange} />
            <FollowPin pin={pin} />
            {pin && (
                <Marker
                    position={[pin.latitude, pin.longitude]}
                    draggable
                    eventHandlers={{
                        dragend: (event) => {
                            const marker = event.target as {
                                getLatLng: () => { lat: number; lng: number }
                            }
                            const position = marker.getLatLng()
                            onPinChange({ latitude: position.lat, longitude: position.lng })
                        },
                    }}
                />
            )}
        </MapContainer>
    )
}
