import type { StoreVisitSeriesGranularity } from './storeVisitsStats'

// Compartido entre la tarjeta y la gráfica diferida para que la tarjeta no tenga
// que importar el chunk de recharts.
export function formatCount(value: number) {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value)
}

export function formatSeriesLabel(
    label: string,
    granularity: StoreVisitSeriesGranularity,
    compact: boolean,
) {
    if (granularity === 'hour') return label
    if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return label

    const [year, month, day] = label.split('-').map(Number)
    // These are calendar labels in the business timezone. UTC prevents shifting the date
    // when the dashboard is opened in a different timezone.
    const value = new Date(Date.UTC(year, month - 1, day, 12))
    return new Intl.DateTimeFormat('es-MX', {
        day: 'numeric',
        ...(compact ? {} : { weekday: 'long', month: 'long', year: 'numeric' }),
        ...(compact ? { month: 'short' } : {}),
        timeZone: 'UTC',
    }).format(value)
}
