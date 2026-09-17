/* eslint-disable @next/next/no-img-element -- Mock menu images will move behind the API media layer. */

'use client'

import { Clock3, MapPin, Utensils } from 'lucide-react'
import { ViewOnMapsButton } from '@/app/(protected)/create-menu/features/business-location/ViewOnMapsButton'
import type { PublicMenuBusiness } from './types'

export function MenuHeader({ business }: { business: PublicMenuBusiness }) {
    return <section className="overflow-hidden rounded-[24px] border border-[#DCE5F3] bg-white shadow-[0_22px_70px_-46px_rgba(19,49,117,.5)]">
        <div className="relative aspect-[16/5] min-h-36 overflow-hidden bg-[#173A95] sm:min-h-48">
            {business.coverImage ? <img src={business.coverImage} alt="Portada del negocio" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[linear-gradient(115deg,#173A95,#2451C5_55%,#6D8EE2)]" />}
            <div className="absolute inset-0 bg-[#0E225A]/20" />
        </div>
        <div className="px-5 pb-6 sm:px-7 sm:pb-8">
            <div className="relative z-10">
                <div className="-mt-10 grid size-20 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#E8EEFF] text-[#2451C5] shadow-md sm:size-24">{business.profileImage ? <img src={business.profileImage} alt={`Logo de ${business.name}`} className="h-full w-full object-cover" /> : <Utensils className="size-7 sm:size-8" />}</div>
                <div className="mt-3"><h1 className="font-display text-2xl tracking-[-.055em] text-[#10224A] sm:text-3xl">{business.name}</h1><p className="mt-1 flex items-center gap-1.5 text-sm text-[#65738A]"><MapPin className="size-3.5 text-[#2451C5]" />{business.location}</p></div>
            </div>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#52627B]">{business.description}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-[#65738A]"><span className={`inline-flex items-center gap-1.5 ${business.isOpen ? 'text-[#23814C]' : 'text-[#A46B00]'}`}><span className={`size-2 rounded-full ${business.isOpen ? 'bg-[#39A86B]' : 'bg-[#D59A21]'}`} />{business.isOpen ? 'Abierto' : 'Cerrado'}</span><span className="text-[#C8D1DE]">·</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-[#2451C5]" />{business.hours.days}, {business.hours.openTime}–{business.hours.closeTime}</span><ViewOnMapsButton coordinates={business.coordinates} /></div>
        </div>
    </section>
}
