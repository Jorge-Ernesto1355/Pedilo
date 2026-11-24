'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { LoaderCircle, LocateFixed, MapPin } from 'lucide-react'
import { formatMoney } from '../whatsapp'
import {
    DELIVERY_NEIGHBORHOOD_MAX_LENGTH,
    DELIVERY_TEXT_MAX_LENGTH,
    type DeliveryDraft,
    type DeliveryPin,
    type DeliveryQuoteState,
} from './deliveryQuote'

const DeliveryPinMap = dynamic(
    () => import('./DeliveryPinMap').then((module) => module.DeliveryPinMap),
    {
        ssr: false,
        loading: () => (
            <div
                data-cy="delivery-pin-map-loading"
                className="h-56 animate-pulse bg-[#EEF2F8] motion-reduce:animate-none"
            />
        ),
    },
)

/** Centro de respaldo si el restaurante no publicó su ubicación (Mazatlán). */
const FALLBACK_CENTER: DeliveryPin = { latitude: 23.2494, longitude: -106.4111 }

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'

type DeliveryCheckoutFieldsProps = {
    businessName: string
    restaurantLocation: DeliveryPin | null
    value: DeliveryDraft
    onChange: (next: DeliveryDraft) => void
    quote: DeliveryQuoteState
    onRetryQuote: () => void
}

type LocateState = 'idle' | 'locating' | 'denied' | 'failed'

export function DeliveryCheckoutFields({
    businessName,
    restaurantLocation,
    value,
    onChange,
    quote,
    onRetryQuote,
}: DeliveryCheckoutFieldsProps) {
    const [locateState, setLocateState] = useState<LocateState>('idle')
    const geolocationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator

    function setPin(pin: DeliveryPin) {
        setLocateState('idle')
        onChange({ ...value, pin })
    }

    function useMyLocation() {
        if (!geolocationSupported) return
        setLocateState('locating')
        navigator.geolocation.getCurrentPosition(
            (position) =>
                setPin({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }),
            (error) => setLocateState(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
            { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        )
    }

    return (
        <div data-cy="delivery-checkout" className="mt-4 grid gap-3">
            <div>
                <label
                    htmlFor="delivery-address"
                    className="mb-2 block text-sm font-bold text-[#243556]"
                >
                    Dirección de entrega
                </label>
                <input
                    id="delivery-address"
                    data-cy="delivery-address"
                    autoComplete="street-address"
                    value={value.address}
                    onChange={(event) => onChange({ ...value, address: event.target.value })}
                    placeholder="Calle y número"
                    maxLength={DELIVERY_TEXT_MAX_LENGTH}
                    className={inputClass}
                />
            </div>
            <div>
                <label
                    htmlFor="delivery-neighborhood"
                    className="mb-2 block text-sm font-bold text-[#243556]"
                >
                    Colonia
                </label>
                <input
                    id="delivery-neighborhood"
                    data-cy="delivery-neighborhood"
                    autoComplete="address-level3"
                    value={value.neighborhood}
                    onChange={(event) => onChange({ ...value, neighborhood: event.target.value })}
                    placeholder="Ej. Centro"
                    maxLength={DELIVERY_NEIGHBORHOOD_MAX_LENGTH}
                    className={inputClass}
                />
            </div>
            <div>
                <label
                    htmlFor="delivery-reference"
                    className="mb-2 block text-sm font-bold text-[#243556]"
                >
                    Referencia <span className="font-normal text-[#8996A9]">(opcional)</span>
                </label>
                <input
                    id="delivery-reference"
                    data-cy="delivery-reference"
                    value={value.reference}
                    onChange={(event) => onChange({ ...value, reference: event.target.value })}
                    placeholder="Ej. Portón azul, frente a la tienda"
                    maxLength={DELIVERY_TEXT_MAX_LENGTH}
                    className={inputClass}
                />
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[#243556]">Marca dónde entregamos</p>
                    <button
                        type="button"
                        data-cy="delivery-use-my-location"
                        onClick={useMyLocation}
                        disabled={!geolocationSupported || locateState === 'locating'}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#D7E1EF] px-2.5 text-xs font-bold text-[#2451C5] transition hover:bg-[#F4F7FF] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {locateState === 'locating' ? (
                            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                        ) : (
                            <LocateFixed aria-hidden="true" className="size-3.5" />
                        )}
                        {locateState === 'locating' ? 'Buscando…' : 'Usar mi ubicación'}
                    </button>
                </div>
                <div
                    data-cy="delivery-pin-map"
                    className="isolate overflow-hidden rounded-xl border border-[#D7E1EF]"
                >
                    <DeliveryPinMap
                        center={value.pin ?? restaurantLocation ?? FALLBACK_CENTER}
                        pin={value.pin}
                        onPinChange={setPin}
                    />
                </div>
                {(locateState === 'denied' || locateState === 'failed') && (
                    <p data-cy="delivery-locate-error" className="mt-1.5 text-xs text-[#B42318]">
                        {locateState === 'denied'
                            ? 'No diste permiso para usar tu ubicación. Toca el mapa para marcarla.'
                            : 'No pudimos obtener tu ubicación. Toca el mapa para marcarla.'}
                    </p>
                )}
                {!value.pin && locateState !== 'denied' && locateState !== 'failed' && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#65738A]">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        Toca el mapa o usa tu ubicación. Sin pin no podemos calcular el envío.
                    </p>
                )}
            </div>

            <DeliveryQuoteStatus businessName={businessName} quote={quote} onRetry={onRetryQuote} />
        </div>
    )
}

function DeliveryQuoteStatus({
    businessName,
    quote,
    onRetry,
}: {
    businessName: string
    quote: DeliveryQuoteState
    onRetry: () => void
}) {
    if (quote.status === 'idle') return null
    if (quote.status === 'loading') {
        return (
            <p
                data-cy="delivery-quote-loading"
                role="status"
                className="flex items-center gap-1.5 text-xs text-[#65738A]"
            >
                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                Calculando envío…
            </p>
        )
    }
    if (quote.status === 'ok') {
        return (
            <p
                data-cy="delivery-quote"
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F8FC] px-3 py-2.5 text-sm text-[#243556]"
            >
                <span>Envío · {quote.distanceKm.toLocaleString('es-MX')} km aprox.</span>
                <strong data-cy="delivery-quote-fee">${formatMoney(quote.fee)}</strong>
            </p>
        )
    }
    if (quote.status === 'out_of_range') {
        return (
            <div
                data-cy="delivery-out-of-range"
                role="alert"
                className="rounded-xl border border-[#F4C7C3] bg-[#FFF5F4] px-3 py-2.5"
            >
                <p className="text-sm font-bold text-[#B42318]">
                    Esta ubicación está fuera del área de entrega
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8F2B24]">
                    Está a {quote.distanceKm.toLocaleString('es-MX')} km y {businessName} entrega
                    hasta {quote.maxDeliveryKm.toLocaleString('es-MX')} km. Marca otra ubicación o
                    elige recogerlo.
                </p>
            </div>
        )
    }
    if (quote.status === 'unavailable') {
        return (
            <p data-cy="delivery-unavailable" role="alert" className="text-xs text-[#B42318]">
                {businessName} no está entregando a domicilio en este momento. Elige otra forma de
                entrega.
            </p>
        )
    }
    return (
        <p data-cy="delivery-quote-error" role="alert" className="text-xs text-[#B42318]">
            No pudimos calcular el envío.{' '}
            <button type="button" onClick={onRetry} className="font-bold underline">
                Reintentar
            </button>
        </p>
    )
}
