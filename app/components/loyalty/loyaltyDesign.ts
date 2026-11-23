// Diseño de la tarjeta de lealtad (versión 1). Mismas listas cerradas que el backend
// (pediloBackend/src/modules/loyalty/domain/loyaltyDesign.ts). Nunca se guarda CSS libre:
// cada valor se convierte aquí en variables CSS y clases conocidas.

export const DESIGN_TEMPLATES = [
    'clasica',
    'moderna',
    'oscura',
    'calida',
    'minimal',
    'festiva',
] as const
export const BACKGROUND_TYPES = ['solid', 'gradient', 'pattern'] as const
export const BACKGROUND_PATTERNS = [
    'none',
    'dots',
    'grid',
    'waves',
    'diagonal',
    'confetti',
] as const
export const TEXT_FONTS = ['sans', 'serif', 'rounded', 'mono', 'display'] as const
export const STAMP_SHAPES = [
    'circle',
    'rounded-square',
    'star',
    'heart',
    'hexagon',
    'shield',
] as const
export const STAMP_ICONS = [
    'check',
    'flame',
    'coffee',
    'pizza',
    'burger',
    'taco',
    'star',
    'heart',
    'crown',
    'leaf',
] as const
export const STAMP_SIZES = ['sm', 'md', 'lg'] as const
export const EMPTY_STYLES = ['outline', 'dashed', 'dimmed', 'number'] as const
export const LAYOUT_COLUMNS = ['auto', 2, 3, 4, 5, 6] as const
export const REWARD_SLOTS = ['icon', 'none'] as const
export const CARD_RADII = ['none', 'sm', 'md', 'lg', 'xl'] as const
export const CARD_SHADOWS = ['none', 'soft'] as const
export const STAMP_EFFECTS = ['press', 'pop', 'ink', 'spin', 'bounce'] as const
export const COMPLETION_EFFECTS = ['confetti', 'sparkles', 'glow', 'none'] as const
export const ANIMATION_SPEEDS = ['slow', 'normal', 'fast'] as const

export const DESIGN_TITLE_MAX_LENGTH = 30
export const DESIGN_SUBTITLE_MAX_LENGTH = 40

export type DesignTemplate = (typeof DESIGN_TEMPLATES)[number]
export type StampShape = (typeof STAMP_SHAPES)[number]
export type StampIcon = (typeof STAMP_ICONS)[number]
export type StampEffect = (typeof STAMP_EFFECTS)[number]
export type CompletionEffect = (typeof COMPLETION_EFFECTS)[number]
export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number]

export type LoyaltyDesign = {
    template: DesignTemplate
    background: {
        type: (typeof BACKGROUND_TYPES)[number]
        color1: string
        color2: string
        angle: number
        pattern: (typeof BACKGROUND_PATTERNS)[number]
        patternOpacity: number
    }
    text: {
        primaryColor: string
        secondaryColor: string
        font: (typeof TEXT_FONTS)[number]
        title: string
        subtitle: string
        showLogo: boolean
    }
    stamp: {
        shape: StampShape
        icon: StampIcon
        size: (typeof STAMP_SIZES)[number]
        filledColor: string
        iconColor: string
        emptyColor: string
        emptyStyle: (typeof EMPTY_STYLES)[number]
    }
    layout: { columns: (typeof LAYOUT_COLUMNS)[number]; rewardSlot: (typeof REWARD_SLOTS)[number] }
    card: {
        radius: (typeof CARD_RADII)[number]
        border: boolean
        borderColor: string
        shadow: (typeof CARD_SHADOWS)[number]
    }
    animation: {
        stampEffect: StampEffect
        completionEffect: CompletionEffect
        speed: AnimationSpeed
    }
}

type DesignBase = Omit<LoyaltyDesign, 'text'> & { text: Omit<LoyaltyDesign['text'], 'title'> }

/**
 * Plantillas de partida. Son DATOS: agregar una nueva es agregar un objeto aquí (y su
 * nombre a DESIGN_TEMPLATES en ambos repos). Todas pasan el contraste del editor
 * (tests/loyalty-design.test.ts).
 */
export const LOYALTY_TEMPLATES: Record<DesignTemplate, { label: string; design: DesignBase }> = {
    clasica: {
        label: 'Clásica',
        design: {
            template: 'clasica',
            background: {
                type: 'solid',
                color1: '#F8F4EC',
                color2: '#EFE6D4',
                angle: 135,
                pattern: 'none',
                patternOpacity: 0.12,
            },
            text: {
                primaryColor: '#10224A',
                secondaryColor: '#4A5878',
                font: 'serif',
                subtitle: 'Tarjeta de lealtad',
                showLogo: true,
            },
            stamp: {
                shape: 'circle',
                icon: 'check',
                size: 'md',
                filledColor: '#1E40AF',
                iconColor: '#FFFFFF',
                emptyColor: '#8A97B1',
                emptyStyle: 'dashed',
            },
            layout: { columns: 'auto', rewardSlot: 'icon' },
            card: { radius: 'lg', border: true, borderColor: '#E3DCCB', shadow: 'soft' },
            animation: { stampEffect: 'press', completionEffect: 'glow', speed: 'normal' },
        },
    },
    moderna: {
        label: 'Moderna',
        design: {
            template: 'moderna',
            background: {
                type: 'pattern',
                color1: '#1E40AF',
                color2: '#10224A',
                angle: 135,
                pattern: 'diagonal',
                patternOpacity: 0.1,
            },
            text: {
                primaryColor: '#FFFFFF',
                secondaryColor: '#DCE6FF',
                font: 'sans',
                subtitle: 'Cada visita cuenta',
                showLogo: true,
            },
            stamp: {
                shape: 'rounded-square',
                icon: 'star',
                size: 'md',
                filledColor: '#FFFFFF',
                iconColor: '#1E40AF',
                emptyColor: '#9DB3F0',
                emptyStyle: 'outline',
            },
            layout: { columns: 'auto', rewardSlot: 'icon' },
            card: { radius: 'xl', border: false, borderColor: '#1E40AF', shadow: 'soft' },
            animation: { stampEffect: 'pop', completionEffect: 'sparkles', speed: 'fast' },
        },
    },
    oscura: {
        label: 'Oscura',
        design: {
            template: 'oscura',
            background: {
                type: 'solid',
                color1: '#15171C',
                color2: '#22252D',
                angle: 160,
                pattern: 'none',
                patternOpacity: 0.08,
            },
            text: {
                primaryColor: '#F5F1E8',
                secondaryColor: '#B9B3A7',
                font: 'display',
                subtitle: 'Clientes de la casa',
                showLogo: true,
            },
            stamp: {
                shape: 'hexagon',
                icon: 'flame',
                size: 'md',
                filledColor: '#F59E0B',
                iconColor: '#15171C',
                emptyColor: '#4B5160',
                emptyStyle: 'dimmed',
            },
            layout: { columns: 'auto', rewardSlot: 'icon' },
            card: { radius: 'md', border: true, borderColor: '#2A2E37', shadow: 'none' },
            animation: { stampEffect: 'ink', completionEffect: 'glow', speed: 'normal' },
        },
    },
    calida: {
        label: 'Cálida',
        design: {
            template: 'calida',
            background: {
                type: 'gradient',
                color1: '#FDE8CC',
                color2: '#F6C9A0',
                angle: 160,
                pattern: 'none',
                patternOpacity: 0.12,
            },
            text: {
                primaryColor: '#5A2A12',
                secondaryColor: '#7A3E1D',
                font: 'rounded',
                subtitle: 'Tu lugar de siempre',
                showLogo: true,
            },
            stamp: {
                shape: 'heart',
                icon: 'coffee',
                size: 'md',
                filledColor: '#B4471A',
                iconColor: '#FFF7ED',
                emptyColor: '#C98A5E',
                emptyStyle: 'dashed',
            },
            layout: { columns: 'auto', rewardSlot: 'icon' },
            card: { radius: 'lg', border: false, borderColor: '#E9B48A', shadow: 'soft' },
            animation: { stampEffect: 'press', completionEffect: 'confetti', speed: 'normal' },
        },
    },
    minimal: {
        label: 'Minimal',
        design: {
            template: 'minimal',
            background: {
                type: 'solid',
                color1: '#FFFFFF',
                color2: '#F3F4F6',
                angle: 135,
                pattern: 'none',
                patternOpacity: 0.1,
            },
            text: {
                primaryColor: '#111827',
                secondaryColor: '#4B5563',
                font: 'sans',
                subtitle: 'Sellos',
                showLogo: false,
            },
            stamp: {
                shape: 'circle',
                icon: 'check',
                size: 'sm',
                filledColor: '#111827',
                iconColor: '#FFFFFF',
                emptyColor: '#9CA3AF',
                emptyStyle: 'number',
            },
            layout: { columns: 'auto', rewardSlot: 'icon' },
            card: { radius: 'sm', border: true, borderColor: '#E5E7EB', shadow: 'none' },
            animation: { stampEffect: 'ink', completionEffect: 'none', speed: 'fast' },
        },
    },
    festiva: {
        label: 'Festiva',
        design: {
            template: 'festiva',
            background: {
                type: 'pattern',
                color1: '#FFF4D6',
                color2: '#FFE3A3',
                angle: 135,
                pattern: 'confetti',
                patternOpacity: 0.22,
            },
            text: {
                primaryColor: '#7A1F3D',
                secondaryColor: '#9A3412',
                font: 'display',
                subtitle: 'Junta sellos y gana',
                showLogo: true,
            },
            stamp: {
                shape: 'star',
                icon: 'taco',
                size: 'lg',
                filledColor: '#DB2777',
                iconColor: '#FFFFFF',
                emptyColor: '#E58FB2',
                emptyStyle: 'dashed',
            },
            layout: { columns: 'auto', rewardSlot: 'icon' },
            card: { radius: 'xl', border: false, borderColor: '#F9D27A', shadow: 'soft' },
            animation: { stampEffect: 'bounce', completionEffect: 'confetti', speed: 'normal' },
        },
    },
}

export function cleanDesignText(value: string): string {
    return value
        .replace(/\p{Cc}/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

export function defaultDesignTitle(restaurantName: string) {
    return cleanDesignText(restaurantName).slice(0, DESIGN_TITLE_MAX_LENGTH).trim()
}

/** Diseño completo de una plantilla con el nombre del restaurante como título. */
export function designFromTemplate(
    template: DesignTemplate,
    restaurantName: string,
): LoyaltyDesign {
    const base = LOYALTY_TEMPLATES[template].design
    return structuredCloneDesign({
        ...base,
        text: { ...base.text, title: defaultDesignTitle(restaurantName) },
    })
}

function structuredCloneDesign(design: LoyaltyDesign): LoyaltyDesign {
    return JSON.parse(JSON.stringify(design)) as LoyaltyDesign
}

/** Aplica una plantilla conservando los textos que el dueño ya escribió. */
export function applyTemplate(current: LoyaltyDesign, template: DesignTemplate): LoyaltyDesign {
    const next = designFromTemplate(template, current.text.title)
    // El subtítulo escrito por el dueño se conserva; el de la plantilla anterior se cambia.
    const previousDefault = LOYALTY_TEMPLATES[current.template]?.design.text.subtitle
    const subtitle =
        !current.text.subtitle || current.text.subtitle === previousDefault
            ? next.text.subtitle
            : current.text.subtitle
    return { ...next, text: { ...next.text, title: current.text.title, subtitle } }
}

// ── Colores y contraste (WCAG 2.x) ───────────────────────────────────────────────

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

export function isHexColor(value: unknown): value is string {
    return typeof value === 'string' && HEX_COLOR.test(value)
}

/** Color seguro para estilos: solo #RRGGBB; cualquier otra cosa usa el respaldo. */
export function safeHex(value: unknown, fallback: string) {
    return isHexColor(value) ? value.toUpperCase() : fallback
}

function channel(value: number) {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string) {
    const value = safeHex(hex, '#000000')
    const r = parseInt(value.slice(1, 3), 16)
    const g = parseInt(value.slice(3, 5), 16)
    const b = parseInt(value.slice(5, 7), 16)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string) {
    const la = relativeLuminance(a)
    const lb = relativeLuminance(b)
    const [light, dark] = la > lb ? [la, lb] : [lb, la]
    return (light + 0.05) / (dark + 0.05)
}

/** Colores de fondo contra los que se mide (en degradado, el peor de los dos). */
export function backgroundColors(design: LoyaltyDesign) {
    return design.background.type === 'gradient'
        ? [design.background.color1, design.background.color2]
        : [design.background.color1]
}

export function worstContrast(color: string, backgrounds: string[]) {
    return Math.min(...backgrounds.map((background) => contrastRatio(color, background)))
}

export const CONTRAST_MINIMUMS = { text: 4.5, stamp: 3 } as const

export type ContrastIssue = {
    key: 'primaryText' | 'secondaryText' | 'filledStamp'
    label: string
    ratio: number
    minimum: number
}

/** Texto contra fondo (mínimo 4.5) y sello lleno contra fondo (mínimo 3). */
export function contrastIssues(design: LoyaltyDesign): ContrastIssue[] {
    const backgrounds = backgroundColors(design)
    const checks: ContrastIssue[] = [
        {
            key: 'primaryText',
            label: 'Texto principal',
            ratio: worstContrast(design.text.primaryColor, backgrounds),
            minimum: CONTRAST_MINIMUMS.text,
        },
        {
            key: 'secondaryText',
            label: 'Texto secundario',
            ratio: worstContrast(design.text.secondaryColor, backgrounds),
            minimum: CONTRAST_MINIMUMS.text,
        },
        {
            key: 'filledStamp',
            label: 'Sello lleno',
            ratio: worstContrast(design.stamp.filledColor, backgrounds),
            minimum: CONTRAST_MINIMUMS.stamp,
        },
    ]
    return checks.filter((check) => check.ratio < check.minimum)
}

function toHex(r: number, g: number, b: number) {
    return `#${[r, g, b]
        .map((value) =>
            Math.round(Math.min(255, Math.max(0, value)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`.toUpperCase()
}

/** Mezcla `hex` con negro o blanco en pasos hasta alcanzar el contraste mínimo. */
export function fixColorContrast(hex: string, backgrounds: string[], minimum: number) {
    if (worstContrast(hex, backgrounds) >= minimum) return safeHex(hex, '#000000')
    const base = safeHex(hex, '#000000')
    const r = parseInt(base.slice(1, 3), 16)
    const g = parseInt(base.slice(3, 5), 16)
    const b = parseInt(base.slice(5, 7), 16)
    const averageLuminance =
        backgrounds.reduce((sum, color) => sum + relativeLuminance(color), 0) / backgrounds.length
    const towards = averageLuminance > 0.4 ? 0 : 255
    for (let step = 1; step <= 20; step += 1) {
        const t = step / 20
        const candidate = toHex(r + (towards - r) * t, g + (towards - g) * t, b + (towards - b) * t)
        if (worstContrast(candidate, backgrounds) >= minimum) return candidate
    }
    return towards === 0 ? '#000000' : '#FFFFFF'
}

/** "Corregir automáticamente": ajusta solo los colores que no cumplen. */
export function fixDesignContrast(design: LoyaltyDesign): LoyaltyDesign {
    const backgrounds = backgroundColors(design)
    return {
        ...design,
        text: {
            ...design.text,
            primaryColor: fixColorContrast(
                design.text.primaryColor,
                backgrounds,
                CONTRAST_MINIMUMS.text,
            ),
            secondaryColor: fixColorContrast(
                design.text.secondaryColor,
                backgrounds,
                CONTRAST_MINIMUMS.text,
            ),
        },
        stamp: {
            ...design.stamp,
            filledColor: fixColorContrast(
                design.stamp.filledColor,
                backgrounds,
                CONTRAST_MINIMUMS.stamp,
            ),
        },
    }
}

// ── Validación (mismos límites que el servidor) ─────────────────────────────────

function oneOf<T extends readonly unknown[]>(list: T, value: unknown): value is T[number] {
    return (list as readonly unknown[]).includes(value)
}

/** Lee un diseño desconocido y lo deja válido (cualquier valor fuera de lista usa el de respaldo). */
export function normalizeDesign(value: unknown, restaurantName: string): LoyaltyDesign {
    const fallback = designFromTemplate('clasica', restaurantName)
    if (!value || typeof value !== 'object') return fallback
    const input = value as Partial<Record<keyof LoyaltyDesign, Record<string, unknown>>> & {
        template?: unknown
    }
    const background = input.background ?? {}
    const text = input.text ?? {}
    const stamp = input.stamp ?? {}
    const layout = input.layout ?? {}
    const card = input.card ?? {}
    const animation = input.animation ?? {}
    const number = (raw: unknown, min: number, max: number, fallbackValue: number) =>
        typeof raw === 'number' && Number.isFinite(raw)
            ? Math.min(max, Math.max(min, raw))
            : fallbackValue
    const textValue = (raw: unknown, max: number, fallbackValue: string) =>
        typeof raw === 'string' ? cleanDesignText(raw).slice(0, max) : fallbackValue
    return {
        template: oneOf(DESIGN_TEMPLATES, input.template) ? input.template : fallback.template,
        background: {
            type: oneOf(BACKGROUND_TYPES, background.type)
                ? background.type
                : fallback.background.type,
            color1: safeHex(background.color1, fallback.background.color1),
            color2: safeHex(background.color2, fallback.background.color2),
            angle: Math.round(number(background.angle, 0, 360, fallback.background.angle)),
            pattern: oneOf(BACKGROUND_PATTERNS, background.pattern)
                ? background.pattern
                : fallback.background.pattern,
            patternOpacity: number(
                background.patternOpacity,
                0,
                1,
                fallback.background.patternOpacity,
            ),
        },
        text: {
            primaryColor: safeHex(text.primaryColor, fallback.text.primaryColor),
            secondaryColor: safeHex(text.secondaryColor, fallback.text.secondaryColor),
            font: oneOf(TEXT_FONTS, text.font) ? text.font : fallback.text.font,
            title: textValue(text.title, DESIGN_TITLE_MAX_LENGTH, fallback.text.title),
            subtitle: textValue(text.subtitle, DESIGN_SUBTITLE_MAX_LENGTH, fallback.text.subtitle),
            showLogo: typeof text.showLogo === 'boolean' ? text.showLogo : fallback.text.showLogo,
        },
        stamp: {
            shape: oneOf(STAMP_SHAPES, stamp.shape) ? stamp.shape : fallback.stamp.shape,
            icon: oneOf(STAMP_ICONS, stamp.icon) ? stamp.icon : fallback.stamp.icon,
            size: oneOf(STAMP_SIZES, stamp.size) ? stamp.size : fallback.stamp.size,
            filledColor: safeHex(stamp.filledColor, fallback.stamp.filledColor),
            iconColor: safeHex(stamp.iconColor, fallback.stamp.iconColor),
            emptyColor: safeHex(stamp.emptyColor, fallback.stamp.emptyColor),
            emptyStyle: oneOf(EMPTY_STYLES, stamp.emptyStyle)
                ? stamp.emptyStyle
                : fallback.stamp.emptyStyle,
        },
        layout: {
            columns: oneOf(LAYOUT_COLUMNS, layout.columns)
                ? layout.columns
                : fallback.layout.columns,
            rewardSlot: oneOf(REWARD_SLOTS, layout.rewardSlot)
                ? layout.rewardSlot
                : fallback.layout.rewardSlot,
        },
        card: {
            radius: oneOf(CARD_RADII, card.radius) ? card.radius : fallback.card.radius,
            border: typeof card.border === 'boolean' ? card.border : fallback.card.border,
            borderColor: safeHex(card.borderColor, fallback.card.borderColor),
            shadow: oneOf(CARD_SHADOWS, card.shadow) ? card.shadow : fallback.card.shadow,
        },
        animation: {
            stampEffect: oneOf(STAMP_EFFECTS, animation.stampEffect)
                ? animation.stampEffect
                : fallback.animation.stampEffect,
            completionEffect: oneOf(COMPLETION_EFFECTS, animation.completionEffect)
                ? animation.completionEffect
                : fallback.animation.completionEffect,
            speed: oneOf(ANIMATION_SPEEDS, animation.speed)
                ? animation.speed
                : fallback.animation.speed,
        },
    }
}

// ── Del diseño a estilos ────────────────────────────────────────────────────────

export const SPEED_MULTIPLIER: Record<AnimationSpeed, number> = { slow: 1.4, normal: 1, fast: 0.7 }

/** Duración base (ms) de cada efecto, antes del multiplicador de velocidad. */
export const EFFECT_DURATION_MS: Record<StampEffect, number> = {
    press: 620,
    pop: 460,
    ink: 560,
    spin: 640,
    bounce: 760,
}

export const FONT_STACKS: Record<LoyaltyDesign['text']['font'], string> = {
    sans: 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    rounded:
        'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", var(--font-inter-tight), sans-serif',
    mono: 'var(--font-ibm-plex-mono), ui-monospace, monospace',
    display: 'var(--font-sora), ui-sans-serif, system-ui, sans-serif',
}

const RADIUS: Record<LoyaltyDesign['card']['radius'], string> = {
    none: '0px',
    sm: '8px',
    md: '14px',
    lg: '20px',
    xl: '28px',
}
const STAMP_SIZE: Record<LoyaltyDesign['stamp']['size'], string> = {
    sm: '34px',
    md: '44px',
    lg: '54px',
}

/** Variables CSS de la tarjeta. Solo valores de lista cerrada o colores #RRGGBB validados. */
export function designCssVariables(design: LoyaltyDesign): Record<`--lc-${string}`, string> {
    const angle = Math.round(Math.min(360, Math.max(0, design.background.angle)))
    const bg1 = safeHex(design.background.color1, '#FFFFFF')
    const bg2 = safeHex(design.background.color2, bg1)
    return {
        '--lc-bg1': bg1,
        '--lc-bg2': bg2,
        '--lc-bg-image':
            design.background.type === 'gradient'
                ? `linear-gradient(${angle}deg, ${bg1}, ${bg2})`
                : 'none',
        '--lc-pattern-opacity': String(Math.min(1, Math.max(0, design.background.patternOpacity))),
        '--lc-text': safeHex(design.text.primaryColor, '#111827'),
        '--lc-text-2': safeHex(design.text.secondaryColor, '#4B5563'),
        '--lc-font': FONT_STACKS[design.text.font],
        '--lc-stamp': safeHex(design.stamp.filledColor, '#111827'),
        '--lc-icon': safeHex(design.stamp.iconColor, '#FFFFFF'),
        '--lc-empty': safeHex(design.stamp.emptyColor, '#9CA3AF'),
        '--lc-stamp-size': STAMP_SIZE[design.stamp.size],
        '--lc-radius': RADIUS[design.card.radius],
        '--lc-border': design.card.border
            ? safeHex(design.card.borderColor, '#E5E7EB')
            : 'transparent',
        '--lc-speed': String(SPEED_MULTIPLIER[design.animation.speed]),
    }
}

/** Columnas de la cuadrícula: "auto" reparte los sellos en filas parejas. */
export function gridColumns(design: LoyaltyDesign, total: number) {
    if (design.layout.columns !== 'auto') return Math.min(design.layout.columns, Math.max(1, total))
    if (total <= 5) return total
    if (total <= 12) return Math.ceil(total / 2)
    if (total <= 15) return Math.ceil(total / 3)
    return Math.ceil(total / 4)
}

export function progressText(
    stampsCount: number,
    stampsRequired: number,
    rewardAvailable: boolean,
) {
    const remaining = Math.max(0, stampsRequired - Math.min(stampsCount, stampsRequired))
    if (remaining === 0) return 'Tu premio está listo'
    if (rewardAvailable)
        return `Tienes un premio listo · te faltan ${remaining} ${remaining === 1 ? 'sello' : 'sellos'} para el siguiente`
    return `Te ${remaining === 1 ? 'falta' : 'faltan'} ${remaining} ${remaining === 1 ? 'sello' : 'sellos'} para tu premio`
}
