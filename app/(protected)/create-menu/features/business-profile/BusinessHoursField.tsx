'use client'

import { Clock } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { BusinessProfileValues } from './businessProfile.schema'

export function BusinessHoursField() {
    const {
        control,
        register,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = useFormContext<BusinessProfileValues>()
    const hours = useWatch({ control, name: 'businessHours' })

    function toggleDay(index: number) {
        const day = hours?.days[index]
        if (!day) return

        const enabledDays = hours.days.filter((item) => item.enabled)
        if (day.enabled && enabledDays.length === 1) {
            setError('businessHours.days', {
                type: 'manual',
                message: 'Selecciona al menos un día.',
            })
            return
        }

        clearErrors('businessHours.days')
        setValue(`businessHours.days.${index}.enabled`, !day.enabled, {
            shouldDirty: true,
            shouldValidate: true,
        })
    }

    return (
        <section className="border-t border-[#E3EAF4] pt-6">
            <div className="mb-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#243556]">
                    <Clock className="size-4 text-[#2451C5]" /> Horario de atención
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8996A9]">
                    Tus clientes verán cuándo pueden hacer pedidos.
                </p>
            </div>
            <div className="mb-4 grid grid-cols-7 gap-1.5" role="group" aria-label="Días abiertos">
                {hours?.days.map((day, index) => (
                    <button
                        key={day.key}
                        type="button"
                        role="checkbox"
                        aria-checked={day.enabled}
                        onClick={() => toggleDay(index)}
                        className={`rounded-lg border py-2 text-center text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2451C5]/15 ${day.enabled ? 'border-[#2451C5] bg-[#EEF3FF] text-[#1E40AF]' : 'border-[#DCE5F3] bg-white text-[#8996A9] hover:border-[#AEBFE0]'}`}
                    >
                        {day.label}
                    </button>
                ))}
            </div>
            {errors.businessHours?.days && (
                <p role="alert" className="mb-3 text-xs text-[#B42318]">
                    {errors.businessHours.days.message}
                </p>
            )}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label
                        htmlFor="open-time"
                        className="mb-1.5 block text-xs font-semibold text-[#65738A]"
                    >
                        Abre
                    </label>
                    <input
                        id="open-time"
                        type="time"
                        className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        {...register('businessHours.openTime')}
                    />
                </div>
                <div>
                    <label
                        htmlFor="close-time"
                        className="mb-1.5 block text-xs font-semibold text-[#65738A]"
                    >
                        Cierra
                    </label>
                    <input
                        id="close-time"
                        type="time"
                        className="w-full rounded-xl border border-[#D7E1EF] bg-white px-3 py-2.5 text-sm text-[#243556] outline-none transition focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10"
                        {...register('businessHours.closeTime')}
                    />
                    {errors.businessHours?.closeTime && (
                        <p role="alert" className="mt-1.5 text-xs text-[#B42318]">
                            {errors.businessHours.closeTime.message}
                        </p>
                    )}
                </div>
            </div>
        </section>
    )
}
