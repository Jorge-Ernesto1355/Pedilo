'use client'

import { useQuery } from '@tanstack/react-query'
import { Stamp } from 'lucide-react'
import { useState } from 'react'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import { designFromTemplate } from '@/app/components/loyalty/loyaltyDesign'
import { getLoyaltyProgram, loyaltyQueryKeys } from '@/app/components/loyalty/loyaltyOwnerApi'
import type { CurrentBusiness } from '../business-profile/useCurrentBusiness'
import { LoyaltyEditor } from './LoyaltyEditor'
import { LoyaltySettingsSkeleton } from './LoyaltySettingsSkeleton'

/** Sección "Tarjeta de lealtad" de Ajustes (debajo de la tarjeta de pago). */
export function LoyaltySettingsPanel({ business }: { business?: CurrentBusiness }) {
    const query = useQuery({ queryKey: loyaltyQueryKeys.program, queryFn: getLoyaltyProgram })
    const [creating, setCreating] = useState(false)
    const restaurantName = business?.name ?? 'Mi restaurante'

    if (query.isPending) return <LoyaltySettingsSkeleton />
    if (query.isError) {
        return (
            <section
                data-cy="loyalty-settings"
                className="mt-5 rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6"
            >
                <p
                    data-cy="loyalty-load-error"
                    role="alert"
                    className="text-sm font-semibold text-[#B42318]"
                >
                    La tarjeta de lealtad no se cargó correctamente.
                </p>
                <button
                    type="button"
                    data-cy="loyalty-retry"
                    onClick={() => void query.refetch()}
                    className="mt-3 min-h-11 rounded-xl border border-[#D7E1EF] px-3 py-2 text-sm font-bold text-[#243556]"
                >
                    Reintentar
                </button>
            </section>
        )
    }

    const program = query.data
    return (
        <section
            data-cy="loyalty-settings"
            aria-labelledby="loyalty-settings-title"
            className="mt-5 rounded-2xl border border-[#DCE5F3] bg-white p-5 sm:p-6"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2
                        id="loyalty-settings-title"
                        className="flex items-center gap-2 text-base font-bold text-[#12234A]"
                    >
                        <Stamp aria-hidden="true" className="size-5 text-[#2451C5]" /> Tarjeta de
                        lealtad
                    </h2>
                    <p className="mt-1 text-sm text-[#65738A]">
                        Tus clientes juntan sellos con cada pedido y ganan un premio en el
                        siguiente.
                    </p>
                </div>
                {program.exists ? (
                    <span
                        data-cy="loyalty-status"
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${program.enabled ? 'bg-[#EAF8EF] text-[#16803D]' : 'bg-[#F1F4F9] text-[#53647D]'}`}
                    >
                        {program.enabled ? 'Activa' : 'Pausada'}
                    </span>
                ) : null}
            </div>

            {program.exists || creating ? (
                <LoyaltyEditor program={program} business={business} />
            ) : (
                <div
                    data-cy="loyalty-empty"
                    className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]"
                >
                    <div className="sm:order-2">
                        <LoyaltyCard
                            design={designFromTemplate('clasica', restaurantName)}
                            stampsCount={3}
                            stampsRequired={8}
                            rewardAvailable={false}
                            rewardLabel="20% de descuento"
                            restaurantName={restaurantName}
                            logoUrl={business?.logoUrl ?? null}
                            variant="preview"
                        />
                    </div>
                    <div className="sm:order-1">
                        <p className="font-display text-xl tracking-[-.03em] text-[#12234A]">
                            Premia a quien regresa.
                        </p>
                        <ul className="mt-3 space-y-1.5 text-sm text-[#53647D]">
                            <li>Diseñas la tarjeta con tus colores y tu estilo.</li>
                            <li>Das un sello al finalizar cada pedido, o se da solo.</li>
                            <li>
                                Al llenarla, tu cliente canjea su premio en el siguiente pedido.
                            </li>
                        </ul>
                        <button
                            type="button"
                            data-cy="loyalty-create"
                            onClick={() => setCreating(true)}
                            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1B3A9E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25"
                        >
                            Crear mi tarjeta
                        </button>
                        <p className="mt-2 text-xs text-[#5F6E86]">
                            Empiezas con 8 sellos y 20% de descuento; todo se puede cambiar.
                        </p>
                    </div>
                </div>
            )}
        </section>
    )
}
