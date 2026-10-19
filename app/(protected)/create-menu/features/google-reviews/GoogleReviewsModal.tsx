/* eslint-disable @next/next/no-img-element -- Generated PNG previews are data URLs. */
'use client'

import { useEffect, useState } from 'react'
import {
    Check,
    Download,
    ExternalLink,
    LoaderCircle,
    QrCode,
    Save,
    Sparkles,
    Star,
} from 'lucide-react'
import { Modal } from '@/app/components/ui/Modal'
import { ApiError } from '@/app/auth/lib/client/api-error'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'
import { useGoogleReviews } from './useGoogleReviews'
import { getGoogleReviewTrackingUrl } from './googleReviewsApi'
import {
    buildCustomGoogleReviewsCard,
    buildMinimalGoogleReviewsCard,
    buildSimpleGoogleReviewsQr,
    getMinimalCardPalette,
    MINIMAL_CARD_PALETTES,
    type MinimalCardPaletteId,
} from './googleReviewsCard'

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
    const [minimalDataUrl, setMinimalDataUrl] = useState<string | null>(null)
    const [simpleDataUrl, setSimpleDataUrl] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [minimalPalette, setMinimalPalette] = useState<MinimalCardPaletteId>('sage')
    const [isMinimalGenerating, setIsMinimalGenerating] = useState(false)

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
    const qrCode = settings.data?.link?.qrCode ?? ''
    const trackingUrl = qrCode ? getGoogleReviewTrackingUrl(qrCode) : ''
    const businessName = settings.data?.business?.name ?? ''
    const businessLogoUrl = settings.data?.business?.logoUrl ?? null
    const businessCoverUrl = settings.data?.business?.coverUrl ?? null

    function clearPreviews() {
        setCustomDataUrl(null)
        setMinimalDataUrl(null)
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
        if (!trackingUrl) {
            setValidationError('No encontramos el enlace de seguimiento para este QR.')
            return
        }
        setValidationError(null)
        setIsGenerating(true)
        try {
            const cardData = {
                url: trackingUrl,
                businessName,
                logoUrl: businessLogoUrl,
                coverUrl: businessCoverUrl,
            }
            const [custom, simple] = await Promise.all([
                buildCustomGoogleReviewsCard(cardData),
                buildSimpleGoogleReviewsQr(trackingUrl),
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
        if (!trackingUrl) {
            // The backend tracking path is required; never encode the direct Google URL as fallback.
            setValidationError('No encontramos el enlace de seguimiento para este QR.')
            clearPreviews()
            return
        }
        void generatePreviews()
        // Generate automatically from the authenticated business response.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, savedUrl, trackingUrl, businessName, businessLogoUrl, businessCoverUrl])

    useEffect(() => {
        if (!open || !savedUrl || !trackingUrl) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMinimalDataUrl(null)
            setIsMinimalGenerating(false)
            return
        }

        let isCurrent = true
        const cardData = {
            url: trackingUrl,
            businessName,
            logoUrl: businessLogoUrl,
            coverUrl: businessCoverUrl,
        }
        setIsMinimalGenerating(true)
        void buildMinimalGoogleReviewsCard(cardData, minimalPalette)
            .then((dataUrl) => {
                if (isCurrent) setMinimalDataUrl(dataUrl)
            })
            .catch(() => {
                if (!isCurrent) return
                const message = 'No pudimos generar la vista previa minimalista.'
                setValidationError(message)
                notify.error({ title: 'No se pudo actualizar el color', description: message })
            })
            .finally(() => {
                if (isCurrent) setIsMinimalGenerating(false)
            })

        return () => {
            isCurrent = false
        }
    }, [
        open,
        savedUrl,
        trackingUrl,
        businessName,
        businessLogoUrl,
        businessCoverUrl,
        minimalPalette,
    ])

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Invita a compartir su experiencia"
            description="Elige un diseño para imprimirlo o compartirlo con tus clientes."
            size="xl"
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
                                    Los QR registran cada visita y después abren este enlace de
                                    Google.
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
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[.15em] text-[#2451C5]">
                                        Materiales para compartir
                                    </p>
                                    <h3 className="mt-1 font-display text-2xl tracking-[-.04em] text-[#12234A] sm:text-3xl">
                                        Tres formas de invitar a opinar
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
                            <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
                                <QrOptionCard
                                    eyebrow="01 · DESTACADO"
                                    title="Premium personalizado"
                                    description="Tu portada, tu logotipo y una invitación a dejar una reseña."
                                    image={customDataUrl}
                                    alt="Vista previa del QR personalizado de Google Reviews"
                                    icon={<Sparkles className="size-4" />}
                                    variant="premium"
                                    loading={isGenerating}
                                    onDownload={() =>
                                        downloadPng(
                                            customDataUrl,
                                            'google-reviews-personalizado.png',
                                        )
                                    }
                                    downloadLabel="Descargar diseño premium"
                                />
                                <QrOptionCard
                                    eyebrow="02 · CON PERSONALIDAD"
                                    title="Minimalista con personalidad"
                                    description="Color, contraste y un mensaje breve para destacar en tu mostrador."
                                    image={minimalDataUrl}
                                    alt="Vista previa del QR minimalista para invitar a dejar una reseña"
                                    icon={<Star className="size-4" />}
                                    variant="minimal"
                                    loading={isGenerating || isMinimalGenerating}
                                    paletteSelector={
                                        <div
                                            className="mt-3"
                                            aria-label="Color del diseño minimalista"
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-[#52627B]">
                                                    Elige un color
                                                </span>
                                                <span
                                                    className="text-xs font-bold text-[#243556]"
                                                    aria-live="polite"
                                                >
                                                    {getMinimalCardPalette(minimalPalette).name}
                                                </span>
                                            </div>
                                            <fieldset className="flex flex-wrap gap-2">
                                                <legend className="sr-only">
                                                    Color de la tarjeta
                                                </legend>
                                                {MINIMAL_CARD_PALETTES.map((palette) => {
                                                    const selected = minimalPalette === palette.id
                                                    return (
                                                        <label
                                                            key={palette.id}
                                                            title={palette.name}
                                                            className="cursor-pointer"
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="minimal-card-palette"
                                                                value={palette.id}
                                                                checked={selected}
                                                                onChange={() =>
                                                                    setMinimalPalette(palette.id)
                                                                }
                                                                aria-label={palette.name}
                                                                className="peer sr-only"
                                                            />
                                                            <span
                                                                className={`grid size-9 place-items-center rounded-full border-2 transition peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-[#1E40AF]/20 ${selected ? 'border-[#12234A] ring-2 ring-white' : 'border-white shadow-[0_0_0_1px_#DCE5F3] hover:scale-105'}`}
                                                            >
                                                                <span
                                                                    className="grid size-6 place-items-center rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            palette.dark,
                                                                    }}
                                                                >
                                                                    {selected && (
                                                                        <Check
                                                                            className="size-3.5 text-white"
                                                                            strokeWidth={3}
                                                                        />
                                                                    )}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    )
                                                })}
                                            </fieldset>
                                        </div>
                                    }
                                    onDownload={() =>
                                        downloadPng(
                                            minimalDataUrl,
                                            'google-reviews-minimalista.png',
                                        )
                                    }
                                    downloadLabel="Descargar diseño minimalista"
                                />
                            </div>
                            <div className="flex flex-col gap-3 border-t border-[#E8EEF6] pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[#243556]">
                                        ¿Prefieres solo el código?
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[#7A879A]">
                                        QR en blanco y negro, sin tarjeta ni elementos adicionales.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        downloadPng(simpleDataUrl, 'google-reviews-simple.png')
                                    }
                                    disabled={!simpleDataUrl || isGenerating}
                                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#DCE5F3] bg-white px-4 py-2.5 text-sm font-semibold text-[#52627B] transition hover:border-[#AEBED8] hover:bg-[#F8FAFE] hover:text-[#243556] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
                                >
                                    <Download className="size-4" />
                                    Descargar QR sencillo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    )
}

function QrOptionCard({
    eyebrow,
    title,
    description,
    image,
    alt,
    icon,
    variant,
    loading,
    paletteSelector,
    onDownload,
    downloadLabel,
}: {
    eyebrow: string
    title: string
    description: string
    image: string | null
    alt: string
    icon: React.ReactNode
    variant: 'premium' | 'minimal'
    loading: boolean
    paletteSelector?: React.ReactNode
    onDownload: () => void
    downloadLabel: string
}) {
    return (
        <article
            className={`overflow-hidden rounded-2xl border bg-white ${
                variant === 'premium'
                    ? 'border-[#C9D6EF] shadow-[0_18px_45px_-34px_rgba(19,49,117,.5)]'
                    : 'border-[#DCE5F3]'
            }`}
        >
            <div className="px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
                <p
                    className={`text-[10px] font-extrabold tracking-[.16em] ${
                        variant === 'premium' ? 'text-[#2451C5]' : 'text-[#557565]'
                    }`}
                >
                    {eyebrow}
                </p>
                <div className="mt-2 flex items-start gap-2.5 text-sm font-bold text-[#243556]">
                    <span
                        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
                            variant === 'premium'
                                ? 'bg-[#EAF0FF] text-[#2451C5]'
                                : 'bg-[#E7EAD8] text-[#25483E]'
                        }`}
                    >
                        {icon}
                    </span>
                    <h4 className="text-base leading-6 sm:text-lg">{title}</h4>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#7A879A] sm:min-h-10">{description}</p>
            </div>
            <div
                className={`flex min-h-[300px] items-center justify-center p-3 sm:min-h-[400px] sm:p-5 ${
                    variant === 'premium' ? 'bg-[#F2F5FA]' : 'bg-[#F3F4EC]'
                }`}
            >
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
                        className="max-h-[460px] w-auto max-w-full rounded-md object-contain shadow-[0_12px_28px_rgb(18_35_74_/_0.12)]"
                    />
                ) : (
                    <span className="text-xs text-[#8996A9]">La vista previa aparecerá aquí.</span>
                )}
            </div>
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <div className="m-3">{paletteSelector}</div>
                <button
                    type="button"
                    onClick={onDownload}
                    disabled={!image || loading}
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                        variant === 'premium'
                            ? 'bg-[#1E40AF] shadow-[0_10px_22px_rgb(30_64_175_/_0.18)] hover:bg-[#183991] focus-visible:ring-[#1E40AF]/20'
                            : 'bg-[#25483E] hover:bg-[#1C3A32] focus-visible:ring-[#25483E]/20'
                    }`}
                >
                    <Download className="size-4" />
                    {downloadLabel}
                </button>
            </div>
        </article>
    )
}
