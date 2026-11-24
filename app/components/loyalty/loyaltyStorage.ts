// Memoria local de la tarjeta de lealtad en el navegador del cliente. Todo acceso a
// localStorage va en try/catch: en modo privado o con almacenamiento lleno simplemente
// no se recuerda nada y la página sigue funcionando.

const TOKEN_KEY_PREFIX = 'pedilo:loyalty:card:'
const SEEN_KEY_PREFIX = 'pedilo:loyalty:seen:'
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/

function storage(): Storage | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null
    } catch {
        return null
    }
}

function read(key: string) {
    try {
        return storage()?.getItem(key) ?? null
    } catch {
        return null
    }
}

function write(key: string, value: string) {
    try {
        storage()?.setItem(key, value)
    } catch {
        // Sin almacenamiento disponible: no se recuerda.
    }
}

function remove(key: string) {
    try {
        storage()?.removeItem(key)
    } catch {
        // Igual que arriba.
    }
}

export function isCardToken(value: unknown): value is string {
    return typeof value === 'string' && TOKEN_FORMAT.test(value)
}

/** Llave de la tarjeta del cliente en ESTE restaurante (una por restaurante). */
export function readCardToken(slug: string): string | null {
    const value = read(`${TOKEN_KEY_PREFIX}${slug}`)
    return isCardToken(value) ? value : null
}

export function saveCardToken(slug: string, token: string) {
    if (isCardToken(token)) write(`${TOKEN_KEY_PREFIX}${slug}`, token)
}

export function clearCardToken(slug: string) {
    remove(`${TOKEN_KEY_PREFIX}${slug}`)
}

/** Lo último que el cliente vio de su tarjeta: ciclos completados y sellos del ciclo. */
export type SeenProgress = { cycles: number; count: number }

export function readSeenProgress(token: string): SeenProgress | null {
    const raw = read(`${SEEN_KEY_PREFIX}${token}`)
    if (!raw) return null
    try {
        const value = JSON.parse(raw) as Partial<SeenProgress>
        return Number.isInteger(value.cycles) &&
            Number.isInteger(value.count) &&
            value.cycles! >= 0 &&
            value.count! >= 0
            ? { cycles: value.cycles!, count: value.count! }
            : null
    } catch {
        return null
    }
}

export function writeSeenProgress(token: string, progress: SeenProgress) {
    write(`${SEEN_KEY_PREFIX}${token}`, JSON.stringify(progress))
}

export type CardProgress = {
    stampsCount: number
    stampsRequired: number
    cyclesCompleted: number
    rewardAvailable: boolean
}

/**
 * Sellos que se dibujan llenos. Recién completada (conteo en 0 con premio disponible), la
 * tarjeta se muestra llena con el premio encendido hasta que llegue el siguiente sello.
 */
export function displayedStamps(card: CardProgress) {
    if (card.rewardAvailable && card.stampsCount === 0 && card.cyclesCompleted > 0)
        return card.stampsRequired
    return Math.min(card.stampsCount, card.stampsRequired)
}

/** Lo que se guarda como "visto" para la tarjeta tal como se muestra ahora. */
export function seenFrom(card: CardProgress): SeenProgress {
    return { cycles: card.cyclesCompleted, count: displayedStamps(card) }
}

/**
 * Desde qué sello animar: solo los que el cliente no ha visto, una sola vez.
 * - Primera vez: anima todos los sellos que tiene.
 * - Mismo ciclo: anima la diferencia.
 * - Completó la tarjeta desde la última vez: anima hasta llenarla (y luego la celebración).
 * - Si bajó (sello anulado): no anima.
 */
export function computeAnimateFrom(seen: SeenProgress | null, card: CardProgress): number {
    const shown = displayedStamps(card)
    if (!seen) return 0
    if (card.cyclesCompleted === seen.cycles) return Math.min(seen.count, shown)
    if (card.cyclesCompleted < seen.cycles) return shown
    const completedNow = shown === card.stampsRequired && card.stampsCount === 0
    if (completedNow && card.cyclesCompleted === seen.cycles + 1) return Math.min(seen.count, shown)
    return 0
}
