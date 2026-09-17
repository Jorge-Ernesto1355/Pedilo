'use client'

import { FormProvider, useWatch } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { ChevronRight, Store } from 'lucide-react'
import { BusinessProfileForm } from './features/business-profile/BusinessProfileForm'
import { useBusinessProfileForm } from './features/business-profile/useBusinessProfileForm'
import { BusinessPreviewCard } from './features/business-preview/BusinessPreviewCard'
import { AddCategoryModal } from './features/category-management/AddCategoryModal'
import { useCategoryManagement } from './features/category-management/useCategoryManagement'
import { MenuManagementPanel } from './features/category-management/MenuManagementPanel'
import type { BusinessProfileValues } from './features/business-profile/businessProfile.schema'
import { useSaveBusinessProfile } from './features/business-profile/useSaveBusinessProfile'
import { useBusinessShareLink } from './features/business-sharing/useBusinessShareLink'
import { ShareLinkButton } from './features/business-sharing/ShareLinkButton'
import { QrCodeButton } from './features/business-sharing/QrCodeButton'
import { LocationPickerModal } from './features/business-location/LocationPickerModal'
import { useBusinessLocation } from './features/business-location/useBusinessLocation'
import type { LocationCoordinates } from './features/business-location/location.schema'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { sileo } from "sileo"
import { apiClient } from '@/src/lib/api/client'
import { locationCoordinatesSchema } from './features/business-location/location.schema'
import { useAuthStore } from '@/store/authStore'

type BusinessScheduleDay = {
    key?: unknown
    label?: unknown
    enabled?: unknown
}

type BusinessDetails = {
    name?: unknown
    slug?: unknown
    description?: unknown
    ubication?: unknown
    ubicationMaps?: unknown
    logoUrl?: unknown
    coverUrl?: unknown
    businessSchedule?: {
        days?: unknown
        openTime?: unknown
        closeTime?: unknown
    } | BusinessScheduleDay[] | null
    schedule?: {
        days?: unknown
        openTime?: unknown
        closeTime?: unknown
    } | null
}

type BusinessMineResponse = { business?: BusinessDetails }

const apiDayKeys: Record<string, BusinessProfileValues['businessHours']['days'][number]['key']> = {
    mon: 'mon', monday: 'mon',
    tue: 'tue', tuesday: 'tue',
    wed: 'wed', wednesday: 'wed',
    thu: 'thu', thursday: 'thu',
    fri: 'fri', friday: 'fri',
    sat: 'sat', saturday: 'sat',
    sun: 'sun', sunday: 'sun',
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function businessValuesFromResponse(business: BusinessDetails, current: BusinessProfileValues): BusinessProfileValues {
    const schedule = isRecord(business.businessSchedule)
        ? business.businessSchedule
        : isRecord(business.schedule)
            ? business.schedule
            : undefined
    const rawDays = Array.isArray(business.businessSchedule)
        ? business.businessSchedule
        : schedule?.days
    const days = Array.isArray(rawDays)
        ? rawDays.flatMap((day) => {
            if (!isRecord(day)) return []
            const key = typeof day.key === 'string' ? apiDayKeys[day.key.toLowerCase()] : undefined
            if (!key) return []
            return [{
                key,
                label: typeof day.label === 'string' ? day.label : current.businessHours.days.find((item) => item.key === key)?.label ?? key,
                enabled: typeof day.enabled === 'boolean' ? day.enabled : false,
            }]
        })
        : []
    const coordinatesResult = locationCoordinatesSchema.safeParse(business.ubicationMaps)
    const openTime = typeof schedule?.openTime === 'string' ? schedule.openTime : current.businessHours.openTime
    const closeTime = typeof schedule?.closeTime === 'string' ? schedule.closeTime : current.businessHours.closeTime

    return {
        ...current,
        businessName: typeof business.name === 'string' ? business.name : current.businessName,
        slug: typeof business.slug === 'string' ? business.slug : current.slug,
        location: typeof business.ubication === 'string' ? business.ubication : current.location,
        description: typeof business.description === 'string' ? business.description : current.description,
        coordinates: coordinatesResult.success ? coordinatesResult.data : current.coordinates,
        businessHours: {
            days: days.length > 0 ? days : current.businessHours.days,
            openTime,
            closeTime,
        },
    }
}

export default function BusinessSetupScreen() {
    const form = useBusinessProfileForm()
    const profile = useWatch({ control: form.control, defaultValue: form.getValues() }) as BusinessProfileValues
    const categories = useCategoryManagement()
    const saveProfile = useSaveBusinessProfile()
    const location = useBusinessLocation(profile.coordinates ?? null)
    const businessId = useAuthStore((state) => state.user?.businessId)
    const { getValues, reset } = form
    const { saveLocation } = location
    const sharing = useBusinessShareLink(profile.businessName)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)

    useEffect(() => {
        if (!businessId) return

        let cancelled = false

        async function loadBusiness() {
            try {
                const { data } = await apiClient.get<BusinessMineResponse>('/businesses/mine', { withCredentials: true })
                if (cancelled || !data.business) return

                const values = businessValuesFromResponse(data.business, getValues())
                reset(values)
                if (values.coordinates) saveLocation(values.coordinates)
                if (typeof data.business.logoUrl === 'string') setLogoPreview(data.business.logoUrl)
                if (typeof data.business.coverUrl === 'string') setCoverPreview(data.business.coverUrl)
            } catch {
                if (!cancelled) {
                    sileo.error({
                        title: 'No pudimos cargar tu negocio',
                        description: 'Inténtalo de nuevo en unos momentos.',
                    })
                }
            }
        }

        void loadBusiness()
        return () => { cancelled = true }
    }, [businessId, getValues, reset, saveLocation])



    useEffect(() => () => {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
    }, [logoPreview])

    useEffect(() => () => {
        if (coverPreview) URL.revokeObjectURL(coverPreview)
    }, [coverPreview])

    function selectLogo(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        setLogoPreview(URL.createObjectURL(file))
    }

    function selectCover(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        setCoverPreview(URL.createObjectURL(file))
    }

    function handleLocationSave(coordinates: LocationCoordinates) {
        form.setValue('coordinates', coordinates, { shouldDirty: true, shouldValidate: true })
        location.saveLocation(coordinates)
    }

    function handleProfileSubmit(values: BusinessProfileValues) {
        saveProfile.mutate(values, {
            onSuccess: (response) => {
                const business = response.business
                if (!business) return

                form.reset({
                    ...form.getValues(),
                    ...(business.name !== undefined ? { businessName: business.name } : {}),
                    ...(business.slug !== undefined ? { slug: business.slug } : {}),
                    ...(business.description !== undefined ? { description: business.description } : {}),
                })
            },
            onError: (error) => {
                if (!(error instanceof ApiError)) return

                const fieldNames: Record<string, keyof BusinessProfileValues> = {
                    name: 'businessName',
                    businessName: 'businessName',
                    ubication: 'location',
                    location: 'location',
                }

                Object.entries(error.fieldErrors).forEach(([field, messages]) => {
                    const fieldName = fieldNames[field] ?? field
                    form.setError(fieldName, { type: 'server', message: messages.join(' ') })
                })
            },
        })
    }

    return (
        <FormProvider {...form}>
            <main className="min-h-screen bg-[#F5F8FC] text-[#12234A]">


                <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
                    <div className="border-b border-[#DCE5F3] bg-white px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
                        <div className="mx-auto max-w-[430px] lg:sticky lg:top-10">
                            <BusinessProfileForm logoPreview={logoPreview} coverPreview={coverPreview} coordinates={location.coordinates} onLogoSelect={selectLogo} onCoverSelect={selectCover} onOpenLocationPicker={location.open} onSubmit={form.handleSubmit(handleProfileSubmit)} isSaving={saveProfile.isPending} saveState={saveProfile.isSuccess ? 'success' : saveProfile.isError ? 'error' : 'idle'} errorMessage={saveProfile.error?.message} />
                            <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] px-3.5 py-3 text-xs leading-5 text-[#65738A]"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EAF0FF] text-[#2451C5]"><Store className="size-3.5" /></span><span>Los cambios se reflejan al instante en la vista previa.</span></div>
                        </div>
                    </div>

                    <div className="px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
                        <div className="mx-auto max-w-[760px] space-y-5">
                            <div className="mb-8 flex items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">Tu menú online</p><h2 className="font-display text-3xl tracking-[-.055em] text-[#10224A] sm:text-4xl">Dale forma a tu escaparate.</h2></div><button type="button" onClick={categories.open} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#C9D7EA] bg-white px-3.5 py-2.5 text-sm font-bold text-[#243556] shadow-[0_5px_14px_rgb(20_48_105_/_0.04)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:text-[#1E40AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15"><span className="text-lg leading-none text-[#2451C5]">+</span><span>Crear menú</span></button></div>
                            <BusinessPreviewCard {...profile} logoPreview={logoPreview} coverPreview={coverPreview} />
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCE5F3] bg-[#FBFCFE] p-3"><p className="mr-auto px-1 text-xs font-semibold text-[#8996A9]">Comparte tu menú con tus clientes</p><ShareLinkButton shareUrl={sharing.shareUrl} copied={sharing.copied} onCopy={sharing.copyLink} /><QrCodeButton shareUrl={sharing.shareUrl} /></div>
                            <MenuManagementPanel management={categories} />
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-1 py-2 text-xs text-[#8996A9]"><span>Más adelante podrás conectar tu catálogo con WhatsApp.</span><span className="inline-flex items-center gap-1 font-semibold text-[#65738A]">Siguiente paso <ChevronRight className="size-3.5" /></span></div>
                        </div>
                    </div>
                </div>

                <AddCategoryModal open={categories.isOpen} isSaving={categories.createMenu.isPending} errorMessage={categories.createMenu.error?.message} onClose={categories.close} onSave={(menu) => categories.createMenu.mutate(menu)} />
                <LocationPickerModal open={location.isOpen} locationText={profile.location} coordinates={location.coordinates} onClose={location.close} onSave={handleLocationSave} />
            </main>
        </FormProvider >
    )
}
