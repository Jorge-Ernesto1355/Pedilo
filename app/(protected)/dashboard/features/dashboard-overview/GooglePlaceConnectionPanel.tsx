'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { ExternalLink, LoaderCircle, MapPin, RefreshCw, Search, Star, Unlink } from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import {
    googlePlacesErrorMessage,
    isPlaceNotLinkedError,
    type GooglePlaceRating,
    type GooglePlaceResult,
} from './googlePlacesApi'
import {
    useConnectGooglePlace,
    useDisconnectGooglePlace,
    useGooglePlaceRating,
    useGooglePlaceSearch,
} from './useGooglePlaces'

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10 disabled:cursor-not-allowed disabled:bg-[#F5F8FC]'

type CachedPlaceName = { placeId: string; name: string }

export function GooglePlaceConnectionPanel() {
    const ratingQuery = useGooglePlaceRating()
    const isNotLinked = isPlaceNotLinkedError(ratingQuery.error)

    return (
        <section
            className="mt-4 rounded-xl border border-[#E7ECF4] bg-[#FBFCFE] p-3.5 sm:p-4"
            aria-label="Establecimiento de Google Maps"
        >
            {ratingQuery.isPending ? (
                <div
                    className="flex min-h-24 items-center justify-center gap-2 text-sm text-[#65738A]"
                    aria-live="polite"
                >
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Consultando Google Maps…
                </div>
            ) : ratingQuery.isError && isNotLinked ? (
                <ConnectPlaceForm />
            ) : ratingQuery.isError ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p role="alert" className="text-sm leading-5 text-[#8D4A3D]">
                        {googlePlacesErrorMessage(
                            ratingQuery.error,
                            'No pudimos consultar el establecimiento de Google Maps.',
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={() => void ratingQuery.refetch()}
                        disabled={ratingQuery.isFetching}
                        className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-[#D7E1EF] bg-white px-3 py-2 text-xs font-semibold text-[#243556] hover:bg-[#F5F8FC] disabled:opacity-60"
                    >
                        {ratingQuery.isFetching ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="size-3.5" />
                        )}
                        Reintentar
                    </button>
                </div>
            ) : ratingQuery.data ? (
                <ConnectedPlace
                    rating={ratingQuery.data.data}
                    isRefreshing={ratingQuery.isFetching}
                    onRefresh={() => void ratingQuery.refetch()}
                />
            ) : (
                <div className="text-sm text-[#65738A]">
                    No hay información de Google Maps disponible.
                </div>
            )}
        </section>
    )
}

function ConnectedPlace({
    rating,
    isRefreshing,
    onRefresh,
}: {
    rating: GooglePlaceRating
    isRefreshing: boolean
    onRefresh: () => void
}) {
    const businessId = useAuthStore((state) => state.user?.businessId)
    const storageKey = businessId ? `pedilo:google-place-name:${businessId}` : null
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            function handleStorage(event: StorageEvent) {
                if (event.key === storageKey || event.key === null) onStoreChange()
            }
            window.addEventListener('storage', handleStorage)
            return () => window.removeEventListener('storage', handleStorage)
        },
        [storageKey],
    )
    const getSnapshot = useCallback(() => {
        if (!storageKey) return null
        try {
            return localStorage.getItem(storageKey)
        } catch {
            return null
        }
    }, [storageKey])
    const cachedNameValue = useSyncExternalStore(subscribe, getSnapshot, () => null)
    const cachedName = useMemo(() => parseCachedPlaceName(cachedNameValue), [cachedNameValue])
    const [confirmDisconnect, setConfirmDisconnect] = useState(false)
    const disconnect = useDisconnectGooglePlace()
    const displayName =
        rating.name || (cachedName?.placeId === rating.placeId ? cachedName.name : null)

    function confirmRemove() {
        disconnect.mutate()
    }

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                        <MapPin className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#65738A]">
                            Establecimiento vinculado
                        </p>
                        <h3 className="mt-0.5 truncate text-sm font-semibold text-[#12234A]">
                            {displayName ?? 'Nombre no disponible'}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#65738A]">
                            <span className="inline-flex items-center gap-1 font-semibold text-[#8A6410]">
                                <Star
                                    className="size-3.5 fill-[#E9B949] text-[#E9B949]"
                                    aria-hidden="true"
                                />
                                {rating.rating === null
                                    ? 'Sin calificación'
                                    : `${formatDecimal(rating.rating)} / 5`}
                            </span>
                            <span>
                                {rating.totalReviews === null
                                    ? 'Reseñas no disponibles'
                                    : `${formatCount(rating.totalReviews)} reseñas en Google Maps`}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <a
                        href={rating.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#1E40AF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E40AF]/30"
                    >
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        Abrir Google Maps
                    </a>
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#D7E1EF] bg-white px-3 py-2 text-xs font-semibold text-[#243556] hover:bg-[#F5F8FC] disabled:cursor-wait disabled:opacity-60"
                    >
                        {isRefreshing ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                        )}
                        {isRefreshing ? 'Actualizando…' : 'Actualizar'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmDisconnect(true)}
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#E7D3D0] bg-white px-3 py-2 text-xs font-semibold text-[#8D4A3D] hover:bg-[#FFF8F7]"
                    >
                        <Unlink className="size-3.5" aria-hidden="true" />
                        Desvincular
                    </button>
                </div>
            </div>
            <Modal
                open={confirmDisconnect}
                title="Desvincular Google Maps"
                description="Dejarás de ver la calificación y el total de reseñas de este establecimiento en el dashboard."
                onClose={() => !disconnect.isPending && setConfirmDisconnect(false)}
                closeDisabled={disconnect.isPending}
                footer={
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => setConfirmDisconnect(false)}
                            disabled={disconnect.isPending}
                            className="min-h-10 rounded-xl px-4 py-2 text-sm font-semibold text-[#65738A] hover:bg-[#F5F8FC] disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmRemove}
                            disabled={disconnect.isPending}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#9A3D3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#843232] disabled:opacity-60"
                        >
                            {disconnect.isPending && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            Sí, desvincular
                        </button>
                    </div>
                }
            >
                {disconnect.isError && (
                    <div
                        className="mb-4 rounded-xl border border-[#F0D7D7] bg-[#FFF9F9] p-3"
                        role="alert"
                    >
                        <p className="text-sm text-[#9A3D3D]">
                            {googlePlacesErrorMessage(
                                disconnect.error,
                                'No pudimos desvincular Google Maps. Inténtalo de nuevo.',
                            )}
                        </p>
                        <button
                            type="button"
                            onClick={confirmRemove}
                            disabled={disconnect.isPending}
                            className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E7D3D0] bg-white px-3 py-2 text-xs font-semibold text-[#8D4A3D] disabled:opacity-60"
                        >
                            <RefreshCw className="size-3.5" /> Reintentar desvinculación
                        </button>
                    </div>
                )}
            </Modal>
        </>
    )
}

function ConnectPlaceForm() {
    const [businessName, setBusinessName] = useState('')
    const [location, setLocation] = useState('')
    const [searchTerms, setSearchTerms] = useState<{ query: string; location: string } | null>(null)
    const [selectedPlace, setSelectedPlace] = useState<GooglePlaceResult | null>(null)
    const search = useGooglePlaceSearch(
        searchTerms?.query ?? '',
        searchTerms?.location ?? '',
        Boolean(searchTerms),
    )
    const connect = useConnectGooglePlace()
    function submitSearch(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const query = businessName.trim()
        connect.reset()
        if (!query) {
            setSearchTerms(null)
            return
        }
        setSelectedPlace(null)
        setSearchTerms({ query, location: location.trim() })
    }

    function submitConnection() {
        if (!selectedPlace || connect.isPending) return
        connect.mutate(selectedPlace.placeId)
    }

    return (
        <div>
            <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EAF0FF] text-[#2451C5]">
                    <MapPin className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                    <h3 className="text-sm font-semibold text-[#12234A]">
                        Vincula tu establecimiento
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[#65738A]">
                        Busca el perfil público del negocio para mostrar su calificación y reseñas
                        reales de Google Maps.
                    </p>
                </div>
            </div>

            <form
                onSubmit={submitSearch}
                className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
                <label className="block text-xs font-semibold text-[#52627B]">
                    Nombre del establecimiento
                    <input
                        value={businessName}
                        onChange={(event) => {
                            setBusinessName(event.target.value)
                            setSearchTerms(null)
                            setSelectedPlace(null)
                            connect.reset()
                        }}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Ej. Café Central"
                        maxLength={200}
                        required
                    />
                </label>
                <label className="block text-xs font-semibold text-[#52627B]">
                    Ciudad o ubicación
                    <input
                        value={location}
                        onChange={(event) => {
                            setLocation(event.target.value)
                            setSearchTerms(null)
                            setSelectedPlace(null)
                            connect.reset()
                        }}
                        className={`${inputClass} mt-1.5`}
                        placeholder="Ej. Mazatlán, Sinaloa"
                        maxLength={200}
                    />
                </label>
                <button
                    type="submit"
                    disabled={search.isFetching || !businessName.trim()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#183991] disabled:cursor-wait disabled:opacity-60"
                >
                    {search.isFetching ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <Search className="size-4" />
                    )}
                    Buscar
                </button>
            </form>

            {search.isError && (
                <div
                    className="mt-3 flex flex-col gap-2 rounded-xl border border-[#F0D7D7] bg-[#FFF9F9] p-3 sm:flex-row sm:items-center sm:justify-between"
                    role="alert"
                >
                    <p className="text-sm text-[#9A3D3D]">
                        {googlePlacesErrorMessage(
                            search.error,
                            'No pudimos buscar establecimientos. Revisa los datos e inténtalo de nuevo.',
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={() => void search.refetch()}
                        disabled={search.isFetching}
                        className="inline-flex min-h-9 shrink-0 items-center gap-2 self-start rounded-lg border border-[#E7D3D0] bg-white px-3 py-2 text-xs font-semibold text-[#8D4A3D] disabled:opacity-60"
                    >
                        <RefreshCw className="size-3.5" /> Reintentar búsqueda
                    </button>
                </div>
            )}

            {search.isSuccess && search.data.data.length === 0 && (
                <div className="mt-3 rounded-xl border border-dashed border-[#D7E1EF] bg-white px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-[#243556]">
                        No encontramos establecimientos
                    </p>
                    <p className="mt-1 text-xs text-[#7A879A]">
                        Prueba con otro nombre o agrega una ubicación más específica.
                    </p>
                </div>
            )}

            {search.isSuccess && search.data.data.length > 0 && (
                <div className="mt-3 space-y-2" aria-label="Resultados de Google Maps">
                    {search.data.data.map((place) => (
                        <PlaceResult
                            key={place.placeId}
                            place={place}
                            selected={selectedPlace?.placeId === place.placeId}
                            onSelect={() => {
                                connect.reset()
                                setSelectedPlace(place)
                            }}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={submitConnection}
                        disabled={!selectedPlace || connect.isPending}
                        className="mt-1 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183991] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {connect.isPending && <LoaderCircle className="size-4 animate-spin" />}
                        {connect.isPending
                            ? 'Vinculando…'
                            : 'Vincular establecimiento seleccionado'}
                    </button>
                </div>
            )}

            {connect.isError && (
                <p
                    role="alert"
                    className="mt-3 rounded-xl border border-[#F0D7D7] bg-[#FFF9F9] p-3 text-sm text-[#9A3D3D]"
                >
                    {googlePlacesErrorMessage(
                        connect.error,
                        'No pudimos vincular el establecimiento. Inténtalo de nuevo.',
                    )}
                </p>
            )}
        </div>
    )
}

function PlaceResult({
    place,
    selected,
    onSelect,
}: {
    place: GooglePlaceResult
    selected: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-[#2451C5] bg-[#F3F6FF] ring-2 ring-[#2451C5]/10' : 'border-[#E1E8F1] bg-white hover:border-[#B9C8DD]'}`}
        >
            <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#2451C5] bg-[#2451C5] text-white' : 'border-[#C6D1E0] bg-white'}`}
            >
                {selected && <span className="size-2 rounded-full bg-white" />}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#12234A]">
                    {place.name}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-[#65738A]">
                    {place.address || 'Dirección no disponible'}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#65738A]">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#8A6410]">
                        <Star className="size-3 fill-[#E9B949] text-[#E9B949]" aria-hidden="true" />
                        {place.rating === null
                            ? 'Sin calificación'
                            : `${formatDecimal(place.rating)} / 5`}
                    </span>
                    <span>
                        {place.totalReviews === null
                            ? 'Reseñas no disponibles'
                            : `${formatCount(place.totalReviews)} reseñas`}
                    </span>
                </span>
            </span>
        </button>
    )
}

function formatCount(value: number) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
}

function formatDecimal(value: number) {
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value)
}

function parseCachedPlaceName(value: string | null): CachedPlaceName | null {
    if (!value) return null
    try {
        const parsed: unknown = JSON.parse(value)
        if (
            parsed &&
            typeof parsed === 'object' &&
            'placeId' in parsed &&
            'name' in parsed &&
            typeof parsed.placeId === 'string' &&
            typeof parsed.name === 'string'
        ) {
            return { placeId: parsed.placeId, name: parsed.name }
        }
    } catch {
        return null
    }
    return null
}
