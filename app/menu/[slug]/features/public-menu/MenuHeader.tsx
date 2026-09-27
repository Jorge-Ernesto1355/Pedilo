'use client'

import { Clock3, MapPin, Utensils } from 'lucide-react'
import { ProgressiveImage } from '@/app/(protected)/create-menu/features/business-profile/ProgressiveImage'
import type { PublicBusiness } from './publicCatalog.types'
import { ViewOnMapsButton } from '@/app/(protected)/create-menu/features/business-location/ViewOnMapsButton'

export function MenuHeader({ business }: { business: PublicBusiness }) {
    const schedule = business.businessSchedule

    const workingDays = schedule?.days
        .filter((day) => day.enabled !== false)
        .map((day) => day.label)
        .filter(Boolean)
        .join(' · ')

    return (
        <section className="overflow-hidden rounded-[24px] border border-[#DCE5F3] bg-white shadow-[0_22px_70px_-46px_rgba(19,49,117,.5)]">
            <div className="relative aspect-[16/5] min-h-36 overflow-hidden bg-[#173A95] sm:min-h-48">
                {business.coverUrl ? (
                    <ProgressiveImage
                        src={business.coverUrl}
                        placeholderSrc={business.coverBlurUrl}
                        alt={`Portada de ${business.name}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full bg-[linear-gradient(115deg,#173A95,#2451C5_55%,#6D8EE2)]" />
                )}
                <div className="absolute inset-0 bg-[#0E225A]/20" />
            </div>
            <div className="px-5 pb-6 sm:px-7 sm:pb-8">
                <div className="relative z-10">
                    <div className="-mt-10 grid size-20 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#E8EEFF] text-[#2451C5] shadow-md sm:size-24">
                        {business.logoUrl ? (
                            <ProgressiveImage
                                src={business.logoUrl}
                                placeholderSrc={business.logoBlurUrl}
                                alt={`Logo de ${business.name}`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <Utensils className="size-7 sm:size-8" />
                        )}
                    </div>
                    <h1 className="mt-3 font-display text-2xl tracking-[-.055em] text-[#10224A] sm:text-3xl">
                        {business.name}
                    </h1>
                    {business.ubication && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-[#65738A]">
                            <MapPin className="size-3.5 text-[#2451C5]" />
                            {business.ubication}
                        </p>
                    )}
                </div>
                {business.description && (
                    <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#52627B]">
                        {business.description}
                    </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[#65738A]">
                    {schedule ? (
                        <span
                            className={`inline-flex items-center gap-1.5 ${schedule.isClosed ? 'text-[#A46B00]' : 'text-[#23814C]'}`}
                        >
                            <span
                                className={`size-2 rounded-full ${schedule.isClosed ? 'bg-[#D59A21]' : 'bg-[#39A86B]'}`}
                            />
                            {schedule.isClosed ? 'Cerrado' : 'Horario disponible'}
                        </span>
                    ) : (
                        <span>Sin horario disponible</span>
                    )}
                    {workingDays && (
                        <>
                            <span className="text-[#C8D1DE]">·</span>
                            <span>{workingDays}</span>
                        </>
                    )}
                    {schedule && !schedule.isClosed && schedule.openTime && (
                        <>
                            <span className="text-[#C8D1DE]">·</span>
                            <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="size-3.5 text-[#2451C5]" />
                                {schedule.openTime}–{schedule.closeTime}
                            </span>
                        </>
                    )}
                    {business?.ubicationMaps ? (
                        <>
                            <ViewOnMapsButton coordinates={business.ubicationMaps} />
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
