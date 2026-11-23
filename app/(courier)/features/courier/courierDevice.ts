// Lo que el repartidor deja guardado en SU teléfono (no hay cuentas de repartidor).

export type CourierIdentity = { name: string; phone: string }

const IDENTITY_KEY = 'pedilo:courier'
const CLAIMS_KEY = 'pedilo:courier-claims'
/** Solo se recuerdan las últimas entregas tomadas en este teléfono. */
const MAX_CLAIMS = 20

function read<T>(key: string): T | null {
    try {
        const raw = window.localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
    } catch {
        return null
    }
}

function write(key: string, value: unknown) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Modo privado o almacenamiento lleno: la próxima vez se vuelven a pedir los datos.
    }
}

export function readCourierIdentity(): CourierIdentity | null {
    const value = read<Partial<CourierIdentity>>(IDENTITY_KEY)
    if (typeof value?.name !== 'string' || typeof value.phone !== 'string') return null
    if (!value.name.trim() || !/^\d{10}$/.test(value.phone)) return null
    return { name: value.name, phone: value.phone }
}

export function saveCourierIdentity(identity: CourierIdentity) {
    write(IDENTITY_KEY, identity)
}

/** Link personal (/entrega/…) de una oferta que se tomó desde este teléfono. */
export function readClaimedDelivery(offerToken: string): string | null {
    const claims = read<Array<[string, string]>>(CLAIMS_KEY)
    if (!Array.isArray(claims)) return null
    return claims.find(([offer]) => offer === offerToken)?.[1] ?? null
}

export function saveClaimedDelivery(offerToken: string, courierToken: string) {
    const claims = read<Array<[string, string]>>(CLAIMS_KEY)
    const others = Array.isArray(claims) ? claims.filter(([offer]) => offer !== offerToken) : []
    write(CLAIMS_KEY, [[offerToken, courierToken], ...others].slice(0, MAX_CLAIMS))
}
