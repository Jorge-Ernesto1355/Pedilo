import type {
    DeliveryCoordinates,
    DeliverySettings,
    SaveDeliverySettingsInput,
} from './deliverySettingsApi'

/** Mismos límites que el backend (src/modules/delivery/domain/feePolicy.ts). */
export const DELIVERY_LIMITS = { maxTiers: 10, maxKm: 50, maxFee: 5000 } as const

export type TierDraft = { key: string; upToKm: string; fee: string }

export type DeliveryFormState = {
    enabled: boolean
    origin: DeliveryCoordinates | null
    originChanged: boolean
    maxDeliveryKm: string
    tiers: TierDraft[]
}

/** Códigos que también devuelve el backend en DELIVERY_SETTINGS_INVALID. */
export type DeliveryIssue =
    | 'ORIGIN_MISSING'
    | 'MAX_KM_MISSING'
    | 'MAX_KM_INVALID'
    | 'NO_TIERS'
    | 'TOO_MANY_TIERS'
    | 'TIER_KM_INVALID'
    | 'TIER_KM_NOT_ASCENDING'
    | 'TIER_FEE_INVALID'
    | 'TIERS_DO_NOT_COVER_MAX_KM'

export const deliveryIssueMessages: Record<DeliveryIssue, string> = {
    ORIGIN_MISSING: 'Marca en el mapa la ubicación de tu restaurante.',
    MAX_KM_MISSING: 'Escribe el radio máximo de entrega.',
    MAX_KM_INVALID: 'El radio debe ser mayor a 0 y de hasta 50 km, con máximo un decimal.',
    NO_TIERS: 'Agrega al menos un tramo de tarifa.',
    TOO_MANY_TIERS: 'Puedes tener hasta 10 tramos.',
    TIER_KM_INVALID: 'Cada tramo necesita km mayores a 0 y de hasta 50, con máximo un decimal.',
    TIER_KM_NOT_ASCENDING: 'Los km de los tramos deben ir de menor a mayor, sin repetirse.',
    TIER_FEE_INVALID: 'Cada tramo necesita un envío mayor a $0 y de hasta $5,000.',
    TIERS_DO_NOT_COVER_MAX_KM: 'El último tramo debe llegar al menos hasta el radio máximo.',
}

let tierKeySequence = 0
export function newTier(upToKm = '', fee = ''): TierDraft {
    tierKeySequence += 1
    return { key: `tier-${tierKeySequence}`, upToKm, fee }
}

export function toFormState(settings: DeliverySettings): DeliveryFormState {
    const tiers = settings.feeConfig?.tiers ?? []
    return {
        enabled: settings.enabled,
        origin: settings.origin,
        originChanged: false,
        maxDeliveryKm: settings.maxDeliveryKm === null ? '' : String(settings.maxDeliveryKm),
        tiers:
            tiers.length > 0
                ? tiers.map((tier) => newTier(String(tier.upToKm), String(tier.fee)))
                : [newTier()],
    }
}

function parseNumber(value: string): number | null {
    const trimmed = value.trim().replace(',', '.')
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : Number.NaN
}

function hasAtMostDecimals(value: number, decimals: number) {
    const factor = 10 ** decimals
    return Math.abs(Math.round(value * factor) - value * factor) < 1e-6
}

/** Filas totalmente vacías se ignoran (p. ej. la fila inicial sin llenar). */
function filledTiers(tiers: TierDraft[]) {
    return tiers.filter((tier) => tier.upToKm.trim() || tier.fee.trim())
}

export function validateDeliveryForm(state: DeliveryFormState): DeliveryIssue[] {
    const issues = new Set<DeliveryIssue>()
    const maxKm = parseNumber(state.maxDeliveryKm)
    const tiers = filledTiers(state.tiers)

    if (
        maxKm !== null &&
        (Number.isNaN(maxKm) ||
            maxKm <= 0 ||
            maxKm > DELIVERY_LIMITS.maxKm ||
            !hasAtMostDecimals(maxKm, 1))
    ) {
        issues.add('MAX_KM_INVALID')
    }
    if (tiers.length > DELIVERY_LIMITS.maxTiers) issues.add('TOO_MANY_TIERS')

    let previousKm: number | null = null
    for (const tier of tiers) {
        const km = parseNumber(tier.upToKm)
        const fee = parseNumber(tier.fee)
        if (
            km === null ||
            Number.isNaN(km) ||
            km <= 0 ||
            km > DELIVERY_LIMITS.maxKm ||
            !hasAtMostDecimals(km, 1)
        ) {
            issues.add('TIER_KM_INVALID')
        } else {
            if (previousKm !== null && km <= previousKm) issues.add('TIER_KM_NOT_ASCENDING')
            previousKm = km
        }
        if (
            fee === null ||
            Number.isNaN(fee) ||
            fee <= 0 ||
            fee > DELIVERY_LIMITS.maxFee ||
            !hasAtMostDecimals(fee, 2)
        ) {
            issues.add('TIER_FEE_INVALID')
        }
    }

    if (state.enabled) {
        if (!state.origin) issues.add('ORIGIN_MISSING')
        if (maxKm === null) issues.add('MAX_KM_MISSING')
        if (tiers.length === 0) issues.add('NO_TIERS')
    }
    const lastKm = tiers.length > 0 ? parseNumber(tiers[tiers.length - 1].upToKm) : null
    if (
        lastKm !== null &&
        !Number.isNaN(lastKm) &&
        maxKm !== null &&
        !Number.isNaN(maxKm) &&
        maxKm > 0 &&
        lastKm < maxKm &&
        !issues.has('TIER_KM_INVALID') &&
        !issues.has('MAX_KM_INVALID')
    ) {
        issues.add('TIERS_DO_NOT_COVER_MAX_KM')
    }
    return [...issues]
}

/** Solo llamar con un estado sin errores de validación. */
export function toSavePayload(state: DeliveryFormState): SaveDeliverySettingsInput {
    const tiers = filledTiers(state.tiers).map((tier) => ({
        upToKm: Number(tier.upToKm.trim().replace(',', '.')),
        fee: Number(tier.fee.trim().replace(',', '.')),
    }))
    const maxKm = parseNumber(state.maxDeliveryKm)
    return {
        enabled: state.enabled,
        maxDeliveryKm: maxKm === null || Number.isNaN(maxKm) ? null : maxKm,
        feeConfig: tiers.length > 0 ? { type: 'DISTANCE_TIERS', tiers } : null,
        ...(state.originChanged && state.origin ? { origin: state.origin } : {}),
    }
}

export function isKnownDeliveryIssue(value: unknown): value is DeliveryIssue {
    return typeof value === 'string' && value in deliveryIssueMessages
}
