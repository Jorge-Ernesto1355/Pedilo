'use client'

import { Check, ImagePlus, LoaderCircle } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import type { BusinessProfileValues } from './businessProfile.schema'
import { BusinessHoursField } from './BusinessHoursField'
import { ViewOnMapsButton } from '../business-location/ViewOnMapsButton'
import type { LocationCoordinates } from '../business-location/location.schema'
import { MapPinned } from 'lucide-react'
import type { FormEventHandler } from 'react'
import { ProgressiveImage } from './ProgressiveImage'
import { BusinessProfileSkeleton } from '../../components/CreateMenuStates'
import Link from 'next/link'
type BusinessProfileFormProps = {
    logoPreview: string | null
    logoBlurPreview: string | null
    coverPreview: string | null
    coverBlurPreview: string | null
    coordinates: LocationCoordinates | null
    onLogoSelect: (file: File | undefined) => void
    onCoverSelect: (file: File | undefined) => void
    onOpenLocationPicker: () => void
    onSubmit: FormEventHandler<HTMLFormElement>
    isSaving: boolean
    isCreating: boolean
    isLoading: boolean
    saveState: 'idle' | 'success' | 'error'
    errorMessage?: string
}

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10'

export function BusinessProfileForm({
    logoPreview,
    logoBlurPreview,
    coverPreview,
    coverBlurPreview,
    coordinates,
    onLogoSelect,
    onCoverSelect,
    onOpenLocationPicker,
    onSubmit,
    isSaving,
    isCreating,
    isLoading,
    saveState,
    errorMessage,
}: BusinessProfileFormProps) {
    const {
        register,
        formState: { errors },
    } = useFormContext<BusinessProfileValues>()

    if (isLoading) return <BusinessProfileSkeleton />

    return (
        <form onSubmit={onSubmit} aria-labelledby="business-profile-title" className="space-y-8">
            <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[#2451C5]">
                    Primer paso
                </p>
                <h1
                    id="business-profile-title"
                    className="font-display text-[clamp(2rem,4vw,3rem)] leading-[.98] tracking-[-.06em] text-[#10224A]"
                >
                    Cuéntanos sobre tu negocio.
                </h1>
                <p className="mt-4 max-w-md text-[15px] leading-7 text-[#65738A]">
                    Esta información aparecerá en tu menú online. Puedes cambiarla cuando quieras.
                </p>
            </div>

            <div className="space-y-5">
                <div>
                    <label
                        htmlFor="businessName"
                        className="mb-2 block text-sm font-semibold text-[#243556]"
                    >
                        Nombre del negocio
                    </label>
                    <input
                        id="businessName"
                        autoComplete="organization"
                        placeholder="Ej. La Esquina"
                        className={inputClass}
                        {...register('businessName')}
                    />
                    {errors.businessName && (
                        <p className="mt-1.5 text-xs text-[#B42318]" role="alert">
                            {errors.businessName.message}
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="slug" className="block text-sm font-semibold text-[#243556]">
                        URL del negocio
                    </label>
                    <span className="mt-4 max-w-md text-sm leading-7 text-[#65738A]">
                        Crea una URL sencilla y fácil de recordar para que tus clientes accedan a tu
                        menú. Ejemplo: /menu/la-esquina
                    </span>
                    <input
                        id="slug"
                        autoComplete="organization"
                        placeholder="Ej. la-esquina"
                        className={inputClass}
                        {...register('slug')}
                    />
                    {errors.slug && (
                        <p className="mt-1.5 text-xs text-[#B42318]" role="alert">
                            {errors.slug.message}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="location"
                        className="mb-2 block text-sm font-semibold text-[#243556]"
                    >
                        Ubicación
                    </label>
                    <input
                        id="location"
                        autoComplete="address-level2"
                        placeholder="Ej. Culiacán, Sinaloa"
                        className={inputClass}
                        {...register('location')}
                    />
                    {errors.location && (
                        <p className="mt-1.5 text-xs text-[#B42318]" role="alert">
                            {errors.location.message}
                        </p>
                    )}
                </div>
                <div>
                    <label
                        htmlFor="description"
                        className="mb-2 block text-sm font-semibold text-[#243556]"
                    >
                        Descripción
                    </label>
                    <textarea
                        id="description"
                        rows={4}
                        placeholder="Cuéntales qué hace especial a tu negocio"
                        className={`${inputClass} resize-none`}
                        {...register('description')}
                    />
                    <div className="mt-1.5 flex justify-between gap-3 text-xs text-[#8996A9]">
                        <span>
                            {errors.description?.message ?? 'Una frase breve funciona mejor.'}
                        </span>
                        <span>180 máx.</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onOpenLocationPicker}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#C9D7EA] px-3 py-2 text-xs font-bold text-[#2451C5] transition hover:border-[#9EB3D8] hover:bg-[#F4F7FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/15"
                    >
                        <MapPinned className="size-3.5" />
                        {coordinates ? 'Ajustar ubicación exacta' : 'Marcar ubicación exacta'}
                    </button>
                    <ViewOnMapsButton coordinates={coordinates} />
                </div>
            </div>

            <BusinessHoursField />

            <div className="border-t border-[#E3EAF4] pt-6">
                <div className="mb-3">
                    <p className="text-sm font-semibold text-[#243556]">Logo del negocio</p>
                    <p className="mt-1 text-xs text-[#7A879A]">
                        Opcional · se verá en tu menú público. Solo usa imágenes que tengas derecho
                        a publicar.
                    </p>
                </div>
                <label
                    htmlFor="business-logo"
                    className="group inline-flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] px-3 py-2.5 transition hover:border-[#2451C5] hover:bg-[#F4F7FF]"
                >
                    <span className="relative grid size-10 overflow-hidden place-items-center rounded-full bg-[#EAF0FF] text-[#2451C5]">
                        {logoPreview ? (
                            <ProgressiveImage
                                src={logoPreview}
                                placeholderSrc={logoBlurPreview}
                                alt="Vista previa del logo"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <ImagePlus className="size-4" />
                        )}
                    </span>
                    <span className="text-left">
                        <span className="block text-sm font-semibold text-[#243556]">
                            {logoPreview ? 'Cambiar imagen' : 'Subir una imagen'}
                        </span>
                        <span className="block text-xs text-[#8996A9]">
                            PNG o JPG · vista local
                        </span>
                    </span>
                    <input
                        id="business-logo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => onLogoSelect(event.target.files?.[0])}
                    />
                </label>
            </div>

            <div className="border-t border-[#E3EAF4] pt-6">
                <div className="mb-3">
                    <p className="text-sm font-semibold text-[#243556]">Foto de portada</p>
                    <p className="mt-1 text-xs text-[#7A879A]">
                        Opcional · una imagen amplia para encabezar tu menú. Debes contar con
                        autorización para usarla.
                    </p>
                </div>
                <label
                    htmlFor="business-cover"
                    className="group relative flex min-h-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#BFCDE1] bg-[#FAFCFF] transition hover:border-[#2451C5] hover:bg-[#F4F7FF]"
                >
                    {coverPreview ? (
                        <ProgressiveImage
                            src={coverPreview}
                            placeholderSrc={coverBlurPreview}
                            alt="Vista previa de la portada"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-center">
                            <span className="block text-sm font-semibold text-[#243556]">
                                Subir foto de portada
                            </span>
                            <span className="mt-1 block text-xs text-[#8996A9]">
                                JPG, PNG o WebP · vista local
                            </span>
                        </span>
                    )}
                    <input
                        id="business-cover"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => onCoverSelect(event.target.files?.[0])}
                    />
                </label>
            </div>

            <div className="border-t border-[#E3EAF4] pt-6">
                <button
                    type="submit"
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgb(30_64_175_/_0.18)] transition hover:-translate-y-0.5 hover:bg-[#183991] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/20 disabled:cursor-wait disabled:opacity-60"
                >
                    <span aria-live="polite">
                        {isSaving
                            ? isCreating
                                ? 'Creando negocio…'
                                : 'Actualizando negocio…'
                            : saveState === 'success'
                              ? 'Cambios guardados'
                              : 'Guardar cambios'}
                    </span>
                    {isSaving ? (
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-4 motion-reduce:animate-none animate-spin"
                        />
                    ) : saveState === 'success' ? (
                        <Check aria-hidden="true" className="size-4" />
                    ) : null}
                </button>
                {saveState === 'error' && (
                    <p role="alert" className="mt-2 text-center text-xs text-[#B42318]">
                        {errorMessage ||
                            (isCreating
                                ? 'No pudimos crear tu negocio. Inténtalo de nuevo.'
                                : 'No pudimos actualizar tu negocio. Inténtalo de nuevo.')}
                    </p>
                )}
            </div>
        </form>
    )
}
