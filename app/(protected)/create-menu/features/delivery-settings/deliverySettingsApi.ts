import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'

export type DeliveryCoordinates = { latitude: number; longitude: number }
export type DistanceTier = { upToKm: number; fee: number }
export type DeliveryFeeConfig = { type: 'DISTANCE_TIERS'; tiers: DistanceTier[] }

export type DeliverySettings = {
    enabled: boolean
    origin: DeliveryCoordinates | null
    maxDeliveryKm: number | null
    feeConfig: DeliveryFeeConfig | null
    /** Factor de ruta del backend (distancia = línea recta × factor). */
    routeFactor: number
}

export type SaveDeliverySettingsInput = {
    enabled: boolean
    maxDeliveryKm: number | null
    feeConfig: DeliveryFeeConfig | null
    origin?: DeliveryCoordinates
}

export const deliverySettingsQueryKey = ['delivery-settings'] as const

const credentials = { withCredentials: true }

async function request<T>(call: () => Promise<{ data: T }>) {
    try {
        return (await call()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export function getDeliverySettings() {
    return request(() =>
        apiClient.get<{ deliverySettings: DeliverySettings }>(
            '/businesses/delivery-settings',
            credentials,
        ),
    )
}

export function saveDeliverySettings(input: SaveDeliverySettingsInput) {
    return request(() =>
        apiClient.put<{ deliverySettings: DeliverySettings }>(
            '/businesses/delivery-settings',
            input,
            credentials,
        ),
    )
}
