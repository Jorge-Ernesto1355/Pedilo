'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronRight, MessageCircle, Settings, Star } from 'lucide-react'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'
import { normalizePhoneInput } from '@/src/lib/validation/phone'
import { useBusinessSettings } from './useBusinessSettings'
import { WhatsAppPhoneField } from './WhatsAppPhoneField'
import { OnboardingBot } from './OnboardingBot'

type BusinessActionsPanelProps = {
    onOpenSettings: () => void
    onOpenGoogleReviews: () => void
    hasBusiness: boolean
    isBusinessReady: boolean
    isNewBusiness: boolean
}

const cardClass =
    'flex h-full flex-col rounded-2xl border border-[#E9EDF7] bg-white p-4 shadow-[0_2px_8px_rgba(30,50,120,0.025)]'
const outlineButtonClass =
    'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#6F83E0] bg-white px-3 text-sm font-semibold text-[#2D43B8] transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100'

export function BusinessActionsPanel({
    onOpenSettings,
    onOpenGoogleReviews,
    hasBusiness,
    isBusinessReady,
    isNewBusiness,
}: BusinessActionsPanelProps) {
    const { settings, create, update } = useBusinessSettings(hasBusiness && isBusinessReady)
    const [savedNumber, setSavedNumber] = useState<string | null>(null)
    const [didSaveWhatsapp, setDidSaveWhatsapp] = useState(false)
    const whatsappInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!settings.data) return
        const persisted = settings.data.whatsapp
        const normalized = persisted ? normalizePhoneInput(persisted) : ''
        // Keep the editor in sync with the persisted settings query.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSavedNumber(normalized ? `+52${normalized}` : null)
    }, [settings.data])

    async function saveWhatsapp(e164: string) {
        try {
            const whatsapp = normalizePhoneInput(e164)
            const mutation = settings.data ? update : create
            const result = await mutation.mutateAsync(
                settings.data
                    ? { whatsapp }
                    : {
                          currency: 'MXN',
                          phone: null,
                          whatsapp,
                          timezone: 'America/Mazatlan',
                      },
            )
            const number = result.whatsapp ? `+52${normalizePhoneInput(result.whatsapp)}` : e164
            setSavedNumber(number)
            notify.success({
                title: 'WhatsApp guardado',
                description: 'El número del negocio se actualizó correctamente.',
            })
        } catch (error) {
            const message = friendlyNotificationError(
                error,
                'No pudimos guardar el número. Intenta de nuevo.',
            )
            notify.error({ title: 'No se pudo guardar WhatsApp', description: message })
            throw error
        }
    }

    return (
        <section
            aria-labelledby="business-actions-title"
            className="rounded-[24px] border border-[#E6EAF5] bg-white p-4 shadow-[0_8px_30px_rgba(30,50,120,0.06)] sm:p-5"
        >
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#D6DDF6] text-[#2D43B8]">
                        <Check aria-hidden="true" className="size-4" />
                    </span>
                    <h2
                        id="business-actions-title"
                        className="text-sm font-semibold leading-5 text-[#2D43B8] sm:text-base"
                    >
                        Más adelante podrás conectar tu catálogo con WhatsApp.
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onOpenSettings}
                    className="inline-flex items-center justify-end gap-1 self-end text-sm text-[#9AA3B5] transition hover:text-slate-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:self-auto"
                >
                    Siguiente paso
                    <ChevronRight aria-hidden="true" className="size-5" />
                </button>
            </header>

            <div
                id="business-actions-cards"
                className="mt-5 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
                <article className={cardClass}>
                    <div className="grid size-10 place-items-center rounded-xl bg-[#E3E8FA] text-[#2D43B8]">
                        <Settings aria-hidden="true" className="size-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="mt-4 text-base font-semibold text-[#3B4560]">
                            Configuración de negocio
                        </h3>
                        <p className="mt-1.5 text-sm leading-5 text-[#8A93A8]">
                            Edita la información de tu negocio, horarios, logo y más.
                        </p>
                    </div>
                    <div className="mt-auto pt-6">
                        <button
                            type="button"
                            className={outlineButtonClass}
                            onClick={onOpenSettings}
                        >
                            Configurar
                            <ArrowRight aria-hidden="true" className="size-5" />
                        </button>
                    </div>
                </article>

                <article className={cardClass}>
                    <div className="grid size-10 place-items-center rounded-xl bg-[#FDF0D5] text-[#F2B136]">
                        <Star aria-hidden="true" className="size-5 fill-current" />
                    </div>
                    <div className="flex-1">
                        <h3 className="mt-4 text-base font-semibold text-[#3B4560]">
                            Google Reviews
                        </h3>
                        <p className="mt-1.5 text-sm leading-5 text-[#8A93A8]">
                            Genera un código QR para que tus clientes te dejen una reseña.
                        </p>
                    </div>
                    <div className="mt-auto pt-6">
                        <button
                            type="button"
                            className={outlineButtonClass}
                            onClick={onOpenGoogleReviews}
                        >
                            Ver código QR
                            <ArrowRight aria-hidden="true" className="size-5" />
                        </button>
                    </div>
                </article>

                <article
                    id="whatsapp-card"
                    className={`${cardClass} transition-shadow sm:col-span-2 lg:col-span-1`}
                >
                    <div className="grid size-10 place-items-center rounded-xl bg-[#DDF6E6] text-[#1E6B45]">
                        <MessageCircle aria-hidden="true" className="size-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="mt-4 text-base font-semibold text-[#3B4560]">WhatsApp</h3>
                        <p className="mt-1.5 text-sm leading-5 text-[#8A93A8]">
                            Agrega tu número para recibir pedidos directamente.
                        </p>
                    </div>
                    {!isBusinessReady ? (
                        <p className="mt-4 text-sm leading-5 text-[#8A93A8]">
                            Estamos verificando la información de tu negocio.
                        </p>
                    ) : !hasBusiness ? (
                        <p className="mt-4 text-sm leading-5 text-[#8A93A8]">
                            Para recibir pedidos, primero crea tu negocio y después registra tu
                            número de WhatsApp.
                        </p>
                    ) : settings.isLoading ? (
                        <p className="mt-4 text-sm text-[#8A93A8]">Cargando número…</p>
                    ) : settings.isError ? (
                        <div className="mt-4 text-sm text-red-600" role="alert">
                            No pudimos cargar el número guardado.{' '}
                            <button
                                type="button"
                                className="font-semibold underline"
                                onClick={() => void settings.refetch()}
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    ) : (
                        <WhatsAppPhoneField
                            key={settings.data?.businessId ?? 'business'}
                            savedNumber={savedNumber}
                            onSave={saveWhatsapp}
                            inputRef={whatsappInputRef}
                            onSaved={() => setDidSaveWhatsapp(true)}
                        />
                    )}
                </article>
            </div>
            {hasBusiness && settings.data && !settings.isLoading && !settings.isError && (
                <OnboardingBot
                    hasBusiness={hasBusiness}
                    hasWhatsapp={Boolean(savedNumber)}
                    isNewBusiness={isNewBusiness}
                    businessId={settings.data?.businessId ?? null}
                    whatsappCardId="whatsapp-card"
                    whatsappInputRef={whatsappInputRef}
                    didSaveWhatsapp={didSaveWhatsapp}
                />
            )}
        </section>
    )
}
