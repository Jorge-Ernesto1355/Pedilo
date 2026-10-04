export function formatMoney(value: number, currency = 'MXN') {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(value)
}

export function formatBusinessDate(value: string | undefined, timezone = 'America/Mazatlan') {
    if (!value) return 'Fecha no disponible'

    try {
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: timezone,
        }).format(new Date(value))
    } catch {
        return new Intl.DateTimeFormat('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value))
    }
}

export function formatBusinessTime(value: string | undefined, timezone = 'America/Mazatlan') {
    if (!value) return '—'

    try {
        return new Intl.DateTimeFormat('es-MX', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone,
        }).format(new Date(value))
    } catch {
        return new Intl.DateTimeFormat('es-MX', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(value))
    }
}
