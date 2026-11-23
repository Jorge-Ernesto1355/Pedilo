'use client'

// Se carga con dynamic() desde el panel: Leaflet solo se descarga cuando el panel se monta.
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'
import { useEffect } from 'react'
import { latLng } from 'leaflet'
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import type { DeliveryCoordinates } from './deliverySettingsApi'

type DeliveryAreaMapProps = {
    origin: DeliveryCoordinates
    /** Radio en línea recta (km). null si todavía no hay un radio válido. */
    straightRadiusKm: number | null
}

function FitArea({ origin, straightRadiusKm }: DeliveryAreaMapProps) {
    const map = useMap()
    useEffect(() => {
        const center = latLng(origin.latitude, origin.longitude)
        if (straightRadiusKm && straightRadiusKm > 0) {
            map.fitBounds(center.toBounds(straightRadiusKm * 2000), { padding: [12, 12] })
        } else {
            map.setView(center, 15)
        }
    }, [map, origin.latitude, origin.longitude, straightRadiusKm])
    return null
}

export function DeliveryAreaMap({ origin, straightRadiusKm }: DeliveryAreaMapProps) {
    const center: [number, number] = [origin.latitude, origin.longitude]
    return (
        <MapContainer
            center={center}
            zoom={15}
            scrollWheelZoom={false}
            className="h-44 w-full sm:h-56"
        >
            <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={center} />
            {straightRadiusKm && straightRadiusKm > 0 ? (
                <Circle
                    center={center}
                    radius={straightRadiusKm * 1000}
                    pathOptions={{
                        color: '#2451C5',
                        weight: 2,
                        fillColor: '#2451C5',
                        fillOpacity: 0.08,
                    }}
                />
            ) : null}
            <FitArea origin={origin} straightRadiusKm={straightRadiusKm} />
        </MapContainer>
    )
}
