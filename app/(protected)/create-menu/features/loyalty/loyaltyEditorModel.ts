import {
    designFromTemplate,
    DESIGN_SUBTITLE_MAX_LENGTH,
    DESIGN_TITLE_MAX_LENGTH,
    normalizeDesign,
    type LoyaltyDesign,
} from '@/app/components/loyalty/loyaltyDesign'
import type { LoyaltyProgram, LoyaltyProgramInput } from '@/app/components/loyalty/loyaltyOwnerApi'
import type { LoyaltyRewardType } from '@/app/components/loyalty/loyaltyPublicApi'

/** Mismos límites que el servidor (pediloBackend/src/modules/loyalty/domain/loyaltyProgram.ts). */
export const LOYALTY_LIMITS = {
    stampsRequired: { min: 3, max: 20 },
    percent: { min: 1, max: 100 },
    fixed: { min: 1, max: 10_000 },
    minOrderAmount: { min: 0, max: 100_000 },
    rewardExpiresDays: { min: 1, max: 365 },
    walkInDailyLimit: { min: 1, max: 20 },
    rewardLabelMaxLength: 40,
} as const

/**
 * Borrador del editor. Los números se editan como texto para no pelear con el usuario
 * mientras escribe; se validan y convierten al guardar.
 */
export type LoyaltyDraft = {
    stampsRequired: string
    stampMode: 'MANUAL' | 'AUTO'
    minOrderAmount: string
    rewardType: LoyaltyRewardType
    rewardValue: string
    rewardProductId: string | null
    rewardLabel: string
    expires: boolean
    rewardExpiresDays: string
    walkInDailyLimit: string
    design: LoyaltyDesign
}

export type DraftErrors = Partial<Record<keyof LoyaltyDraft | 'title' | 'subtitle', string>>

export function draftFromProgram(program: LoyaltyProgram, restaurantName: string): LoyaltyDraft {
    return {
        stampsRequired: String(program.stampsRequired),
        stampMode: program.stampMode,
        minOrderAmount: String(program.minOrderAmount),
        rewardType: program.rewardType,
        rewardValue: program.rewardType === 'FREE_PRODUCT' ? '' : String(program.rewardValue),
        rewardProductId: program.rewardProductId,
        // Si el nombre es el automático, se deja vacío para que siga al tipo y valor.
        rewardLabel:
            program.rewardLabel ===
            autoRewardLabel(
                program.rewardType,
                program.rewardValue,
                program.rewardProduct?.name ?? null,
            )
                ? ''
                : program.rewardLabel,
        expires: program.rewardExpiresDays !== null,
        rewardExpiresDays:
            program.rewardExpiresDays === null ? '30' : String(program.rewardExpiresDays),
        walkInDailyLimit: String(program.walkInDailyLimit),
        design: normalizeDesign(program.design, restaurantName),
    }
}

export function defaultDesign(restaurantName: string) {
    return designFromTemplate('clasica', restaurantName)
}

function formatPesos(value: number) {
    return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

/** Mismo nombre automático que genera el servidor cuando el dueño no escribe uno. */
export function autoRewardLabel(
    type: LoyaltyRewardType,
    value: number,
    productName: string | null,
) {
    const label =
        type === 'PERCENT'
            ? `${value}% de descuento`
            : type === 'FIXED'
              ? `${formatPesos(value)} de descuento`
              : `${productName ?? 'Producto'} gratis`
    return label.slice(0, LOYALTY_LIMITS.rewardLabelMaxLength).trim()
}

function parseNumber(value: string) {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return Number.NaN
    return Number(normalized)
}

const hasAtMostTwoDecimals = (value: number) =>
    Math.abs(Math.round(value * 100) - value * 100) < 1e-6

export function validateDraft(draft: LoyaltyDraft): DraftErrors {
    const errors: DraftErrors = {}
    const { stampsRequired, percent, fixed, minOrderAmount, rewardExpiresDays, walkInDailyLimit } =
        LOYALTY_LIMITS
    const stamps = parseNumber(draft.stampsRequired)
    if (!Number.isInteger(stamps) || stamps < stampsRequired.min || stamps > stampsRequired.max) {
        errors.stampsRequired = `Elige entre ${stampsRequired.min} y ${stampsRequired.max} sellos.`
    }
    const minimum = draft.minOrderAmount.trim() === '' ? 0 : parseNumber(draft.minOrderAmount)
    if (
        !Number.isFinite(minimum) ||
        minimum < minOrderAmount.min ||
        minimum > minOrderAmount.max ||
        !hasAtMostTwoDecimals(minimum)
    ) {
        errors.minOrderAmount = 'Escribe un monto de $0 a $100,000 con máximo dos decimales.'
    }
    const value = parseNumber(draft.rewardValue)
    if (
        draft.rewardType === 'PERCENT' &&
        (!Number.isFinite(value) ||
            value < percent.min ||
            value > percent.max ||
            !hasAtMostTwoDecimals(value))
    ) {
        errors.rewardValue = `El porcentaje va de ${percent.min} a ${percent.max}.`
    }
    if (
        draft.rewardType === 'FIXED' &&
        (!Number.isFinite(value) ||
            value < fixed.min ||
            value > fixed.max ||
            !hasAtMostTwoDecimals(value))
    ) {
        errors.rewardValue = `El monto va de $${fixed.min} a $${fixed.max.toLocaleString('es-MX')}.`
    }
    if (draft.rewardType === 'FREE_PRODUCT' && !draft.rewardProductId) {
        errors.rewardProductId = 'Elige un producto de tu menú.'
    }
    if (draft.rewardLabel.trim().length > LOYALTY_LIMITS.rewardLabelMaxLength) {
        errors.rewardLabel = `Máximo ${LOYALTY_LIMITS.rewardLabelMaxLength} caracteres.`
    }
    if (draft.expires) {
        const days = parseNumber(draft.rewardExpiresDays)
        if (
            !Number.isInteger(days) ||
            days < rewardExpiresDays.min ||
            days > rewardExpiresDays.max
        ) {
            errors.rewardExpiresDays = `Elige entre ${rewardExpiresDays.min} y ${rewardExpiresDays.max} días.`
        }
    }
    const walkIn = parseNumber(draft.walkInDailyLimit)
    if (
        !Number.isInteger(walkIn) ||
        walkIn < walkInDailyLimit.min ||
        walkIn > walkInDailyLimit.max
    ) {
        errors.walkInDailyLimit = `Elige entre ${walkInDailyLimit.min} y ${walkInDailyLimit.max}.`
    }
    if (draft.design.text.title.length > DESIGN_TITLE_MAX_LENGTH)
        errors.title = `Máximo ${DESIGN_TITLE_MAX_LENGTH} caracteres.`
    if (draft.design.text.subtitle.length > DESIGN_SUBTITLE_MAX_LENGTH)
        errors.subtitle = `Máximo ${DESIGN_SUBTITLE_MAX_LENGTH} caracteres.`
    return errors
}

/** Sellos requeridos usables por la vista previa aunque el campo esté a medio escribir. */
export function previewStampsRequired(draft: LoyaltyDraft) {
    const value = parseNumber(draft.stampsRequired)
    if (!Number.isInteger(value)) return 8
    return Math.min(
        LOYALTY_LIMITS.stampsRequired.max,
        Math.max(LOYALTY_LIMITS.stampsRequired.min, value),
    )
}

export function draftToInput(draft: LoyaltyDraft, enabled: boolean): LoyaltyProgramInput {
    const rewardValue = draft.rewardType === 'FREE_PRODUCT' ? 0 : parseNumber(draft.rewardValue)
    return {
        enabled,
        stampsRequired: parseNumber(draft.stampsRequired),
        stampMode: draft.stampMode,
        minOrderAmount: draft.minOrderAmount.trim() === '' ? 0 : parseNumber(draft.minOrderAmount),
        rewardType: draft.rewardType,
        rewardValue,
        rewardProductId: draft.rewardType === 'FREE_PRODUCT' ? draft.rewardProductId : null,
        rewardLabel: draft.rewardLabel.trim() || null,
        rewardExpiresDays: draft.expires ? parseNumber(draft.rewardExpiresDays) : null,
        walkInDailyLimit: parseNumber(draft.walkInDailyLimit),
        design: {
            ...draft.design,
            text: {
                ...draft.design.text,
                title: draft.design.text.title.trim(),
                subtitle: draft.design.text.subtitle.trim(),
            },
        },
    }
}

/** Nombre del premio que verá el cliente (el escrito o el automático). */
export function draftRewardLabel(draft: LoyaltyDraft, productName: string | null) {
    if (draft.rewardLabel.trim()) return draft.rewardLabel.trim()
    const value = parseNumber(draft.rewardValue)
    return autoRewardLabel(draft.rewardType, Number.isFinite(value) ? value : 0, productName)
}

/** Comparación estable para saber si hay cambios sin guardar. */
export function sameDraft(a: LoyaltyDraft, b: LoyaltyDraft) {
    return JSON.stringify(a) === JSON.stringify(b)
}
