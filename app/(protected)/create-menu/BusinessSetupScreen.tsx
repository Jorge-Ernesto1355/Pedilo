'use client'

import { FormProvider, useWatch } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import {
    getUserFriendlyError,
    getUserFriendlyFieldError,
} from '@/src/lib/errors/user-friendly-error'
import { notify } from '@/src/lib/notifications/notify'
import { apiClient } from '@/src/lib/api/client'
import { locationCoordinatesSchema } from './features/business-location/location.schema'
import { useAuthStore } from '@/store/authStore'
import { BusinessSettingsModal } from './features/business-settings/BusinessSettingsModal'
import { BusinessPreviewSkeleton } from './components/CreateMenuStates'
import Link from 'next/link'

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
    logoBlurUrl?: unknown
    coverUrl?: unknown
    coverBlurUrl?: unknown
    businessSchedule?:
        | {
              days?: unknown
              openTime?: unknown
              closeTime?: unknown
          }
        | BusinessScheduleDay[]
        | null
    schedule?: {
        days?: unknown
        openTime?: unknown
        closeTime?: unknown
    } | null
}

type BusinessMineResponse = { business?: BusinessDetails }

const apiDayKeys: Record<string, BusinessProfileValues['businessHours']['days'][number]['key']> = {
    mon: 'mon',
    monday: 'mon',
    tue: 'tue',
    tuesday: 'tue',
    wed: 'wed',
    wednesday: 'wed',
    thu: 'thu',
    thursday: 'thu',
    fri: 'fri',
    friday: 'fri',
    sat: 'sat',
    saturday: 'sat',
    sun: 'sun',
    sunday: 'sun',
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function businessValuesFromResponse(
    business: BusinessDetails,
    current: BusinessProfileValues,
): BusinessProfileValues {
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
              const key =
                  typeof day.key === 'string' ? apiDayKeys[day.key.toLowerCase()] : undefined
              if (!key) return []
              return [
                  {
                      key,
                      label:
                          typeof day.label === 'string'
                              ? day.label
                              : (current.businessHours.days.find((item) => item.key === key)
                                    ?.label ?? key),
                      enabled: typeof day.enabled === 'boolean' ? day.enabled : false,
                  },
              ]
          })
        : []
    const coordinatesResult = locationCoordinatesSchema.safeParse(business.ubicationMaps)
    const openTime =
        typeof schedule?.openTime === 'string' ? schedule.openTime : current.businessHours.openTime
    const closeTime =
        typeof schedule?.closeTime === 'string'
            ? schedule.closeTime
            : current.businessHours.closeTime

    return {
        ...current,
        businessName: typeof business.name === 'string' ? business.name : current.businessName,
        slug: typeof business.slug === 'string' ? business.slug : current.slug,
        location: typeof business.ubication === 'string' ? business.ubication : current.location,
        description:
            typeof business.description === 'string' ? business.description : current.description,
        coordinates: coordinatesResult.success ? coordinatesResult.data : current.coordinates,
        businessHours: {
            days: days.length > 0 ? days : current.businessHours.days,
            openTime,
            closeTime,
        },
    }
}

export default function BusinessSetupScreen({
    businessRequiredNotice = false,
}: {
    businessRequiredNotice?: boolean
}) {
    const router = useRouter()
    const form = useBusinessProfileForm()
    const profile = useWatch({
        control: form.control,
        defaultValue: form.getValues(),
    }) as BusinessProfileValues
    const categories = useCategoryManagement()
    const saveProfile = useSaveBusinessProfile()
    const location = useBusinessLocation(profile.coordinates ?? null)
    const businessId = useAuthStore((state) => state.user?.businessId)
    const { getValues, reset } = form
    const { saveLocation } = location
    const sharing = useBusinessShareLink(profile.slug)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [logoBlurPreview, setLogoBlurPreview] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [coverBlurPreview, setCoverBlurPreview] = useState<string | null>(null)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [businessSettingsOpen, setBusinessSettingsOpen] = useState(false)
    const [businessLoading, setBusinessLoading] = useState(false)

    useEffect(() => {
        if (!businessRequiredNotice) return

        notify.warning({
            title: 'Crea tu negocio primero',
            description: 'Para acceder al dashboard necesitas crear un negocio.',
        })
        router.replace('/create-menu', { scroll: false })
    }, [businessRequiredNotice, router])

    useEffect(() => {
        if (!businessId) return

        // Keep the form in its loading shape while the saved business values arrive.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBusinessLoading(true)

        let cancelled = false

        async function loadBusiness() {
            try {
                const { data } = await apiClient.get<BusinessMineResponse>('/businesses/mine', {
                    withCredentials: true,
                })
                if (cancelled || !data.business) return

                const values = businessValuesFromResponse(data.business, getValues())
                reset(values)
                if (values.coordinates) saveLocation(values.coordinates)
                setLogoPreview(
                    typeof data.business.logoUrl === 'string' ? data.business.logoUrl : null,
                )
                setLogoBlurPreview(
                    typeof data.business.logoBlurUrl === 'string'
                        ? data.business.logoBlurUrl
                        : null,
                )
                setCoverPreview(
                    typeof data.business.coverUrl === 'string' ? data.business.coverUrl : null,
                )
                setCoverBlurPreview(
                    typeof data.business.coverBlurUrl === 'string'
                        ? data.business.coverBlurUrl
                        : null,
                )
            } catch {
                if (!cancelled) {
                    setBusinessLoading(false)
                    notify.error({
                        title: 'No pudimos cargar tu negocio',
                        description: 'Inténtalo de nuevo en unos momentos.',
                    })
                }
            } finally {
                if (!cancelled) setBusinessLoading(false)
            }
        }

        void loadBusiness()
        return () => {
            cancelled = true
        }
    }, [businessId, getValues, reset, saveLocation])

    useEffect(
        () => () => {
            if (logoPreview) URL.revokeObjectURL(logoPreview)
        },
        [logoPreview],
    )

    useEffect(
        () => () => {
            if (coverPreview) URL.revokeObjectURL(coverPreview)
        },
        [coverPreview],
    )

    function selectLogo(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        setLogoFile(file)
        setLogoBlurPreview(null)
        setLogoPreview(URL.createObjectURL(file))
    }

    function selectCover(file: File | undefined) {
        if (!file || !file.type.startsWith('image/')) return
        if (coverPreview) URL.revokeObjectURL(coverPreview)
        setCoverFile(file)
        setCoverBlurPreview(null)
        setCoverPreview(URL.createObjectURL(file))
    }

    function handleLocationSave(coordinates: LocationCoordinates) {
        form.setValue('coordinates', coordinates, { shouldDirty: true, shouldValidate: true })
        location.saveLocation(coordinates)
    }

    function handleProfileSubmit(values: BusinessProfileValues) {
        saveProfile.mutate(
            { values, logoFile, coverFile },
            {
                onSuccess: (response) => {
                    const business = response.business
                    if (!business) return

                    form.reset({
                        ...form.getValues(),
                        ...(business.name !== undefined ? { businessName: business.name } : {}),
                        ...(business.slug !== undefined ? { slug: business.slug } : {}),
                        ...(business.description !== undefined
                            ? { description: business.description }
                            : {}),
                    })
                    router.refresh()
                },
                onError: (error) => {
                    if (!(error instanceof ApiError)) return

                    const fieldNames: Record<string, keyof BusinessProfileValues> = {
                        name: 'businessName',
                        businessName: 'businessName',
                        ubication: 'location',
                        location: 'location',
                    }

                    Object.entries(error.fieldErrors).forEach(([field]) => {
                        const fieldName = fieldNames[field] ?? field
                        form.setError(fieldName, {
                            type: 'server',
                            message: getUserFriendlyFieldError(
                                error,
                                field,
                                'Revisa este campo e inténtalo nuevamente.',
                            ),
                        })
                    })
                },
            },
        )
    }

    return (
        <FormProvider {...form}>
            <main className="min-h-screen bg-[#F5F8FC] text-[#12234A]">
                <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1440px] lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
                    <div className="border-b border-[#DCE5F3] bg-white px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
                        <div className="mx-auto max-w-[430px] lg:sticky lg:top-10">
                            <BusinessProfileForm
                                logoPreview={logoPreview}
                                logoBlurPreview={logoBlurPreview}
                                coverPreview={coverPreview}
                                coverBlurPreview={coverBlurPreview}
                                coordinates={location.coordinates}
                                onLogoSelect={selectLogo}
                                onCoverSelect={selectCover}
                                onOpenLocationPicker={location.open}
                                onSubmit={form.handleSubmit(handleProfileSubmit)}
                                isSaving={saveProfile.isPending}
                                isCreating={!businessId}
                                isLoading={businessLoading}
                                saveState={
                                    saveProfile.isSuccess
                                        ? 'success'
                                        : saveProfile.isError
                                          ? 'error'
                                          : 'idle'
                                }
                                errorMessage={
                                    saveProfile.error
                                        ? getUserFriendlyError(saveProfile.error).description
                                        : undefined
                                }
                            />
                            <p className="mt-3 max-w-md text-xs leading-5 text-[#65738A]">
                                Al configurar tu negocio aplican los{' '}
                                <Link
                                    href="/terminos-restaurantes"
                                    className="font-semibold text-[#2451C5] underline underline-offset-2"
                                >
                                    Términos para Restaurantes
                                </Link>{' '}
                                y el{' '}
                                <Link
                                    href="/privacidad"
                                    className="font-semibold text-[#2451C5] underline underline-offset-2"
                                >
                                    Aviso de Privacidad
                                </Link>
                                . Consulta también las políticas de{' '}
                                <Link
                                    href="/productos-y-contenido"
                                    className="font-semibold text-[#2451C5] underline underline-offset-2"
                                >
                                    productos y contenido
                                </Link>{' '}
                                y{' '}
                                <Link
                                    href="/propiedad-intelectual"
                                    className="font-semibold text-[#2451C5] underline underline-offset-2"
                                >
                                    propiedad intelectual
                                </Link>{' '}
                                y{' '}
                                <Link
                                    href="/marketing"
                                    className="font-semibold text-[#2451C5] underline underline-offset-2"
                                >
                                    Marketing
                                </Link>
                                . Cualquier consentimiento comercial es independiente de los
                                términos.
                            </p>
                            <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#DCE5F3] bg-[#F8FAFE] px-3.5 py-3 text-xs leading-5 text-[#65738A]">
                                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EAF0FF] text-[#2451C5]">
                                    <Store className="size-3.5" />
                                </span>
                                <span>Los cambios se reflejan al instante en la vista previa.</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
                        <div className="mx-auto max-w-[760px] space-y-5">
                            <div className="mb-8 flex items-end justify-between gap-5">
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">
                                        Tu menú online
                                    </p>
                                    <h2 className="font-display text-3xl tracking-[-.055em] text-[#10224A] sm:text-4xl">
                                        Dale forma a tu escaparate.
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={categories.open}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#C9D7EA] bg-white px-3.5 py-2.5 text-sm font-bold text-[#243556] shadow-[0_5px_14px_rgb(20_48_105_/_0.04)] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:text-[#1E40AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15"
                                >
                                    <span className="text-lg leading-none text-[#2451C5]">+</span>
                                    <span>Crear menú</span>
                                </button>
                            </div>
                            {businessLoading ? (
                                <BusinessPreviewSkeleton />
                            ) : (
                                <BusinessPreviewCard
                                    {...profile}
                                    logoPreview={logoPreview}
                                    logoBlurPreview={logoBlurPreview}
                                    coverPreview={coverPreview}
                                    coverBlurPreview={coverBlurPreview}
                                    onOpenSettings={() => setBusinessSettingsOpen(true)}
                                />
                            )}
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCE5F3] bg-[#FBFCFE] p-3">
                                <p className="mr-auto px-1 text-xs font-semibold text-[#8996A9]">
                                    Comparte tu menú con tus clientes
                                </p>
                                <ShareLinkButton
                                    shareUrl={sharing.shareUrl}
                                    copied={sharing.copied}
                                    onCopy={sharing.copyLink}
                                />
                                <QrCodeButton shareUrl={sharing.shareUrl} />
                            </div>
                            <MenuManagementPanel management={categories} />
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-1 py-2 text-xs text-[#8996A9]">
                                <span>Más adelante podrás conectar tu catálogo con WhatsApp.</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-[#65738A]">
                                    Siguiente paso <ChevronRight className="size-3.5" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <AddCategoryModal
                    open={categories.isOpen}
                    isSaving={categories.createMenu.isPending}
                    errorMessage={
                        categories.createMenu.error
                            ? getUserFriendlyError(categories.createMenu.error).description
                            : undefined
                    }
                    onClose={categories.close}
                    onSave={(menu) => categories.createMenu.mutate(menu)}
                />
                <LocationPickerModal
                    open={location.isOpen}
                    locationText={profile.location}
                    coordinates={location.coordinates}
                    onClose={location.close}
                    onSave={handleLocationSave}
                />
                <BusinessSettingsModal
                    open={businessSettingsOpen}
                    onClose={() => setBusinessSettingsOpen(false)}
                />
            </main>
        </FormProvider>
    )
}
