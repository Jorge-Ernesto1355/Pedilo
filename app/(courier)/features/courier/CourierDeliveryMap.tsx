'use client'

// Se carga con dynamic(): Leaflet solo se descarga cuando hay una entrega que mostrar.
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Coordinates } from './courierApi'

type CourierDeliveryMapProps = {
    destination: Coordinates
    /** Solo mientras va por el pedido: el mapa encuadra restaurante y cliente. */
    restaurant: Coordinates | null
}

/** Encuadra solo cuando cambian los puntos (no en cada actualización de la entrega). */
function FitPoints({ destination, restaurant }: CourierDeliveryMapProps) {
    const map = useMap()
    const { latitude, longitude } = destination
    const restaurantLatitude = restaurant?.latitude ?? null
    const restaurantLongitude = restaurant?.longitude ?? null
    useEffect(() => {
        if (restaurantLatitude === null || restaurantLongitude === null) {
            map.setView([latitude, longitude], 16)
            return
        }
        map.fitBounds(
            [
                [latitude, longitude],
                [restaurantLatitude, restaurantLongitude],
            ],
            { padding: [32, 32], maxZoom: 16 },
        )
    }, [map, latitude, longitude, restaurantLatitude, restaurantLongitude])
    return null
}

export function CourierDeliveryMap({ destination, restaurant }: CourierDeliveryMapProps) {
    return (
        <MapContainer
            center={[destination.latitude, destination.longitude]}
            zoom={15}
            scrollWheelZoom={false}
            className="h-52 w-full"
        >
            <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitPoints destination={destination} restaurant={restaurant} />
            {restaurant && (
                <CircleMarker
                    center={[restaurant.latitude, restaurant.longitude]}
                    radius={8}
                    pathOptions={{
                        color: '#2438A8',
                        weight: 3,
                        fillColor: '#FFFFFF',
                        fillOpacity: 1,
                    }}
                >
                    <Tooltip>Restaurante</Tooltip>
                </CircleMarker>
            )}
            <Marker position={[destination.latitude, destination.longitude]}>
                <Tooltip>Cliente</Tooltip>
            </Marker>
        </MapContainer>
    )
}
