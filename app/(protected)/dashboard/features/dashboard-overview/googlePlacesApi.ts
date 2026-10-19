import { ApiError, normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'

export type GooglePlaceResult = {
    placeId: string
    name: string
    address: string
    rating: number | null
    totalReviews: number | null
    googleMapsUrl: string
}

export type GooglePlaceRating = {
    placeId: string
    name?: string
    rating: number | null
    totalReviews: number | null
    googleMapsUrl: string
}

export type GooglePlaceConnection = {
    placeId: string
    name: string
    googleMapsUrl: string
}

type ApiEnvelope<T> = { data: T }

const credentials = { withCredentials: true }

function isNullableNumber(value: unknown) {
    return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

function isGoogleMapsUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false
    try {
        const url = new URL(value)
        return (
            url.protocol === 'https:' &&
            (url.hostname === 'google.com' ||
                url.hostname.endsWith('.google.com') ||
                url.hostname === 'maps.app.goo.gl')
        )
    } catch {
        return false
    }
}

function isGooglePlaceResult(value: unknown): value is GooglePlaceResult {
    if (!value || typeof value !== 'object') return false
    const place = value as Partial<GooglePlaceResult>
    return (
        typeof place.placeId === 'string' &&
        place.placeId.length > 0 &&
        typeof place.name === 'string' &&
        typeof place.address === 'string' &&
        isNullableNumber(place.rating) &&
        isNullableNumber(place.totalReviews) &&
        isGoogleMapsUrl(place.googleMapsUrl)
    )
}

function readEnvelope<T>(
    value: unknown,
    isData: (data: unknown) => data is T,
): value is ApiEnvelope<T> {
    return Boolean(value && typeof value === 'object' && 'data' in value && isData(value.data))
}

function isPlaceConnection(value: unknown): value is GooglePlaceConnection {
    if (!value || typeof value !== 'object') return false
    const connection = value as Partial<GooglePlaceConnection>
    return (
        typeof connection.placeId === 'string' &&
        typeof connection.name === 'string' &&
        isGoogleMapsUrl(connection.googleMapsUrl)
    )
}

function isPlaceRating(value: unknown): value is GooglePlaceRating {
    if (!value || typeof value !== 'object') return false
    const place = value as Partial<GooglePlaceRating>
    return (
        typeof place.placeId === 'string' &&
        isNullableNumber(place.rating) &&
        isNullableNumber(place.totalReviews) &&
        isGoogleMapsUrl(place.googleMapsUrl) &&
        (place.name === undefined || typeof place.name === 'string')
    )
}

async function request<T>(
    callback: () => Promise<{ data: T }>,
    validate: (value: unknown) => value is T,
) {
    try {
        const { data } = await callback()
        if (!validate(data)) throw new Error('Google Places response is incomplete.')
        return data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export function searchGooglePlaces(query: string, location: string) {
    return request(
        () =>
            apiClient.get<ApiEnvelope<GooglePlaceResult[]>>('/businesses/google-reviews/search', {
                ...credentials,
                params: { query, ...(location ? { location } : {}) },
            }),
        (value): value is ApiEnvelope<GooglePlaceResult[]> =>
            readEnvelope(
                value,
                (data): data is GooglePlaceResult[] =>
                    Array.isArray(data) && data.every(isGooglePlaceResult),
            ),
    )
}

export function connectGooglePlace(placeId: string) {
    return request(
        () =>
            apiClient.post<ApiEnvelope<GooglePlaceConnection>>(
                '/businesses/google-reviews/connect',
                { placeId },
                credentials,
            ),
        (value): value is ApiEnvelope<GooglePlaceConnection> =>
            readEnvelope(value, isPlaceConnection),
    )
}

export function getGooglePlaceRating() {
    return request(
        () =>
            apiClient.get<ApiEnvelope<GooglePlaceRating>>(
                '/businesses/google-reviews/rating',
                credentials,
            ),
        (value): value is ApiEnvelope<GooglePlaceRating> => readEnvelope(value, isPlaceRating),
    )
}

export function disconnectGooglePlace() {
    return request(
        () =>
            apiClient.delete<{ success: boolean }>(
                '/businesses/google-reviews/connect',
                credentials,
            ),
        (value): value is { success: boolean } =>
            Boolean(
                value && typeof value === 'object' && 'success' in value && value.success === true,
            ),
    )
}

export function isPlaceNotLinkedError(error: unknown) {
    return error instanceof ApiError && error.code === 'GOOGLE_PLACE_NOT_LINKED'
}

export function googlePlacesErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) return fallback
    if (error.code === 'NOT_AUTHENTICATED' || error.status === 401) {
        return 'Tu sesión terminó. Inicia sesión de nuevo para gestionar Google Reviews.'
    }
    if (error.code === 'FORBIDDEN' || error.status === 403) {
        return 'Solo la persona propietaria del negocio puede vincular Google Maps.'
    }
    if (error.code === 'BUSINESS_NOT_FOUND') return 'No encontramos un negocio para esta cuenta.'
    if (error.code === 'GOOGLE_PLACE_NOT_FOUND')
        return 'No encontramos ese establecimiento en Google Maps.'
    if (error.code === 'GOOGLE_PLACE_CONFLICT' || error.status === 409) {
        return 'Este establecimiento ya está vinculado a otro negocio.'
    }
    if (error.code === 'GOOGLE_PLACES_RATE_LIMITED' || error.status === 429) {
        return 'Google Maps recibió demasiadas solicitudes. Inténtalo de nuevo en unos minutos.'
    }
    if (
        error.code === 'GOOGLE_PLACES_NOT_CONFIGURED' ||
        error.code === 'GOOGLE_PLACES_UPSTREAM_ERROR'
    ) {
        return 'Google Maps no está disponible en este momento. Inténtalo de nuevo más tarde.'
    }
    return fallback
}
