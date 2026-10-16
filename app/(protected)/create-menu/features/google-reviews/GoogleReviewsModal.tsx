/* eslint-disable @next/next/no-img-element -- Generated PNG previews are data URLs. */
'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink, LoaderCircle, QrCode, Save, Sparkles } from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'
import { useGoogleReviews } from './useGoogleReviews'
import { buildCustomGoogleReviewsCard, buildSimpleGoogleReviewsQr } from './googleReviewsCard'

const inputClass =
    'w-full rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-3 text-sm text-[#12234A] outline-none transition placeholder:text-[#A0ACBD] focus:border-[#2451C5] focus:ring-4 focus:ring-[#2451C5]/10 disabled:cursor-not-allowed disabled:bg-[#F5F8FC]'
const googleHosts = [
    'g.page',
    'goo.gl',
    'google.com',
    'www.google.com',
    'maps.google.com',
    'maps.app.goo.gl',
    'search.google.com',
]

function isGoogleReviewUrl(value: string) {
    try {
        const parsed = new URL(value)
        return (
            parsed.protocol === 'https:' &&
            googleHosts.some(
                (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
            ) &&
            !parsed.username &&
            !parsed.password
        )
    } catch {
        return false
    }
}

function errorMessage(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) return fallback
    if (error.code === 'NOT_AUTHENTICATED' || error.status === 401)
        return 'Tu sesión terminó. Inicia sesión nuevamente para gestionar tus reseñas.'
    if (error.code === 'GOOGLE_REVIEW_ACCESS_DENIED' || error.status === 403)
        return 'No tienes permiso para gestionar las reseñas de este negocio.'
    if (error.code === 'VALIDATION_ERROR' || error.status === 400)
        return 'El enlace debe ser una URL HTTPS válida de Google.'
    if (error.code === 'GOOGLE_REVIEW_LINK_NOT_FOUND' || error.status === 404)
        return 'Guarda primero un enlace de reseñas de Google.'
    return friendlyNotificationError(error, fallback)
}

function downloadPng(dataUrl: string | null, filename: string) {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    link.click()
}

type GoogleReviewsModalProps = {
    open: boolean
    onClose: () => void
}

export function GoogleReviewsModal({ open, onClose }: GoogleReviewsModalProps) {
    const { settings, save } = useGoogleReviews(open)
    const [url, setUrl] = useState('')
    const [validationError, setValidationError] = useState<string | null>(null)
    const [customDataUrl, setCustomDataUrl] = useState<string | null>(null)
    const [simpleDataUrl, setSimpleDataUrl] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (!open || !settings.data) return
        // Reset the form when the saved response arrives after the modal opens.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUrl(settings.data.link?.url ?? '')
        setValidationError(null)
    }, [open, settings.data])

    const isLoading = settings.isLoading || (open && settings.isFetching && !settings.data)
    const isSaving = save.isPending
    const savedUrl = settings.data?.link?.url ?? ''
    const businessName = settings.data?.business?.name ?? ''
    const businessLogoUrl = settings.data?.business?.logoUrl ?? null
    const businessCoverUrl = settings.data?.business?.coverUrl ?? null

    function clearPreviews() {
        setCustomDataUrl(null)
        setSimpleDataUrl(null)
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const normalizedUrl = url.trim()
        setValidationError(null)
        if (!normalizedUrl) {
            setValidationError('Ingresa el enlace de reseñas de Google.')
            return
        }
        if (normalizedUrl.length > 2048 || !isGoogleReviewUrl(normalizedUrl)) {
            setValidationError('Ingresa un enlace HTTPS válido de Google.')
            return
        }

        save.mutate(normalizedUrl, {
            onSuccess: (data) => {
                setUrl(data.link?.url ?? normalizedUrl)
                clearPreviews()
                notify.success({
                    title: 'Enlace guardado',
                    description: 'Tu enlace de reseñas de Google se actualizó correctamente.',
                })
            },
            onError: (error) => {
                const message = errorMessage(error, 'No pudimos guardar el enlace.')
                setValidationError(message)
                notify.error({ title: 'No se pudo guardar el enlace', description: message })
            },
        })
    }

    async function generatePreviews() {
        if (!savedUrl) {
            setValidationError('Guarda primero un enlace de reseñas de Google.')
            return
        }
        setValidationError(null)
        setIsGenerating(true)
        try {
            const cardData = {
                url: savedUrl,
                businessName,
                logoUrl: businessLogoUrl,
                coverUrl: businessCoverUrl,
            }
            const [custom, simple] = await Promise.all([
                buildCustomGoogleReviewsCard(cardData),
                buildSimpleGoogleReviewsQr(savedUrl),
            ])
            setCustomDataUrl(custom)
            setSimpleDataUrl(simple)
        } catch {
            const message = 'No pudimos generar las vistas previas del QR.'
            setValidationError(message)
            notify.error({ title: 'No se pudo generar el QR', description: message })
        } finally {
            setIsGenerating(false)
        }
    }

    useEffect(() => {
        if (!open || !savedUrl) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            clearPreviews()
            return
        }
        void generatePreviews()
        // Generate automatically from the authenticated business response.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, savedUrl, businessName, businessLogoUrl, businessCoverUrl])

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Google Reviews"
            description="Crea materiales listos para compartir y recibir más opiniones de tus clientes."
            size="lg"
        >
            {isLoading ? (
                <div
                    className="grid min-h-56 place-items-center text-sm text-[#65738A]"
                    aria-live="polite"
                >
                    <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="size-4 animate-spin" />
                        Cargando información de Google Reviews…
                    </span>
                </div>
            ) : settings.isError ? (
                <div className="space-y-4">
                    <p
                        className="rounded-xl border border-[#F0D7D7] bg-[#FFF9F9] p-4 text-sm text-[#9A3D3D]"
                        role="alert"
                    >
                        {errorMessage(
                            settings.error,
                            'No pudimos cargar la información de reseñas.',
                        )}
                    </p>
                    <button
                        type="button"
                        onClick={() => void settings.refetch()}
                        className="rounded-xl border border-[#C9D7EA] px-4 py-2.5 text-sm font-bold text-[#243556] transition hover:bg-[#F5F8FC]"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            ) : (
                <div className="space-y-7">
                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-[#DCE5F3] bg-[#F8FAFE] p-4 sm:p-5"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <label
                                    htmlFor="google-reviews-url"
                                    className="block text-sm font-semibold text-[#243556]"
                                >
                                    Enlace de reseñas de Google
                                </label>
                                <p className="mt-1.5 text-xs leading-5 text-[#7A879A]">
                                    Los dos QR dirigirán exactamente a este enlace.
                                </p>
                                <div className="relative mt-2">
                                    <ExternalLink className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-[#8996A9]" />
                                    <input
                                        id="google-reviews-url"
                                        type="url"
                                        value={url}
                                        onChange={(event) => {
                                            setUrl(event.target.value)
                                            clearPreviews()
                                            if (validationError) setValidationError(null)
                                        }}
                                        className={`${inputClass} pl-10`}
                                        placeholder="https://g.page/r/.../review"
                                        maxLength={2048}
                                        autoComplete="url"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving || !url.trim() || url.trim() === savedUrl}
                                aria-busy={isSaving}
                                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgb(30_64_175_/_0.18)] transition hover:bg-[#183991] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                {isSaving ? 'Guardando…' : 'Guardar enlace'}
                            </button>
                        </div>
                        {validationError && (
                            <p className="mt-3 text-sm text-[#B42318]" role="alert">
                                {validationError}
                            </p>
                        )}
                    </form>

                    {!savedUrl ? (
                        <div className="rounded-2xl border border-dashed border-[#C9D7EA] bg-white px-5 py-10 text-center">
                            <QrCode className="mx-auto size-8 text-[#9EB3D8]" />
                            <p className="mt-3 text-sm font-bold text-[#243556]">
                                Primero configura tu enlace de reseñas
                            </p>
                            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#7A879A]">
                                Guarda una URL de Google para poder generar y descargar cualquiera
                                de los dos QR.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                                        Materiales para compartir
                                    </p>
                                    <h3 className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A]">
                                        Elige cómo quieres pedir la opinión
                                    </h3>
                                </div>
                                {isGenerating && (
                                    <span
                                        className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-[#65738A]"
                                        aria-live="polite"
                                    >
                                        <LoaderCircle className="size-4 animate-spin" />
                                        Generando…
                                    </span>
                                )}
                            </div>
                            <div className="grid gap-5 md:grid-cols-2">
                                <QrOptionCard
                                    title="QR personalizado"
                                    description="Una tarjeta lista para imprimir, compartir o colocar en tu negocio."
                                    image={customDataUrl}
                                    alt="Vista previa del QR personalizado de Google Reviews"
                                    icon={<Sparkles className="size-4" />}
                                    loading={isGenerating}
                                    onDownload={() =>
                                        downloadPng(
                                            customDataUrl,
                                            'google-reviews-personalizado.png',
                                        )
                                    }
                                    downloadLabel="Descargar QR personalizado"
                                />
                                <QrOptionCard
                                    title="QR simple"
                                    description="Solo el código QR, con máxima claridad para impresión y escaneo."
                                    image={simpleDataUrl}
                                    alt="Vista previa del QR simple de Google Reviews"
                                    icon={<QrCode className="size-4" />}
                                    loading={isGenerating}
                                    onDownload={() =>
                                        downloadPng(simpleDataUrl, 'google-reviews-simple.png')
                                    }
                                    downloadLabel="Descargar QR simple"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    )
}

function QrOptionCard({
    title,
    description,
    image,
    alt,
    icon,
    loading,
    onDownload,
    downloadLabel,
}: {
    title: string
    description: string
    image: string | null
    alt: string
    icon: React.ReactNode
    loading: boolean
    onDownload: () => void
    downloadLabel: string
}) {
    return (
        <article className="overflow-hidden rounded-2xl border border-[#DCE5F3] bg-white shadow-[0_18px_45px_-34px_rgba(19,49,117,.45)]">
            <div className="border-b border-[#E8EEF6] px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#243556]">
                    <span className="grid size-8 place-items-center rounded-lg bg-[#EAF0FF] text-[#2451C5]">
                        {icon}
                    </span>
                    <h4>{title}</h4>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#7A879A]">{description}</p>
            </div>
            <div className="flex min-h-[360px] items-center justify-center bg-[#F5F8FC] p-4 sm:min-h-[420px] sm:p-5">
                {loading && !image ? (
                    <span
                        className="inline-flex items-center gap-2 text-xs text-[#65738A]"
                        aria-live="polite"
                    >
                        <LoaderCircle className="size-4 animate-spin" />
                        Preparando vista previa…
                    </span>
                ) : image ? (
                    <img
                        src={image}
                        alt={alt}
                        className="max-h-[390px] w-auto max-w-full rounded-lg object-contain shadow-[0_12px_28px_rgb(18_35_74_/_0.12)]"
                    />
                ) : (
                    <span className="text-xs text-[#8996A9]">La vista previa aparecerá aquí.</span>
                )}
            </div>
            <div className="p-4 sm:p-5">
                <button
                    type="button"
                    onClick={onDownload}
                    disabled={!image || loading}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-3 py-3 text-sm font-bold text-white transition hover:bg-[#183991] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="size-4" />
                    {downloadLabel}
                </button>
            </div>
        </article>
    )
}
