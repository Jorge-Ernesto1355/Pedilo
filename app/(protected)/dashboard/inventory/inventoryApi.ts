import { apiClient } from '@/src/lib/api/client'
import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import type {
    Ingredient,
    IngredientInput,
    IngredientStatusFilter,
    IngredientsResponse,
    IngredientUpdateInput,
    InventorySettings,
    MovementInput,
    MovementsResponse,
    RecipeLine,
    RecipeTarget,
    StockAlert,
    StockMovement,
} from './inventory.types'

const credentials = { withCredentials: true }

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        return (await callback()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

const base = (businessId: string) => `/businesses/${businessId}/inventory`

export function listIngredients(
    businessId: string,
    params: { search?: string; status?: IngredientStatusFilter } = {},
) {
    return request(() =>
        apiClient.get<IngredientsResponse>(`${base(businessId)}/ingredients`, {
            ...credentials,
            params: {
                search: params.search || undefined,
                status: params.status && params.status !== 'ALL' ? params.status : undefined,
            },
        }),
    )
}

export function createIngredient(businessId: string, input: IngredientInput) {
    return request(() =>
        apiClient.post<{ ingredient: Ingredient }>(
            `${base(businessId)}/ingredients`,
            input,
            credentials,
        ),
    ).then((body) => body.ingredient)
}

export function updateIngredient(
    businessId: string,
    ingredientId: string,
    input: IngredientUpdateInput,
) {
    return request(() =>
        apiClient.patch<{ ingredient: Ingredient }>(
            `${base(businessId)}/ingredients/${ingredientId}`,
            input,
            credentials,
        ),
    ).then((body) => body.ingredient)
}

export function archiveIngredient(businessId: string, ingredientId: string) {
    return request(() =>
        apiClient.delete<void>(`${base(businessId)}/ingredients/${ingredientId}`, credentials),
    )
}

export function recordMovement(businessId: string, ingredientId: string, input: MovementInput) {
    return request(() =>
        apiClient.post<{ ingredient: Ingredient; movement: StockMovement }>(
            `${base(businessId)}/ingredients/${ingredientId}/movements`,
            input,
            credentials,
        ),
    )
}

export function listMovements(businessId: string, ingredientId: string, page: number) {
    return request(() =>
        apiClient.get<MovementsResponse>(
            `${base(businessId)}/ingredients/${ingredientId}/movements`,
            { ...credentials, params: { page, limit: 20 } },
        ),
    )
}

export function getRecipe(businessId: string, target: RecipeTarget) {
    return request(() =>
        apiClient.get<{ lines: RecipeLine[] }>(
            `${base(businessId)}/recipes/${target.kind}/${target.id}`,
            credentials,
        ),
    ).then((body) => body.lines)
}

export function setRecipe(
    businessId: string,
    target: RecipeTarget,
    lines: { ingredientId: string; quantity: number }[],
) {
    return request(() =>
        apiClient.put<{ lines: RecipeLine[] }>(
            `${base(businessId)}/recipes/${target.kind}/${target.id}`,
            { lines },
            credentials,
        ),
    ).then((body) => body.lines)
}

export function getInventorySettings(businessId: string) {
    return request(() =>
        apiClient.get<{ settings: InventorySettings }>(`${base(businessId)}/settings`, credentials),
    ).then((body) => body.settings)
}

export function updateInventorySettings(businessId: string, input: Partial<InventorySettings>) {
    return request(() =>
        apiClient.patch<{ settings: InventorySettings }>(
            `${base(businessId)}/settings`,
            input,
            credentials,
        ),
    ).then((body) => body.settings)
}

export function listStockAlerts(businessId: string) {
    return request(() =>
        apiClient.get<{ alerts: StockAlert[] }>(`${base(businessId)}/alerts`, credentials),
    ).then((body) => body.alerts)
}
