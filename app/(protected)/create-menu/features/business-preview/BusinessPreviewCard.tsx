'use client'

import { MapPin, Settings2, Utensils } from 'lucide-react'
import type { BusinessProfileValues } from '../business-profile/businessProfile.schema'
import { ViewOnMapsButton } from '../business-location/ViewOnMapsButton'
import { ProgressiveImage } from '../business-profile/ProgressiveImage'

type BusinessPreviewCardProps = BusinessProfileValues & {
    logoPreview: string | null
    logoBlurPreview: string | null
    coverPreview: string | null
    coverBlurPreview: string | null
    onOpenSettings: () => void
}

function formatTime(value: string) {
    const [hour, minute] = value.split(':').map(Number)
    const suffix = hour >= 12 ? 'PM' : 'AM'
    const normalizedHour = hour % 12 || 12
    return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

function formatBusinessDays(days: BusinessProfileValues['businessHours']['days']) {
    const active = days.filter((day) => day.enabled)
    if (!active.length) return 'Cerrado'
    if (active.length === 7) return 'Todos los días'
    if (active.length === 6 && !active.some((day) => day.key === 'sun')) return 'Lun–Sáb'
    return active.map((day) => day.label).join(' · ')
}

export function BusinessPreviewCard({
    businessName,
    location,
    description,
    businessHours,
    coordinates,
    logoPreview,
    logoBlurPreview,
    coverPreview,
    coverBlurPreview,
    onOpenSettings,
}: BusinessPreviewCardProps) {
    return (
        <section
            aria-labelledby="preview-title"
            className="overflow-hidden rounded-[24px] border border-[#DCE5F3] bg-white shadow-[0_22px_70px_-46px_rgba(19,49,117,.5)]"
        >
            <div className="flex items-center justify-between border-b border-[#E8EEF6] px-5 py-4 sm:px-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                        Vista previa
                    </p>
                    <p className="mt-1 text-xs text-[#8996A9]">Así lo verán tus clientes</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onOpenSettings}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9D7EA] bg-white px-2.5 py-2 text-xs font-bold text-[#2451C5] transition hover:border-[#9EB3D8] hover:bg-[#F4F7FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/15"
                    >
                        <Settings2 className="size-3.5" />
                        <span className="hidden sm:inline">Configurar negocio</span>
                    </button>
                    <span className="rounded-full bg-[#EEF8F2] px-2.5 py-1 text-[11px] font-semibold text-[#23814C]">
                        En vivo
                    </span>
                </div>
            </div>
            <div className="p-5 sm:p-7">
                <div className="mb-5">
                    <div className="relative aspect-[16/5] overflow-hidden rounded-2xl bg-[#173A95]">
                        {coverPreview ? (
                            <ProgressiveImage
                                src={coverPreview}
                                placeholderSrc={coverBlurPreview}
                                alt="Portada del negocio"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-[linear-gradient(115deg,#173A95,#2451C5_55%,#6D8EE2)]" />
                        )}
                        <div className="absolute inset-0 bg-[#0E225A]/20" />
                    </div>
                    <div className="relative z-10 px-5 sm:px-6">
                        <div className="relative -mt-10 grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#E8EEFF] text-[#2451C5] shadow-md">
                            {logoPreview ? (
                                <ProgressiveImage
                                    src={logoPreview}
                                    placeholderSrc={logoBlurPreview}
                                    alt="Logo del negocio"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Utensils className="size-7" />
                            )}
                        </div>
                        <div className="mt-3 min-w-0">
                            <h2
                                id="preview-title"
                                className="truncate font-display text-2xl tracking-[-.05em] text-[#10224A]"
                            >
                                {businessName || 'Nombre de tu negocio'}
                            </h2>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#65738A]">
                                <MapPin className="size-3.5 text-[#2451C5]" />
                                {location || 'Agrega una ubicación'}
                            </p>
                        </div>
                    </div>
                </div>
                <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#52627B]">
                    {description ||
                        'Una breve descripción ayudará a tus clientes a conocerte mejor.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-[#EEF2F7] pt-4 text-xs font-semibold text-[#7A879A]">
                    <span className="size-2 rounded-full bg-[#39A86B]" /> Abierto{' '}
                    <span className="text-[#C8D1DE]">·</span>{' '}
                    {formatBusinessDays(businessHours.days)}, {formatTime(businessHours.openTime)}–
                    {formatTime(businessHours.closeTime)} <span className="text-[#C8D1DE]">·</span>{' '}
                    Pedidos por WhatsApp <ViewOnMapsButton coordinates={coordinates} />
                </div>
            </div>
        </section>
    )
}
