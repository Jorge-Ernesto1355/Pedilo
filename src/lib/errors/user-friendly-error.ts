import { ApiError, type ApiFieldErrors } from '@/app/auth/lib/client/api-error'

export type UserFriendlyError = {
    title: string
    description: string
}

type UserFriendlyErrorOptions = {
    fallback?: Partial<UserFriendlyError>
    context?: string
}

const fallbackError: UserFriendlyError = {
    title: 'Ocurrió un problema',
    description: 'Ocurrió un problema inesperado. Inténtalo nuevamente.',
}

const knownErrors: Record<string, UserFriendlyError> = {
    NOT_AUTHENTICATED: {
        title: 'Tu sesión terminó',
        description: 'Inicia sesión nuevamente para continuar.',
    },
    INVALID_CREDENTIALS: {
        title: 'Datos incorrectos',
        description: 'El correo o la contraseña no son correctos.',
    },
    INVALID_EMAIL_OR_PASSWORD: {
        title: 'Datos incorrectos',
        description: 'El correo o la contraseña no son correctos.',
    },
    INVALID_PASSWORD: {
        title: 'Contraseña incorrecta',
        description: 'La contraseña no es correcta. Revísala e inténtalo nuevamente.',
    },
    PASSWORD_TOO_SHORT: {
        title: 'Contraseña demasiado corta',
        description: 'Usa una contraseña más larga para continuar.',
    },
    PASSWORD_TOO_LONG: {
        title: 'Contraseña demasiado larga',
        description: 'Usa una contraseña más corta para continuar.',
    },
    INVALID_EMAIL: {
        title: 'Correo no válido',
        description: 'Ingresa un correo electrónico válido.',
    },
    EMAIL_ALREADY_IN_USE: {
        title: 'Correo ya registrado',
        description: 'Este correo ya tiene una cuenta. Inicia sesión para continuar.',
    },
    NAME_ALREADY_IN_USE: {
        title: 'Nombre no disponible',
        description: 'Ese nombre ya está en uso. Elige otro para continuar.',
    },
    CURRENT_PASSWORD_INCORRECT: {
        title: 'Contraseña incorrecta',
        description: 'La contraseña actual no coincide.',
    },
    PASSWORD_REQUIREMENTS_NOT_MET: {
        title: 'Contraseña no válida',
        description: 'La contraseña no cumple los requisitos de seguridad.',
    },
    ORDER_BUSINESS_ACCESS_DENIED: {
        title: 'Acción no permitida',
        description: 'Esta orden no pertenece a tu restaurante.',
    },
    CUSTOMER_BUSINESS_ACCESS_DENIED: {
        title: 'Acción no permitida',
        description: 'No tienes permiso para administrar los clientes de este restaurante.',
    },
    CATEGORY_BUSINESS_ACCESS_DENIED: {
        title: 'Acción no permitida',
        description: 'No tienes permiso para administrar las categorías de este restaurante.',
    },
    OPTION_GROUP_BUSINESS_ACCESS_DENIED: {
        title: 'Acción no permitida',
        description: 'No tienes permiso para administrar las opciones de este restaurante.',
    },
    BUSINESS_ACCESS_DENIED: {
        title: 'Acción no permitida',
        description: 'No tienes permisos para realizar esta acción en este restaurante.',
    },
    ORDER_PRODUCT_NOT_AVAILABLE: {
        title: 'Producto no disponible',
        description:
            'Uno de los productos seleccionados ya no está disponible. Actualiza el catálogo e inténtalo nuevamente.',
    },
    ORDER_INVALID_OPTIONS: {
        title: 'Opciones no válidas',
        description:
            'Una de las opciones seleccionadas ya no está disponible o no corresponde a ese producto. Revisa tu selección.',
    },
    ORDER_INVALID_STATUS_TRANSITION: {
        title: 'La orden cambió',
        description: 'La orden cambió en otra sesión. Actualiza la lista e inténtalo nuevamente.',
    },
    ORDER_NOT_FOUND: {
        title: 'Orden no encontrada',
        description: 'La orden ya no existe o no está disponible.',
    },
    CUSTOMER_NOT_FOUND: {
        title: 'Cliente no encontrado',
        description: 'No encontramos el cliente. Es posible que haya sido eliminado.',
    },
    CUSTOMER_HAS_ORDERS: {
        title: 'No se puede eliminar el cliente',
        description:
            'Este cliente tiene órdenes asociadas. Conserva su registro para mantener el historial.',
    },
    CUSTOMER_PHONE_ALREADY_EXISTS: {
        title: 'Teléfono ya registrado',
        description: 'Ya existe un cliente con ese número de teléfono.',
    },
    CUSTOMER_PHONE_CONFLICT: {
        title: 'Teléfono ya registrado',
        description: 'Ya existe un cliente con ese número de teléfono.',
    },
    BUSINESS_NOT_FOUND: {
        title: 'Restaurante no encontrado',
        description: 'No encontramos el restaurante solicitado o ya no está disponible.',
    },
    PUBLIC_BUSINESS_NOT_FOUND: {
        title: 'Restaurante no encontrado',
        description: 'No encontramos el restaurante solicitado o ya no está disponible.',
    },
    CATEGORY_BUSINESS_NOT_FOUND: {
        title: 'Restaurante no encontrado',
        description: 'No encontramos el restaurante asociado a tu cuenta.',
    },
    CATEGORY_MENU_NOT_FOUND: {
        title: 'Menú no encontrado',
        description:
            'No encontramos el menú solicitado. Actualiza la página e inténtalo nuevamente.',
    },
    CATEGORY_NOT_FOUND: {
        title: 'Categoría no encontrada',
        description:
            'La categoría ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
    },
    MENU_NOT_FOUND: {
        title: 'Menú no encontrado',
        description: 'El menú ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
    },
    PRODUCT_NOT_FOUND: {
        title: 'Producto no encontrado',
        description:
            'El producto ya no está disponible. Actualiza el catálogo e inténtalo nuevamente.',
    },
    OPTION_GROUP_PRODUCT_NOT_FOUND: {
        title: 'Producto no encontrado',
        description: 'No encontramos el producto asociado a este grupo de opciones.',
    },
    OPTION_GROUP_NOT_FOUND: {
        title: 'Grupo de opciones no encontrado',
        description:
            'El grupo ya no está disponible. Actualiza la información e inténtalo nuevamente.',
    },
    OPTION_NOT_FOUND: {
        title: 'Opción no encontrada',
        description:
            'La opción ya no está disponible. Actualiza la información e inténtalo nuevamente.',
    },
    PRODUCT_HAS_ORDERS: {
        title: 'No se puede eliminar el producto',
        description:
            'Este producto tiene historial de órdenes. Desactívalo en lugar de eliminarlo.',
    },
    MENU_CONTAINS_PRODUCTS: {
        title: 'No se puede eliminar el menú',
        description: 'Mueve o elimina los productos del menú antes de intentarlo nuevamente.',
    },
    CATEGORY_CONTAINS_PRODUCTS: {
        title: 'No se puede eliminar la categoría',
        description: 'Mueve sus productos a otra categoría antes de eliminarla.',
    },
    SETTINGS_ALREADY_EXISTS: {
        title: 'La configuración ya existe',
        description: 'Vuelve a abrir la configuración para actualizarla.',
    },
    BUSINESS_SLUG_ALREADY_EXISTS: {
        title: 'Enlace no disponible',
        description: 'Ese enlace ya está en uso. Elige otro para continuar.',
    },
    USER_ALREADY_HAS_BUSINESS: {
        title: 'Ya tienes un restaurante',
        description: 'Tu cuenta ya tiene un restaurante configurado.',
    },
    TARGET_CATEGORY_NOT_FOUND: {
        title: 'Categoría no encontrada',
        description:
            'La categoría destino ya no está disponible. Actualiza la lista e inténtalo nuevamente.',
    },
    SAME_CATEGORY: {
        title: 'Categoría de destino no válida',
        description: 'Selecciona una categoría diferente a la de origen.',
    },
    PRODUCT_SAME_CATEGORY: {
        title: 'El producto ya está ahí',
        description: 'Selecciona una categoría diferente para moverlo.',
    },
    INVALID_CATEGORY_ORDER: {
        title: 'No se pudo ordenar las categorías',
        description: 'Actualiza el menú e inténtalo nuevamente.',
    },
    INVALID_PRODUCT_ORDER: {
        title: 'No se pudo ordenar los productos',
        description: 'Actualiza la categoría e inténtalo nuevamente.',
    },
    INVALID_PRODUCT_DATA: {
        title: 'Información del producto no válida',
        description: 'Revisa los datos del producto e inténtalo nuevamente.',
    },
    INVALID_OPTION_GROUP_CONFIGURATION: {
        title: 'Configuración no válida',
        description: 'Revisa los límites de selección del grupo de opciones.',
    },
    INVALID_OPTION_GROUP_ORDER: {
        title: 'No se pudo ordenar los grupos',
        description: 'Actualiza la información e inténtalo nuevamente.',
    },
    INVALID_OPTION_ORDER: {
        title: 'No se pudo ordenar las opciones',
        description: 'Actualiza la información e inténtalo nuevamente.',
    },
    INVALID_OPTION_PRICE: {
        title: 'Precio no válido',
        description: 'Ingresa un precio válido para la opción.',
    },
    OPTION_GROUP_SAME_PRODUCT: {
        title: 'Grupo no válido',
        description: 'Este grupo ya está asociado al producto.',
    },
    VALIDATION_ERROR: {
        title: 'Revisa la información',
        description:
            'Algunos datos no son válidos. Revisa los campos marcados e inténtalo nuevamente.',
    },
    ORIGIN_NOT_ALLOWED: {
        title: 'Solicitud no permitida',
        description: 'No se pudo validar el origen de la solicitud.',
    },
    INTERNAL_ERROR: {
        title: 'Ocurrió un problema en Pedilo',
        description: 'Ocurrió un problema en el servidor. Inténtalo nuevamente en unos momentos.',
    },
    BAD_REQUEST: {
        title: 'Solicitud no válida',
        description: 'Revisa la información e inténtalo nuevamente.',
    },
    UNAUTHORIZED: {
        title: 'Tu sesión no es válida',
        description: 'Inicia sesión nuevamente para continuar.',
    },
    FORBIDDEN: {
        title: 'Acción no permitida',
        description: 'No tienes permisos para realizar esta acción.',
    },
    NOT_FOUND: {
        title: 'Información no encontrada',
        description: 'No encontramos la información que buscas o ya no está disponible.',
    },
    UNEXPECTED_AUTH_ERROR: {
        title: 'No se pudo completar la sesión',
        description: 'Inténtalo nuevamente en unos momentos.',
    },
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
        title: 'Correo ya registrado',
        description: 'Este correo ya tiene una cuenta. Usa otro correo o inicia sesión.',
    },
    INVALID_TOKEN: {
        title: 'Enlace no válido',
        description: 'Este enlace de recuperación no es válido. Solicita uno nuevo.',
    },
    TOKEN_INVALID: {
        title: 'Enlace no válido',
        description: 'Este enlace de recuperación no es válido. Solicita uno nuevo.',
    },
    RESET_TOKEN_INVALID: {
        title: 'Enlace no válido',
        description: 'Este enlace de recuperación no es válido. Solicita uno nuevo.',
    },
    TOKEN_EXPIRED: {
        title: 'Enlace expirado',
        description: 'Este enlace ya expiró. Solicita uno nuevo para continuar.',
    },
    RESET_TOKEN_EXPIRED: {
        title: 'Enlace expirado',
        description: 'Este enlace ya expiró. Solicita uno nuevo para continuar.',
    },
    TOKEN_ALREADY_USED: {
        title: 'Enlace ya utilizado',
        description: 'Este enlace ya fue utilizado. Solicita uno nuevo para continuar.',
    },
    RESET_TOKEN_USED: {
        title: 'Enlace ya utilizado',
        description: 'Este enlace ya fue utilizado. Solicita uno nuevo para continuar.',
    },
}

const technicalMessage =
    /(axios|fetch|request failed|network error|unknown error|bad request|unauthorized|forbidden|not found|internal server|stack|prisma|sqlstate|status code|\b(error|failed|failure)\b|^[A-Z][A-Z0-9_]+$)/i
const englishMessage =
    /\b(the|this|that|with|from|for|invalid|cannot|could|please|already|does|is|are|has|have|was|were|your|email|password|business|product|order|selected|available|server|internal|unexpected|request|user|access|denied|exists|wrong)\b/i

function getErrorParts(error: unknown) {
    if (error instanceof ApiError) {
        return {
            status: error.status,
            code: error.code,
            message: error.message,
            fieldErrors: error.fieldErrors,
        }
    }
    if (!error || typeof error !== 'object')
        return { status: undefined, code: undefined, message: '', fieldErrors: {} }

    const value = error as Record<string, unknown>
    const response = value.response as Record<string, unknown> | undefined
    const data = response?.data as Record<string, unknown> | undefined
    const nested =
        data?.error && typeof data.error === 'object'
            ? (data.error as Record<string, unknown>)
            : undefined
    const status =
        typeof value.status === 'number'
            ? value.status
            : typeof response?.status === 'number'
              ? response.status
              : undefined
    const code =
        typeof value.code === 'string'
            ? value.code
            : typeof nested?.code === 'string'
              ? nested.code
              : typeof data?.code === 'string'
                ? data.code
                : undefined
    const message =
        typeof value.message === 'string'
            ? value.message
            : typeof nested?.message === 'string'
              ? nested.message
              : typeof data?.message === 'string'
                ? data.message
                : ''
    return { status, code, message, fieldErrors: {} as ApiFieldErrors }
}

function isSafeSpanishMessage(message: string) {
    const value = message.trim()
    return Boolean(value) && !technicalMessage.test(value) && !englishMessage.test(value)
}

function byStatus(status: number | undefined): UserFriendlyError | undefined {
    if (status === 400) return knownErrors.VALIDATION_ERROR
    if (status === 401) return knownErrors.NOT_AUTHENTICATED
    if (status === 403) return knownErrors.BUSINESS_ACCESS_DENIED
    if (status === 404)
        return {
            title: 'Información no encontrada',
            description:
                'No encontramos la información que buscas. Es posible que haya sido eliminada o ya no esté disponible.',
        }
    if (status === 409)
        return {
            title: 'No se pudo completar la acción',
            description:
                'La información cambió o ya existe. Actualiza la página e inténtalo nuevamente.',
        }
    if (status === 422) return knownErrors.VALIDATION_ERROR
    if (status === 410) return knownErrors.TOKEN_EXPIRED
    if (status === 429)
        return {
            title: 'Demasiados intentos',
            description: 'Espera un momento e inténtalo nuevamente.',
        }
    if (status !== undefined && status >= 500) return knownErrors.INTERNAL_ERROR
    return undefined
}

export function getUserFriendlyError(
    error: unknown,
    options: UserFriendlyErrorOptions = {},
): UserFriendlyError {
    const parts = getErrorParts(error)

    // Backend messages that are already safe, localized Spanish copy should
    // remain useful to the user even when the backend also sends a generic
    // status code such as INTERNAL_ERROR or CONFLICT.
    if (error instanceof ApiError && isSafeSpanishMessage(parts.message)) {
        return {
            title: options.fallback?.title ?? 'No se pudo completar la acción',
            description: parts.message,
        }
    }

    const mapped = parts.code ? knownErrors[parts.code] : undefined
    if (mapped) return mapped

    const statusMessage = byStatus(parts.status)
    if (statusMessage) return statusMessage

    if (isSafeSpanishMessage(parts.message)) {
        return {
            title: options.fallback?.title ?? 'No se pudo completar la acción',
            description: parts.message,
        }
    }

    if (error instanceof TypeError || /network|connect|fetch/i.test(parts.message)) {
        return {
            title: 'Sin conexión con Pedilo',
            description: 'Revisa tu conexión a internet e inténtalo nuevamente.',
        }
    }

    return {
        ...fallbackError,
        ...options.fallback,
        ...(options.context
            ? { description: `${options.context} ${fallbackError.description}` }
            : {}),
    }
}

export function getUserFriendlyFieldError(
    error: unknown,
    field: string,
    fallback = 'Revisa este campo e inténtalo nuevamente.',
) {
    const parts = getErrorParts(error)
    const message = parts.fieldErrors[field]?.[0]
    if (message && isSafeSpanishMessage(message)) return message
    return fallback
}

export function getUserFriendlyErrorFromCode(
    code: string | undefined,
    fallback?: Partial<UserFriendlyError>,
) {
    return (code && knownErrors[code]) ?? { ...fallbackError, ...fallback }
}
