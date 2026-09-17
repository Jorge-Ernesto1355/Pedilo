'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import dynamic from 'next/dynamic'
import { LocateFixed, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, type UseFormSetValue } from 'react-hook-form'
import { z } from 'zod'
import { Modal } from '@/app/components/ui/Modal'
import { locationCoordinatesSchema, type LocationCoordinates } from './location.schema'
import { useNominatimSearch, type NominatimResult } from './useNominatimSearch'

const LeafletLocationMap = dynamic(
    () => import('./LeafletLocationMap').then((module) => module.LeafletLocationMap),
    {
        ssr: false,
        loading: () => <div className="grid h-[360px] place-items-center bg-[#F3F6FB] text-sm text-[#8996A9]">Cargando mapa…</div>,
    },
)

type LocationPickerModalProps = {
    open: boolean
    locationText: string
    coordinates: LocationCoordinates | null
    onClose: () => void
    onSave: (coordinates: LocationCoordinates) => void
}

type LocationForm = { latitude: string; longitude: string }

const defaultCoordinates: LocationCoordinates = { latitude: 24.8091, longitude: -107.394 }
const locationFormSchema = z.object({
    latitude: z.string().min(1, 'Escribe una latitud.').refine((value) => Number.isFinite(Number(value)) && Number(value) >= -90 && Number(value) <= 90, 'Latitud inválida.'),
    longitude: z.string().min(1, 'Escribe una longitud.').refine((value) => Number.isFinite(Number(value)) && Number(value) >= -180 && Number(value) <= 180, 'Longitud inválida.'),
})

export function LocationPickerModal({ open, locationText, coordinates, onClose, onSave }: LocationPickerModalProps) {
    const initial = coordinates ?? defaultCoordinates
    const [draft, setDraft] = useState<LocationCoordinates>(initial)
    const hasTriedInitialGeocode = useRef(false)
    const { query, setQuery, results, isSearching, searchError, geocode } = useNominatimSearch()
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<LocationForm>({
        resolver: zodResolver(locationFormSchema),
        defaultValues: { latitude: String(initial.latitude), longitude: String(initial.longitude) },
    })

    useEffect(() => {
        if (!open) {
            hasTriedInitialGeocode.current = false
            return
        }
        const next = coordinates ?? defaultCoordinates
        const timer = window.setTimeout(() => {
            setDraft(next)
            setValue('latitude', String(next.latitude))
            setValue('longitude', String(next.longitude))
        }, 0)
        return () => window.clearTimeout(timer)
    }, [coordinates, open, setValue])

    useEffect(() => {
        if (!open || coordinates || !locationText.trim() || hasTriedInitialGeocode.current) return
        hasTriedInitialGeocode.current = true
        void geocode(locationText).then((result) => {
            const next = result ? parseResultCoordinates(result) : null
            if (next) updateDraft(next, setDraft, setValue)
        })
    }, [coordinates, geocode, locationText, open, setValue])

    function updateLocation(next: LocationCoordinates) {
        updateDraft(next, setDraft, setValue)
    }

    function handleSearchResult(result: NominatimResult) {
        const next = parseResultCoordinates(result)
        if (!next) return
        updateLocation(next)
        setQuery(result.display_name)
    }

    function submit(values: LocationForm) {
        const parsed = locationCoordinatesSchema.safeParse({ latitude: Number(values.latitude), longitude: Number(values.longitude) })
        if (parsed.success) onSave(parsed.data)
    }

    return (
        <Modal open={open} onClose={onClose} title="Ubicación exacta" description="Busca tu dirección y ajusta el pin para marcar el punto preciso de tu negocio." size="lg">
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-[#CBD8EA]">
                    <div className="relative border-b border-[#E4EBF4] bg-white p-3">
                        <Search aria-hidden="true" className="pointer-events-none absolute left-6 top-6 size-4 text-[#8996A9]" />
                        <input aria-label="Buscar dirección" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca una dirección o negocio" className="w-full rounded-xl border border-[#D7E1EF] py-3 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" />
                        {(isSearching || searchError || results.length > 0) && <div className="absolute inset-x-3 top-[calc(100%-1px)] z-[1000] overflow-hidden rounded-b-xl border border-t-0 border-[#D7E1EF] bg-white shadow-lg">
                            {isSearching && <p className="px-4 py-3 text-sm text-[#8996A9]">Buscando dirección…</p>}
                            {!isSearching && searchError && <p role="alert" className="px-4 py-3 text-sm text-[#A33A32]">No pudimos buscar esa dirección. Intenta de nuevo.</p>}
                            {!isSearching && !searchError && results.map((result) => <button key={result.place_id} type="button" onClick={() => handleSearchResult(result)} className="block w-full border-b border-[#EEF2F7] px-4 py-3 text-left text-sm text-[#26344A] transition last:border-0 hover:bg-[#F3F6FB]">{result.display_name}</button>)}
                        </div>}
                    </div>
                    <LeafletLocationMap center={draft} onSelect={updateLocation} />
                </div>
                <p className="text-xs leading-5 text-[#8996A9]">Mapa © OpenStreetMap contributors. Puedes hacer clic en el mapa o arrastrar el pin para ajustar la ubicación.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div><label htmlFor="latitude" className="mb-1.5 block text-xs font-semibold text-[#65738A]">Latitud</label><input id="latitude" type="number" step="any" className="w-full rounded-xl border border-[#D7E1EF] px-3 py-2.5 text-sm outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('latitude')} />{errors.latitude && <p role="alert" className="mt-1 text-xs text-[#B42318]">{errors.latitude.message}</p>}</div>
                    <div><label htmlFor="longitude" className="mb-1.5 block text-xs font-semibold text-[#65738A]">Longitud</label><input id="longitude" type="number" step="any" className="w-full rounded-xl border border-[#D7E1EF] px-3 py-2.5 text-sm outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10" {...register('longitude')} />{errors.longitude && <p role="alert" className="mt-1 text-xs text-[#B42318]">{errors.longitude.message}</p>}</div>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-[#E8EEF6] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-1.5 text-xs text-[#8996A9]"><LocateFixed className="size-3.5" />El pin final se guardará con este perfil.</p><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#65738A] transition hover:bg-[#F2F5FA]">Cancelar</button><button type="submit" className="rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#183991]">Guardar ubicación</button></div></div>
            </form>
        </Modal>
    )
}

function parseResultCoordinates(result: NominatimResult): LocationCoordinates | null {
    const parsed = locationCoordinatesSchema.safeParse({ latitude: Number(result.lat), longitude: Number(result.lon) })
    return parsed.success ? parsed.data : null
}

function updateDraft(next: LocationCoordinates, setDraft: (value: LocationCoordinates) => void, setValue: UseFormSetValue<LocationForm>) {
    setDraft(next)
    setValue('latitude', String(next.latitude), { shouldValidate: true })
    setValue('longitude', String(next.longitude), { shouldValidate: true })
}
