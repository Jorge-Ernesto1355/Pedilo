export type IngredientUnit = 'G' | 'ML' | 'UNIT'
export type StockLevel = 'OK' | 'LOW' | 'CRITICAL' | 'OUT'
export type LowStockMode = 'PERCENT' | 'ABSOLUTE'
export type StockBlockMode = 'NONE' | 'OUT_OF_STOCK' | 'LOW_STOCK'
export type StockAlertKind = 'STOCK' | 'CONSUMPTION'
export type StockAlertLevel = 'LOW' | 'CRITICAL' | 'OUT' | 'HIGH'
export type StockMovementType = 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT'
export type IngredientStatusFilter = 'ALL' | 'ALERTS' | Exclude<StockLevel, 'OK'> | 'OK'

export type Ingredient = {
    id: string
    name: string
    unit: IngredientUnit
    stock: number
    parLevel: number
    lowStockMode: LowStockMode
    lowStockValue: number | null
    consumptionAlertPercent: number | null
    /** Stock at or below this quantity is considered low. */
    threshold: number
    level: StockLevel
    createdAt: string
    updatedAt: string
}

export type IngredientCounts = Record<StockLevel, number>

export type IngredientsResponse = {
    ingredients: Ingredient[]
    counts: IngredientCounts
}

export type IngredientInput = {
    name: string
    unit: IngredientUnit
    initialStock?: number
    parLevel?: number
    lowStockMode?: LowStockMode
    lowStockValue?: number | null
    consumptionAlertPercent?: number | null
}

export type IngredientUpdateInput = Partial<Omit<IngredientInput, 'initialStock' | 'unit'>>

export type MovementInput = {
    type: 'PURCHASE' | 'WASTE' | 'ADJUSTMENT'
    quantity: number
    note?: string | null
}

export type StockMovement = {
    id: string
    type: StockMovementType
    quantity: number
    stockAfter: number
    orderId: string | null
    note: string | null
    createdAt: string
}

export type MovementsResponse = {
    movements: StockMovement[]
    total: number
    page: number
    limit: number
}

export type RecipeTarget = {
    kind: 'products' | 'product-options' | 'global-options'
    id: string
}

export type RecipeLine = {
    ingredientId: string
    ingredientName: string
    unit: IngredientUnit
    quantity: number
}

export type InventorySettings = {
    alertsEnabled: boolean
    defaultLowStockPercent: number
    consumptionAlertPercent: number
    consumptionWindowHours: number
    blockMode: StockBlockMode
}

export type StockAlert = {
    id: string
    ingredientId: string
    ingredientName: string
    unit: IngredientUnit
    kind: StockAlertKind
    level: StockAlertLevel
    stock: number
    createdAt: string
}
