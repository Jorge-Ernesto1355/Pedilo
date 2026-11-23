'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Play, RotateCcw, Stamp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { LoyaltyCard } from '@/app/components/loyalty/LoyaltyCard'
import {
    StampIconPreview,
    StampShapePath,
    STAMP_ICON_LABELS,
    STAMP_SHAPE_LABELS,
} from '@/app/components/loyalty/LoyaltyGlyphs'
import {
    applyTemplate,
    contrastIssues,
    designFromTemplate,
    DESIGN_SUBTITLE_MAX_LENGTH,
    DESIGN_TEMPLATES,
    DESIGN_TITLE_MAX_LENGTH,
    fixDesignContrast,
    FONT_STACKS,
    LOYALTY_TEMPLATES,
    STAMP_ICONS,
    STAMP_SHAPES,
    type DesignTemplate,
    type LoyaltyDesign,
} from '@/app/components/loyalty/loyaltyDesign'
import {
    loyaltyErrorMessage,
    loyaltyQueryKeys,
    saveLoyaltyProgram,
    type LoyaltyProgram,
} from '@/app/components/loyalty/loyaltyOwnerApi'
import { Modal } from '@/app/components/ui/Modal'
import { notify } from '@/src/lib/notifications/notify'
import { getProducts } from '../product-management/productApi'
import type { CurrentBusiness } from '../business-profile/useCurrentBusiness'
import { applyLogoPalette, extractLogoPalette } from './logoPalette'
import {
    CheckboxField,
    ColorField,
    EditorSection,
    fieldError,
    fieldInput,
    fieldLabel,
    OptionGroup,
    RangeField,
    TextField,
    useIsDesktop,
} from './LoyaltyEditorFields'
import {
    draftFromProgram,
    draftRewardLabel,
    draftToInput,
    previewStampsRequired,
    sameDraft,
    validateDraft,
    type LoyaltyDraft,
} from './loyaltyEditorModel'

const SECTIONS = [
    'plantilla',
    'colores',
    'fondo',
    'sello',
    'texto',
    'tarjeta',
    'animacion',
    'programa',
] as const
type SectionId = (typeof SECTIONS)[number]

const primaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1B3A9E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/25 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D7E1EF] bg-white px-3.5 py-2.5 text-sm font-bold text-[#243556] transition hover:border-[#9EB3D8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15 disabled:cursor-not-allowed disabled:opacity-50'

type Props = {
    program: LoyaltyProgram
    business?: CurrentBusiness
}

export function LoyaltyEditor({ program, business }: Props) {
    const client = useQueryClient()
    const restaurantName = business?.name ?? 'Mi restaurante'
    const logoUrl = business?.logoUrl ?? null
    const desktop = useIsDesktop()
    const [baseline, setBaseline] = useState<LoyaltyDraft>(() =>
        draftFromProgram(program, restaurantName),
    )
    const [draft, setDraft] = useState<LoyaltyDraft>(baseline)
    const [exists, setExists] = useState(program.exists)
    const [enabled, setEnabled] = useState(program.enabled)
    const [open, setOpen] = useState<Record<SectionId, boolean>>(
        () =>
            Object.fromEntries(SECTIONS.map((id) => [id, desktop || id === 'plantilla'])) as Record<
                SectionId,
                boolean
            >,
    )
    const required = previewStampsRequired(draft)
    const [simulated, setSimulated] = useState(() => Math.min(3, required))
    const [animation, setAnimation] = useState<{ from: number | null; key: number }>({
        from: null,
        key: 0,
    })
    const [resetOpen, setResetOpen] = useState(false)
    const [disableOpen, setDisableOpen] = useState(false)
    const [palette, setPalette] = useState<string[]>([])

    const errors = useMemo(() => validateDraft(draft), [draft])
    const valid = Object.keys(errors).length === 0
    const dirty = !exists || !sameDraft(draft, baseline)
    const issues = useMemo(() => contrastIssues(draft.design), [draft.design])
    const shownSimulated = Math.min(simulated, required)

    const products = useQuery({
        queryKey: ['loyalty', 'reward-products'],
        queryFn: getProducts,
        enabled: draft.rewardType === 'FREE_PRODUCT',
        staleTime: 60_000,
    })
    const rewardProductName =
        products.data?.find((product) => product.id === draft.rewardProductId)?.name ??
        (draft.rewardProductId === program.rewardProductId
            ? (program.rewardProduct?.name ?? null)
            : null)
    const rewardLabel = draftRewardLabel(draft, rewardProductName)

    // Paleta sugerida desde el logo (si el servidor de imágenes lo permite).
    useEffect(() => {
        if (!logoUrl) return
        let active = true
        void extractLogoPalette(logoUrl).then((colors) => {
            if (active) setPalette(colors)
        })
        return () => {
            active = false
        }
    }, [logoUrl])

    // Aviso al salir con cambios sin guardar (recarga, cierre o enlaces internos).
    useEffect(() => {
        if (!dirty || !exists) return
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }
        const onClick = (event: MouseEvent) => {
            const anchor = (event.target as Element | null)?.closest?.(
                'a[href]',
            ) as HTMLAnchorElement | null
            if (!anchor || anchor.target === '_blank' || event.defaultPrevented) return
            if (
                anchor.origin !== window.location.origin ||
                anchor.pathname === window.location.pathname
            )
                return
            if (
                !window.confirm(
                    'Tienes cambios sin guardar en tu tarjeta de lealtad. ¿Salir sin guardar?',
                )
            ) {
                event.preventDefault()
                event.stopPropagation()
            }
        }
        window.addEventListener('beforeunload', onBeforeUnload)
        document.addEventListener('click', onClick, true)
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload)
            document.removeEventListener('click', onClick, true)
        }
    }, [dirty, exists])

    const save = useMutation({
        mutationFn: () => saveLoyaltyProgram(draftToInput(draft, enabled)),
        onSuccess: (saved) => {
            client.setQueryData(loyaltyQueryKeys.program, saved)
            setBaseline(draftFromProgram(saved, restaurantName))
            setDraft(draftFromProgram(saved, restaurantName))
            setExists(true)
            notify.success({
                title: exists ? 'Tarjeta guardada' : 'Tarjeta de lealtad creada',
                description: 'Tus clientes ya la ven con este diseño.',
            })
        },
    })

    const toggleEnabled = useMutation({
        mutationFn: (next: boolean) => saveLoyaltyProgram(draftToInput(baseline, next)),
        onSuccess: (saved) => {
            client.setQueryData(loyaltyQueryKeys.program, saved)
            setEnabled(saved.enabled)
            setDisableOpen(false)
            notify.success({
                title: saved.enabled ? 'Tarjeta de lealtad activa' : 'Tarjeta de lealtad pausada',
                description: saved.enabled
                    ? 'Tus clientes vuelven a juntar sellos.'
                    : 'Las tarjetas, sellos y premios se conservan.',
            })
        },
        onError: (error) =>
            notify.error({
                title: 'No pudimos cambiar el estado',
                description: loyaltyErrorMessage(error),
            }),
    })

    const updateDesign = (change: (design: LoyaltyDesign) => LoyaltyDesign) =>
        setDraft((current) => ({ ...current, design: change(current.design) }))
    const update = <K extends keyof LoyaltyDraft>(key: K, value: LoyaltyDraft[K]) =>
        setDraft((current) => ({ ...current, [key]: value }))
    const toggle = (id: SectionId) => setOpen((current) => ({ ...current, [id]: !current[id] }))

    const testAnimation = () => {
        const target = shownSimulated >= required ? required : shownSimulated + 1
        setSimulated(target)
        setAnimation((current) => ({ from: target - 1, key: current.key + 1 }))
    }

    const design = draft.design

    return (
        <div className="@container mt-5">
            {/* Dos columnas según el ancho de la tarjeta de Ajustes, no el de la pantalla. */}
            <div className="@3xl:grid @3xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] @3xl:items-start @3xl:gap-8">
                {/* Vista previa: fija arriba en celular (compacta) y a la derecha en escritorio. */}
                <div
                    data-cy="loyalty-preview"
                    className="sticky top-0 z-20 -mx-5 mb-4 border-b border-[#E8EEF6] bg-white/95 px-5 py-3 sm:-mx-6 sm:px-6 @3xl:order-2 @3xl:top-24 @3xl:mx-0 @3xl:mb-0 @3xl:border-0 @3xl:bg-transparent @3xl:p-0"
                >
                    <LoyaltyCard
                        design={design}
                        stampsCount={shownSimulated}
                        stampsRequired={required}
                        rewardAvailable={shownSimulated >= required}
                        rewardLabel={rewardLabel}
                        restaurantName={restaurantName}
                        logoUrl={logoUrl}
                        variant="preview"
                        animateFrom={animation.from}
                        replayKey={animation.key}
                        className="lc-dense"
                    />
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                        <RangeField
                            label="Simular sellos"
                            value={shownSimulated}
                            min={0}
                            max={required}
                            onChange={(value) => {
                                setSimulated(value)
                                setAnimation((current) => ({ from: null, key: current.key }))
                            }}
                            format={(value) => `${value} de ${required}`}
                            testId="loyalty-simulate"
                        />
                        <button
                            type="button"
                            onClick={testAnimation}
                            data-cy="loyalty-test-animation"
                            className={secondaryButton}
                        >
                            <Play aria-hidden="true" className="size-4" />
                            <span className="hidden sm:inline">Probar animación</span>
                            <span className="sm:hidden">Probar</span>
                        </button>
                    </div>
                    {issues.length > 0 ? (
                        <div
                            role="status"
                            data-cy="loyalty-contrast-warning"
                            className="mt-3 flex flex-wrap items-start gap-3 rounded-xl border border-[#F1D9A8] bg-[#FFF9EC] p-3 text-sm text-[#7A4B00]"
                        >
                            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                            <p className="min-w-0 flex-1">
                                Poco contraste en{' '}
                                {issues
                                    .map(
                                        (issue) =>
                                            `${issue.label.toLowerCase()} (${issue.ratio.toFixed(1)}:1, mínimo ${issue.minimum})`,
                                    )
                                    .join(', ')}
                                . Puede costar leer la tarjeta.
                            </p>
                            <button
                                type="button"
                                data-cy="loyalty-contrast-fix"
                                onClick={() => updateDesign(fixDesignContrast)}
                                className="min-h-11 rounded-xl border border-[#E7C982] bg-white px-3 py-2 text-xs font-bold text-[#7A4B00]"
                            >
                                Corregir automáticamente
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="@3xl:order-1">
                    <EditorSection
                        id="plantilla"
                        title="Plantilla"
                        summary={LOYALTY_TEMPLATES[design.template].label}
                        open={open.plantilla}
                        onToggle={() => toggle('plantilla')}
                    >
                        <OptionGroup<DesignTemplate>
                            legend="Plantilla de partida"
                            hideLegend
                            name="loyalty-template"
                            testId="loyalty-template"
                            value={design.template}
                            columns={3}
                            onChange={(template) =>
                                updateDesign((current) => applyTemplate(current, template))
                            }
                            options={DESIGN_TEMPLATES.map((template) => ({
                                value: template,
                                label: LOYALTY_TEMPLATES[template].label,
                                preview: (
                                    <TemplateThumb
                                        design={designFromTemplate(template, restaurantName)}
                                    />
                                ),
                            }))}
                        />
                        <p className="mt-2 text-xs text-[#65738A]">
                            Elegir una plantilla cambia el diseño completo; después puedes
                            ajustarlo.
                        </p>
                    </EditorSection>

                    <EditorSection
                        id="colores"
                        title="Colores"
                        open={open.colores}
                        onToggle={() => toggle('colores')}
                    >
                        {palette.length > 0 ? (
                            <div
                                className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#E1E8F3] bg-[#FBFCFE] p-3"
                                data-cy="loyalty-logo-palette"
                            >
                                <span className="text-xs font-semibold text-[#53647D]">
                                    Colores de tu logo
                                </span>
                                <span className="flex gap-1.5" aria-hidden="true">
                                    {palette.map((color) => (
                                        <span
                                            key={color}
                                            className="size-6 rounded-full border border-black/10"
                                            style={{ background: color }}
                                        />
                                    ))}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        updateDesign((current) =>
                                            applyLogoPalette(current, palette),
                                        )
                                    }
                                    className="ml-auto min-h-11 rounded-xl border border-[#D7E1EF] bg-white px-3 py-2 text-xs font-bold text-[#243556]"
                                >
                                    Usar estos colores
                                </button>
                            </div>
                        ) : null}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <ColorField
                                label={
                                    design.background.type === 'gradient'
                                        ? 'Fondo (inicio)'
                                        : 'Fondo'
                                }
                                value={design.background.color1}
                                testId="loyalty-color-bg1"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        background: { ...current.background, color1: value },
                                    }))
                                }
                            />
                            {design.background.type === 'gradient' ? (
                                <ColorField
                                    label="Fondo (final)"
                                    value={design.background.color2}
                                    testId="loyalty-color-bg2"
                                    onChange={(value) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            background: { ...current.background, color2: value },
                                        }))
                                    }
                                />
                            ) : null}
                            <ColorField
                                label="Texto"
                                value={design.text.primaryColor}
                                testId="loyalty-color-text"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        text: { ...current.text, primaryColor: value },
                                    }))
                                }
                            />
                            <ColorField
                                label="Texto secundario"
                                value={design.text.secondaryColor}
                                testId="loyalty-color-text2"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        text: { ...current.text, secondaryColor: value },
                                    }))
                                }
                            />
                            <ColorField
                                label="Sello lleno"
                                value={design.stamp.filledColor}
                                testId="loyalty-color-stamp"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, filledColor: value },
                                    }))
                                }
                            />
                            <ColorField
                                label="Ícono del sello"
                                value={design.stamp.iconColor}
                                testId="loyalty-color-icon"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, iconColor: value },
                                    }))
                                }
                            />
                            <ColorField
                                label="Sello vacío"
                                value={design.stamp.emptyColor}
                                testId="loyalty-color-empty"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, emptyColor: value },
                                    }))
                                }
                            />
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="fondo"
                        title="Fondo"
                        summary={
                            { solid: 'Sólido', gradient: 'Degradado', pattern: 'Patrón' }[
                                design.background.type
                            ]
                        }
                        open={open.fondo}
                        onToggle={() => toggle('fondo')}
                    >
                        <div className="grid gap-4">
                            <OptionGroup
                                legend="Tipo de fondo"
                                name="loyalty-background-type"
                                testId="loyalty-background-type"
                                value={design.background.type}
                                onChange={(type) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        background: {
                                            ...current.background,
                                            type,
                                            pattern:
                                                type === 'pattern' &&
                                                current.background.pattern === 'none'
                                                    ? 'dots'
                                                    : current.background.pattern,
                                        },
                                    }))
                                }
                                options={[
                                    { value: 'solid', label: 'Sólido' },
                                    { value: 'gradient', label: 'Degradado' },
                                    { value: 'pattern', label: 'Patrón' },
                                ]}
                            />
                            {design.background.type === 'gradient' ? (
                                <RangeField
                                    label="Ángulo del degradado"
                                    value={design.background.angle}
                                    min={0}
                                    max={360}
                                    step={5}
                                    format={(value) => `${value}°`}
                                    testId="loyalty-background-angle"
                                    onChange={(value) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            background: { ...current.background, angle: value },
                                        }))
                                    }
                                />
                            ) : null}
                            {design.background.type === 'pattern' ? (
                                <>
                                    <OptionGroup
                                        legend="Patrón"
                                        name="loyalty-background-pattern"
                                        testId="loyalty-background-pattern"
                                        value={design.background.pattern}
                                        columns={5}
                                        onChange={(pattern) =>
                                            updateDesign((current) => ({
                                                ...current,
                                                background: { ...current.background, pattern },
                                            }))
                                        }
                                        options={[
                                            { value: 'dots', label: 'Puntos' },
                                            { value: 'grid', label: 'Cuadrícula' },
                                            { value: 'waves', label: 'Ondas' },
                                            { value: 'diagonal', label: 'Diagonal' },
                                            { value: 'confetti', label: 'Confeti' },
                                        ]}
                                    />
                                    <RangeField
                                        label="Opacidad del patrón"
                                        value={Math.round(design.background.patternOpacity * 100)}
                                        min={0}
                                        max={60}
                                        step={2}
                                        format={(value) => `${value}%`}
                                        testId="loyalty-background-opacity"
                                        onChange={(value) =>
                                            updateDesign((current) => ({
                                                ...current,
                                                background: {
                                                    ...current.background,
                                                    patternOpacity: value / 100,
                                                },
                                            }))
                                        }
                                    />
                                </>
                            ) : null}
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="sello"
                        title="Sello"
                        summary={`${STAMP_SHAPE_LABELS[design.stamp.shape]} · ${STAMP_ICON_LABELS[design.stamp.icon]}`}
                        open={open.sello}
                        onToggle={() => toggle('sello')}
                    >
                        <div className="grid gap-4">
                            <OptionGroup
                                legend="Forma"
                                name="loyalty-stamp-shape"
                                testId="loyalty-stamp-shape"
                                value={design.stamp.shape}
                                columns={6}
                                onChange={(shape) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, shape },
                                    }))
                                }
                                options={STAMP_SHAPES.map((shape) => ({
                                    value: shape,
                                    label: STAMP_SHAPE_LABELS[shape],
                                    preview: (
                                        <svg
                                            viewBox="0 0 48 48"
                                            className="size-6"
                                            aria-hidden="true"
                                        >
                                            <StampShapePath shape={shape} fill="currentColor" />
                                        </svg>
                                    ),
                                }))}
                            />
                            <OptionGroup
                                legend="Ícono"
                                name="loyalty-stamp-icon"
                                testId="loyalty-stamp-icon"
                                value={design.stamp.icon}
                                columns={5}
                                onChange={(icon) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, icon },
                                    }))
                                }
                                options={STAMP_ICONS.map((icon) => ({
                                    value: icon,
                                    label: STAMP_ICON_LABELS[icon],
                                    preview: <StampIconPreview icon={icon} className="size-5" />,
                                }))}
                            />
                            <OptionGroup
                                legend="Tamaño"
                                name="loyalty-stamp-size"
                                testId="loyalty-stamp-size"
                                value={design.stamp.size}
                                onChange={(size) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, size },
                                    }))
                                }
                                options={[
                                    { value: 'sm', label: 'Chico' },
                                    { value: 'md', label: 'Mediano' },
                                    { value: 'lg', label: 'Grande' },
                                ]}
                            />
                            <OptionGroup
                                legend="Espacio vacío"
                                name="loyalty-stamp-empty"
                                testId="loyalty-stamp-empty"
                                value={design.stamp.emptyStyle}
                                columns={4}
                                onChange={(emptyStyle) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        stamp: { ...current.stamp, emptyStyle },
                                    }))
                                }
                                options={[
                                    { value: 'outline', label: 'Contorno' },
                                    { value: 'dashed', label: 'Punteado' },
                                    { value: 'dimmed', label: 'Tenue' },
                                    { value: 'number', label: 'Número' },
                                ]}
                            />
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="texto"
                        title="Texto"
                        summary={design.text.title || restaurantName}
                        open={open.texto}
                        onToggle={() => toggle('texto')}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Título"
                                value={design.text.title}
                                maxLength={DESIGN_TITLE_MAX_LENGTH}
                                placeholder={restaurantName}
                                error={errors.title}
                                testId="loyalty-title"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        text: { ...current.text, title: value },
                                    }))
                                }
                            />
                            <TextField
                                label="Subtítulo"
                                value={design.text.subtitle}
                                maxLength={DESIGN_SUBTITLE_MAX_LENGTH}
                                placeholder="Tarjeta de lealtad"
                                error={errors.subtitle}
                                testId="loyalty-subtitle"
                                onChange={(value) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        text: { ...current.text, subtitle: value },
                                    }))
                                }
                            />
                            <div className="sm:col-span-2">
                                <OptionGroup
                                    legend="Fuente"
                                    name="loyalty-font"
                                    testId="loyalty-font"
                                    value={design.text.font}
                                    columns={5}
                                    onChange={(font) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            text: { ...current.text, font },
                                        }))
                                    }
                                    options={(
                                        [
                                            ['sans', 'Sans'],
                                            ['serif', 'Serif'],
                                            ['rounded', 'Redondeada'],
                                            ['mono', 'Mono'],
                                            ['display', 'Display'],
                                        ] as const
                                    ).map(([value, label]) => ({
                                        value,
                                        label,
                                        preview: (
                                            <span
                                                aria-hidden="true"
                                                className="text-base"
                                                style={{ fontFamily: FONT_STACKS[value] }}
                                            >
                                                Aa
                                            </span>
                                        ),
                                    }))}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <CheckboxField
                                    label="Mostrar logo"
                                    description={
                                        logoUrl
                                            ? 'Se muestra junto al título.'
                                            : 'Agrega el logo de tu negocio para mostrarlo.'
                                    }
                                    checked={design.text.showLogo}
                                    disabled={!logoUrl}
                                    testId="loyalty-show-logo"
                                    onChange={(showLogo) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            text: { ...current.text, showLogo },
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="tarjeta"
                        title="Tarjeta"
                        open={open.tarjeta}
                        onToggle={() => toggle('tarjeta')}
                    >
                        <div className="grid gap-4">
                            <OptionGroup
                                legend="Esquinas"
                                name="loyalty-card-radius"
                                testId="loyalty-card-radius"
                                value={design.card.radius}
                                columns={5}
                                onChange={(radius) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        card: { ...current.card, radius },
                                    }))
                                }
                                options={[
                                    { value: 'none', label: 'Rectas' },
                                    { value: 'sm', label: 'Chicas' },
                                    { value: 'md', label: 'Medianas' },
                                    { value: 'lg', label: 'Grandes' },
                                    { value: 'xl', label: 'Muy redondas' },
                                ]}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <CheckboxField
                                    label="Borde"
                                    checked={design.card.border}
                                    testId="loyalty-card-border"
                                    onChange={(border) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            card: { ...current.card, border },
                                        }))
                                    }
                                />
                                <CheckboxField
                                    label="Sombra suave"
                                    checked={design.card.shadow === 'soft'}
                                    testId="loyalty-card-shadow"
                                    onChange={(soft) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            card: {
                                                ...current.card,
                                                shadow: soft ? 'soft' : 'none',
                                            },
                                        }))
                                    }
                                />
                            </div>
                            {design.card.border ? (
                                <ColorField
                                    label="Color del borde"
                                    value={design.card.borderColor}
                                    testId="loyalty-color-border"
                                    onChange={(value) =>
                                        updateDesign((current) => ({
                                            ...current,
                                            card: { ...current.card, borderColor: value },
                                        }))
                                    }
                                />
                            ) : null}
                            <OptionGroup
                                legend="Columnas"
                                name="loyalty-columns"
                                testId="loyalty-columns"
                                value={design.layout.columns}
                                columns={6}
                                onChange={(columns) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        layout: { ...current.layout, columns },
                                    }))
                                }
                                options={(['auto', 2, 3, 4, 5, 6] as const).map((value) => ({
                                    value,
                                    label: value === 'auto' ? 'Auto' : String(value),
                                }))}
                            />
                            <CheckboxField
                                label="El último espacio es el premio"
                                description="Muestra un regalo en el último sello y se ilumina al completar."
                                checked={design.layout.rewardSlot === 'icon'}
                                testId="loyalty-reward-slot"
                                onChange={(icon) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        layout: {
                                            ...current.layout,
                                            rewardSlot: icon ? 'icon' : 'none',
                                        },
                                    }))
                                }
                            />
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="animacion"
                        title="Animación"
                        open={open.animacion}
                        onToggle={() => toggle('animacion')}
                    >
                        <div className="grid gap-4">
                            <OptionGroup
                                legend="Efecto del sello"
                                name="loyalty-stamp-effect"
                                testId="loyalty-stamp-effect"
                                value={design.animation.stampEffect}
                                columns={5}
                                onChange={(stampEffect) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        animation: { ...current.animation, stampEffect },
                                    }))
                                }
                                options={[
                                    { value: 'press', label: 'Presión' },
                                    { value: 'pop', label: 'Pop' },
                                    { value: 'ink', label: 'Tinta' },
                                    { value: 'spin', label: 'Giro' },
                                    { value: 'bounce', label: 'Rebote' },
                                ]}
                            />
                            <OptionGroup
                                legend="Al completar"
                                name="loyalty-completion-effect"
                                testId="loyalty-completion-effect"
                                value={design.animation.completionEffect}
                                columns={4}
                                onChange={(completionEffect) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        animation: { ...current.animation, completionEffect },
                                    }))
                                }
                                options={[
                                    { value: 'confetti', label: 'Confeti' },
                                    { value: 'sparkles', label: 'Destellos' },
                                    { value: 'glow', label: 'Resplandor' },
                                    { value: 'none', label: 'Ninguno' },
                                ]}
                            />
                            <OptionGroup
                                legend="Velocidad"
                                name="loyalty-speed"
                                testId="loyalty-speed"
                                value={design.animation.speed}
                                onChange={(speed) =>
                                    updateDesign((current) => ({
                                        ...current,
                                        animation: { ...current.animation, speed },
                                    }))
                                }
                                options={[
                                    { value: 'slow', label: 'Lenta' },
                                    { value: 'normal', label: 'Normal' },
                                    { value: 'fast', label: 'Rápida' },
                                ]}
                            />
                            <button
                                type="button"
                                onClick={testAnimation}
                                className={`${secondaryButton} w-full sm:w-auto sm:justify-self-start`}
                            >
                                <Play aria-hidden="true" className="size-4" />
                                Probar animación
                            </button>
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="programa"
                        title="Programa"
                        summary={`${draft.stampsRequired || '—'} sellos · ${rewardLabel}`}
                        open={open.programa}
                        onToggle={() => toggle('programa')}
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                                label="Sellos para completar"
                                value={draft.stampsRequired}
                                inputMode="numeric"
                                hint="De 3 a 20."
                                error={errors.stampsRequired}
                                testId="loyalty-stamps-required"
                                onChange={(value) =>
                                    update(
                                        'stampsRequired',
                                        value.replace(/[^\d]/g, '').slice(0, 2),
                                    )
                                }
                            />
                            <TextField
                                label="Monto mínimo del pedido"
                                value={draft.minOrderAmount}
                                inputMode="decimal"
                                prefix="$"
                                hint="Sin contar envío. 0 = cualquier pedido."
                                error={errors.minOrderAmount}
                                testId="loyalty-min-order"
                                onChange={(value) =>
                                    update('minOrderAmount', value.replace(/[^\d.]/g, ''))
                                }
                            />
                            <div className="sm:col-span-2">
                                <OptionGroup
                                    legend="Cómo se da el sello"
                                    name="loyalty-stamp-mode"
                                    testId="loyalty-stamp-mode"
                                    value={draft.stampMode}
                                    columns={2}
                                    onChange={(value) => update('stampMode', value)}
                                    options={[
                                        {
                                            value: 'MANUAL',
                                            label: 'Manual',
                                            description:
                                                'Tú das el sello al finalizar cada pedido.',
                                        },
                                        {
                                            value: 'AUTO',
                                            label: 'Automático',
                                            description: 'Se sella solo al finalizar el pedido.',
                                        },
                                    ]}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <OptionGroup
                                    legend="Premio"
                                    name="loyalty-reward-type"
                                    testId="loyalty-reward-type"
                                    value={draft.rewardType}
                                    onChange={(value) =>
                                        setDraft((current) => ({
                                            ...current,
                                            rewardType: value,
                                            rewardValue:
                                                value === 'PERCENT'
                                                    ? '20'
                                                    : value === 'FIXED'
                                                      ? '50'
                                                      : '',
                                        }))
                                    }
                                    options={[
                                        { value: 'PERCENT', label: 'Porcentaje' },
                                        { value: 'FIXED', label: 'Monto fijo' },
                                        { value: 'FREE_PRODUCT', label: 'Producto gratis' },
                                    ]}
                                />
                            </div>
                            {draft.rewardType === 'FREE_PRODUCT' ? (
                                <div className="sm:col-span-2">
                                    <label htmlFor="loyalty-reward-product" className={fieldLabel}>
                                        Producto del premio
                                    </label>
                                    <select
                                        id="loyalty-reward-product"
                                        data-cy="loyalty-reward-product"
                                        value={draft.rewardProductId ?? ''}
                                        aria-invalid={Boolean(errors.rewardProductId)}
                                        onChange={(event) =>
                                            update('rewardProductId', event.target.value || null)
                                        }
                                        className={fieldInput}
                                    >
                                        <option value="">
                                            {products.isLoading
                                                ? 'Cargando productos…'
                                                : 'Elige un producto'}
                                        </option>
                                        {(products.data ?? []).map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} · ${Number(product.price).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                    {products.isError ? (
                                        <span className={fieldError}>
                                            No pudimos cargar tus productos.
                                        </span>
                                    ) : null}
                                    {errors.rewardProductId ? (
                                        <span role="alert" className={fieldError}>
                                            {errors.rewardProductId}
                                        </span>
                                    ) : null}
                                </div>
                            ) : (
                                <TextField
                                    label={
                                        draft.rewardType === 'PERCENT'
                                            ? 'Porcentaje de descuento'
                                            : 'Monto del descuento'
                                    }
                                    value={draft.rewardValue}
                                    inputMode="decimal"
                                    prefix={draft.rewardType === 'FIXED' ? '$' : undefined}
                                    hint={
                                        draft.rewardType === 'PERCENT'
                                            ? 'De 1 a 100.'
                                            : 'No pasa del total del pedido.'
                                    }
                                    error={errors.rewardValue}
                                    testId="loyalty-reward-value"
                                    onChange={(value) =>
                                        update('rewardValue', value.replace(/[^\d.]/g, ''))
                                    }
                                />
                            )}
                            <TextField
                                label="Nombre visible del premio"
                                value={draft.rewardLabel}
                                maxLength={40}
                                placeholder={rewardLabel}
                                hint="Si lo dejas vacío, se escribe solo."
                                error={errors.rewardLabel}
                                testId="loyalty-reward-label"
                                onChange={(value) => update('rewardLabel', value)}
                            />
                            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                                <CheckboxField
                                    label="El premio caduca"
                                    description="Sin caducidad, el premio espera al cliente."
                                    checked={draft.expires}
                                    testId="loyalty-expires"
                                    onChange={(value) => update('expires', value)}
                                />
                                {draft.expires ? (
                                    <TextField
                                        label="Días para usarlo"
                                        value={draft.rewardExpiresDays}
                                        inputMode="numeric"
                                        error={errors.rewardExpiresDays}
                                        testId="loyalty-expires-days"
                                        onChange={(value) =>
                                            update(
                                                'rewardExpiresDays',
                                                value.replace(/[^\d]/g, '').slice(0, 3),
                                            )
                                        }
                                    />
                                ) : null}
                            </div>
                            <TextField
                                label="Sellos en el local por día"
                                value={draft.walkInDailyLimit}
                                inputMode="numeric"
                                hint="Máximo por cliente, para compras en caja."
                                error={errors.walkInDailyLimit}
                                testId="loyalty-walk-in-limit"
                                onChange={(value) =>
                                    update(
                                        'walkInDailyLimit',
                                        value.replace(/[^\d]/g, '').slice(0, 2),
                                    )
                                }
                            />
                        </div>
                    </EditorSection>
                </div>
            </div>

            {/* Barra de guardado: al final del editor (fija abajo solo en escritorio). */}
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#DCE5F3] bg-white/95 p-3 shadow-[0_12px_32px_-24px_rgba(18,35,74,.6)] @3xl:sticky @3xl:bottom-4 @3xl:z-20">
                <button
                    type="button"
                    data-cy="loyalty-save"
                    disabled={!dirty || !valid || save.isPending}
                    onClick={() => save.mutate()}
                    className={primaryButton}
                >
                    {save.isPending ? 'Guardando…' : exists ? 'Guardar' : 'Crear mi tarjeta'}
                </button>
                <button
                    type="button"
                    data-cy="loyalty-reset"
                    onClick={() => setResetOpen(true)}
                    className={secondaryButton}
                >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Restablecer a la plantilla
                </button>
                <p
                    data-cy="loyalty-dirty"
                    className="ml-auto text-xs font-semibold text-[#65738A]"
                    aria-live="polite"
                >
                    {!valid
                        ? 'Revisa los campos marcados.'
                        : dirty && exists
                          ? 'Cambios sin guardar'
                          : exists
                            ? 'Todo guardado'
                            : ''}
                </p>
                {save.isError ? (
                    <p
                        data-cy="loyalty-save-error"
                        role="alert"
                        className="basis-full text-sm font-semibold text-[#B42318]"
                    >
                        {loyaltyErrorMessage(save.error, 'No pudimos guardar tu tarjeta.')} Tus
                        cambios siguen aquí.{' '}
                        <button
                            type="button"
                            onClick={() => save.mutate()}
                            className="underline underline-offset-2"
                        >
                            Reintentar
                        </button>
                    </p>
                ) : null}
            </div>

            {exists ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#53647D]">
                    <button
                        type="button"
                        data-cy="loyalty-toggle-enabled"
                        disabled={toggleEnabled.isPending}
                        onClick={() =>
                            enabled ? setDisableOpen(true) : toggleEnabled.mutate(true)
                        }
                        className={secondaryButton}
                    >
                        <Stamp aria-hidden="true" className="size-4" />
                        {enabled ? 'Pausar programa' : 'Activar programa'}
                    </button>
                    <span>
                        {enabled
                            ? 'Tus clientes ven su tarjeta y juntan sellos.'
                            : 'Pausado: tus clientes no ven la tarjeta. Sus sellos se conservan.'}
                    </span>
                </div>
            ) : null}

            <Modal
                open={resetOpen}
                title="Restablecer a la plantilla"
                description={`El diseño vuelve a la plantilla ${LOYALTY_TEMPLATES[design.template].label}. Los datos del programa no cambian.`}
                onClose={() => setResetOpen(false)}
                testId="loyalty-reset-dialog"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setResetOpen(false)}
                            className={secondaryButton}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            data-cy="loyalty-reset-confirm"
                            onClick={() => {
                                updateDesign((current) =>
                                    designFromTemplate(current.template, restaurantName),
                                )
                                setResetOpen(false)
                            }}
                            className={primaryButton}
                        >
                            Restablecer
                        </button>
                    </div>
                }
            >
                <p className="text-sm text-[#53647D]">Puedes guardar o seguir ajustando después.</p>
            </Modal>

            <Modal
                open={disableOpen}
                title="Pausar la tarjeta de lealtad"
                description="Tus clientes dejarán de verla y no se darán sellos nuevos."
                onClose={() => setDisableOpen(false)}
                closeDisabled={toggleEnabled.isPending}
                testId="loyalty-disable-dialog"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setDisableOpen(false)}
                            className={secondaryButton}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            data-cy="loyalty-disable-confirm"
                            disabled={toggleEnabled.isPending}
                            onClick={() => toggleEnabled.mutate(false)}
                            className={primaryButton}
                        >
                            {toggleEnabled.isPending ? 'Pausando…' : 'Pausar programa'}
                        </button>
                    </div>
                }
            >
                <p className="text-sm text-[#53647D]">
                    Las tarjetas, sellos y premios se conservan. Cuando la actives de nuevo, todo
                    sigue donde estaba.
                </p>
            </Modal>
        </div>
    )
}

function TemplateThumb({ design }: { design: LoyaltyDesign }) {
    const background =
        design.background.type === 'gradient'
            ? `linear-gradient(${design.background.angle}deg, ${design.background.color1}, ${design.background.color2})`
            : design.background.color1
    return (
        <span
            aria-hidden="true"
            className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-black/5"
            style={{ background }}
        >
            {[0, 1, 2].map((index) => (
                <span
                    key={index}
                    className="size-2.5 rounded-full"
                    style={{ background: design.stamp.filledColor }}
                />
            ))}
            <span
                className="size-2.5 rounded-full border-[1.5px]"
                style={{ borderColor: design.stamp.emptyColor }}
            />
        </span>
    )
}
