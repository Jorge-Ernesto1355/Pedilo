import type { Coordinates, CourierFailureReason } from './courierApi'

export function money(value: number) {
    return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function itemCountLabel(count: number) {
    return count === 1 ? '1 artículo' : `${count} artículos`
}

/** Ruta en Google Maps desde la ubicación actual del repartidor. */
export function mapsDirectionsUrl({ latitude, longitude }: Coordinates) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}

/** Los teléfonos se guardan con 10 dígitos nacionales (México). */
export function telHref(phone: string) {
    return `tel:+52${phone.replace(/\D/g, '').slice(-10)}`
}

export function phoneLabel(phone: string) {
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) return phone
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`
}

/** "Av. del Mar 100, Col. Centro" (sin duplicar el prefijo si el cliente ya lo escribió). */
export function addressLine(address: string, neighborhood: string | null) {
    const value = neighborhood?.trim()
    if (!value) return address
    const label = /^(colonia(\s+|$)|col\.\s*|col(\s+|$))/i.test(value) ? value : `Col. ${value}`
    return `${address}, ${label}`
}

export const failureReasonOptions: Array<{ value: CourierFailureReason; label: string }> = [
    { value: 'CUSTOMER_UNREACHABLE', label: 'El cliente no contesta' },
    { value: 'WRONG_ADDRESS', label: 'Dirección incorrecta' },
    { value: 'CUSTOMER_REJECTED', label: 'El cliente rechazó el pedido' },
    { value: 'OTHER', label: 'Otro motivo' },
]

export function failureReasonLabel(reason: CourierFailureReason | null) {
    return failureReasonOptions.find((option) => option.value === reason)?.label ?? null
}

export function timeLabel(iso: string | null) {
    if (!iso) return null
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
}
