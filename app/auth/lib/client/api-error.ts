import { isAxiosError } from '@/src/lib/api/client'

export type ApiFieldErrors = Record<string, string[]>

export type BackendErrorBody = {
    success?: unknown
    code?: unknown
    message?: unknown
    error?:
        | {
              code?: unknown
              message?: unknown
              formErrors?: unknown
              fieldErrors?: unknown
              details?: unknown
              fields?: unknown
          }
        | string
        | Array<{ path?: unknown; message?: unknown }>
    response?: {
        statusCode?: unknown
        result?: unknown
    }
}

export class ApiError extends Error {
    readonly status?: number
    readonly code?: string
    readonly fieldErrors: ApiFieldErrors

    constructor({
        message,
        status,
        code,
        fieldErrors = {},
    }: {
        message: string
        status?: number
        code?: string
        fieldErrors?: ApiFieldErrors
    }) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.fieldErrors = fieldErrors
    }
}

function asString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readFieldErrors(value: unknown): ApiFieldErrors {
    if (!value || typeof value !== 'object') return {}

    if (Array.isArray(value)) {
        return value.reduce<ApiFieldErrors>((result, issue) => {
            if (!issue || typeof issue !== 'object') return result
            const path = Array.isArray(issue.path) ? issue.path.join('.') : asString(issue.path)
            const message = asString(issue.message)
            if (path && message) result[path] = [...(result[path] ?? []), message]
            return result
        }, {})
    }

    return Object.entries(value).reduce<ApiFieldErrors>((result, [field, messages]) => {
        const normalized = Array.isArray(messages)
            ? messages.filter((message): message is string => typeof message === 'string')
            : typeof messages === 'string'
              ? [messages]
              : []
        if (normalized.length) result[field] = normalized
        return result
    }, {})
}

function getBody(error: unknown): BackendErrorBody | undefined {
    if (!isAxiosError(error) || !error.response?.data || typeof error.response.data !== 'object') {
        return undefined
    }

    const rawBody = error.response.data as BackendErrorBody
    const nestedResult = rawBody.response?.result

    if (typeof nestedResult === 'string') {
        try {
            const parsedResult: unknown = JSON.parse(nestedResult)
            if (parsedResult && typeof parsedResult === 'object') {
                return parsedResult as BackendErrorBody
            }
        } catch {
            // Keep the original response when the backend result is not JSON.
        }
    }

    return rawBody
}

export function normalizeApiError(error: unknown): ApiError {
    if (!isAxiosError(error)) {
        return new ApiError({
            message: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
        })
    }

    const body = getBody(error)
    const payload = body?.error ?? (body?.success === false ? body : undefined)
    const objectPayload =
        payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : undefined
    const objectValues = objectPayload as Record<string, unknown> | undefined
    const code = objectValues
        ? asString(objectValues.code)
        : (asString(body?.code) ?? (typeof payload === 'string' ? asString(payload) : undefined))
    const fieldErrors = objectValues
        ? readFieldErrors(objectValues.fieldErrors ?? objectValues.fields ?? objectValues.details)
        : Array.isArray(payload)
          ? readFieldErrors(payload)
          : {}

    return new ApiError({
        status:
            error.response?.status ??
            (typeof body?.response?.statusCode === 'number' ? body.response.statusCode : undefined),
        code,
        message: objectValues
            ? (asString(objectValues.message) ?? 'No se pudo completar la solicitud.')
            : (asString(payload) ??
              asString(body?.message) ??
              'No se pudo completar la solicitud.'),
        fieldErrors,
    })
}
