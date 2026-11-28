import type {
    IngredientUnit,
    StockAlertKind,
    StockAlertLevel,
    StockLevel,
    StockMovementType,
} from './inventory.types'

export const unitLabels: Record<IngredientUnit, string> = {
    G: 'g',
    ML: 'ml',
    UNIT: 'pza',
}

/** Most stock a single ingredient can hold, in its stored unit (1,000 kg / 10,000 ml / 1,000 pza). */
export const maxQuantity: Record<IngredientUnit, number> = {
    G: 1_000_000,
    ML: 10_000,
    UNIT: 1_000,
}

export const maxQuantityLabel: Record<IngredientUnit, string> = {
    G: '1,000 kg',
    ML: '10,000 ml',
    UNIT: '1,000 piezas',
}

export const unitNames: Record<IngredientUnit, string> = {
    G: 'Gramos (g)',
    ML: 'Mililitros (ml)',
    UNIT: 'Piezas (pza)',
}

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })

/** 1500 g reads better as 1.5 kg; the stored unit never changes. */
export function formatQuantity(value: number, unit: IngredientUnit) {
    if (unit !== 'UNIT' && Math.abs(value) >= 1000)
        return `${number.format(value / 1000)} ${unit === 'G' ? 'kg' : 'L'}`
    return `${number.format(value)} ${unitLabels[unit]}`
}

export const levelCopy: Record<StockLevel, string> = {
    OK: 'Normal',
    LOW: 'Bajo',
    CRITICAL: 'Crítico',
    OUT: 'Agotado',
}

export const movementCopy: Record<StockMovementType, string> = {
    PURCHASE: 'Compra',
    CONSUMPTION: 'Pedido',
    WASTE: 'Merma',
    ADJUSTMENT: 'Conteo',
}

export function alertCopy(kind: StockAlertKind, level: StockAlertLevel) {
    if (kind === 'CONSUMPTION') return 'Consumo alto'
    return level === 'OUT' ? 'Agotado' : level === 'CRITICAL' ? 'Stock crítico' : 'Stock bajo'
}
