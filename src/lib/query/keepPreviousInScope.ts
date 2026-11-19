import type { QueryKey } from '@tanstack/react-query'

/**
 * Variante de `keepPreviousData` que solo conserva los datos anteriores si la
 * query previa pertenece al mismo ámbito (los primeros segmentos de la key, p. ej.
 * `['customers', businessId]`). Así un cambio de filtro, página o búsqueda no
 * vuelve al skeleton, pero nunca se muestran datos de otro usuario o negocio.
 */
export function keepPreviousInScope(scope: QueryKey) {
    return <TData>(
        previousData: TData | undefined,
        previousQuery?: { queryKey: QueryKey },
    ): TData | undefined => {
        if (!previousQuery) return undefined
        const sameScope = scope.every((part, index) => previousQuery.queryKey[index] === part)
        return sameScope ? previousData : undefined
    }
}
