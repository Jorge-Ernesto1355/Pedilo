import type { IngredientUnit, StockAlertKind, StockAlertLevel } from './inventory.types'

export type StockAlertEventPayload = {
    eventId: string
    alertId: string
    ingredientId: string
    ingredientName: string
    unit: IngredientUnit
    kind: StockAlertKind
    level: StockAlertLevel
    stock: number
    threshold: number
    createdAt: string
}

const units: IngredientUnit[] = ['G', 'ML', 'UNIT']
const kinds: StockAlertKind[] = ['STOCK', 'CONSUMPTION']
const levels: StockAlertLevel[] = ['LOW', 'CRITICAL', 'OUT', 'HIGH']
const safeId = /^[A-Za-z0-9_-]{1,128}$/

/** Validates a `stock_alert` SSE payload; anything unexpected is ignored. */
export function parseStockAlertEvent(
    data: string,
    businessId: string,
): StockAlertEventPayload | null {
    let payload: unknown
    try {
        payload = JSON.parse(data)
    } catch {
        return null
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
    const value = payload as Record<string, unknown>
    if (
        value.type !== 'stock_alert' ||
        value.restaurantId !== businessId ||
        typeof value.eventId !== 'string' ||
        typeof value.alertId !== 'string' ||
        !safeId.test(value.alertId) ||
        typeof value.ingredientId !== 'string' ||
        !safeId.test(value.ingredientId) ||
        typeof value.ingredientName !== 'string' ||
        !value.ingredientName.trim() ||
        !units.includes(value.unit as IngredientUnit) ||
        !kinds.includes(value.kind as StockAlertKind) ||
        !levels.includes(value.level as StockAlertLevel) ||
        typeof value.stock !== 'number' ||
        !Number.isFinite(value.stock) ||
        typeof value.threshold !== 'number' ||
        !Number.isFinite(value.threshold) ||
        typeof value.createdAt !== 'string'
    )
        return null
    return {
        eventId: value.eventId,
        alertId: value.alertId,
        ingredientId: value.ingredientId,
        ingredientName: value.ingredientName.trim().slice(0, 120),
        unit: value.unit as IngredientUnit,
        kind: value.kind as StockAlertKind,
        level: value.level as StockAlertLevel,
        stock: value.stock,
        threshold: value.threshold,
        createdAt: value.createdAt,
    }
}
