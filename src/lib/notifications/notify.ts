import { sileo, type SileoOptions } from 'sileo'
import { getUserFriendlyError } from '@/src/lib/errors/user-friendly-error'

type NotificationOptions = Omit<SileoOptions, 'type'> & {
    /** Optional semantic key for suppressing repeated feedback from one action. */
    dedupeKey?: string
}

const recentNotifications = new Map<string, { id: string; at: number }>()
const DEDUPE_WINDOW_MS = 1200

const defaults = {
    fill: '#111827',
    roundness: 14,
    styles: {
        title: 'pedilo-notification-title',
        description: 'pedilo-notification-description',
    },
} satisfies Pick<SileoOptions, 'fill' | 'roundness' | 'styles'>

function plainText(value: unknown) {
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    return ''
}

function show(type: 'success' | 'error' | 'warning' | 'info', options: NotificationOptions) {
    const { dedupeKey, styles, ...rest } = options
    const key = dedupeKey ?? `${type}:${plainText(rest.title)}:${plainText(rest.description)}`
    const now = Date.now()
    const previous = recentNotifications.get(key)
    if (previous && now - previous.at < DEDUPE_WINDOW_MS) return previous.id

    const id = sileo[type]({
        ...defaults,
        ...rest,
        duration: rest.duration ?? (type === 'error' ? 8000 : 4500),
        styles: { ...defaults.styles, ...styles },
    })
    recentNotifications.set(key, { id, at: now })
    return id
}

export const notify = {
    success: (options: NotificationOptions) => show('success', options),
    error: (options: NotificationOptions) => show('error', options),
    warning: (options: NotificationOptions) => show('warning', options),
    info: (options: NotificationOptions) => show('info', options),
}

export function orderStatusNotification(
    status: 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED',
    orderNumber: number,
) {
    const messages = {
        PENDING: [
            'Orden marcada como nueva',
            `La orden #${orderNumber} volvió a estar en estado Nueva.`,
        ],
        PREPARING: ['Orden en preparación', `La orden #${orderNumber} ahora está en preparación.`],
        READY: ['¡Orden lista!', `La orden #${orderNumber} está lista para entregar.`],
        CANCELLED: ['Orden cancelada', `La orden #${orderNumber} fue cancelada.`],
    } as const
    const [title, description] = messages[status]
    return { title, description }
}

export function friendlyNotificationError(error: unknown, fallback: string) {
    return getUserFriendlyError(error, { fallback: { description: fallback } }).description
}
