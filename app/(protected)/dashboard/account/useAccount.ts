'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { friendlyNotificationError, notify } from '@/src/lib/notifications/notify'
import { normalizeApiError, type ApiError } from '@/app/auth/lib/client/api-error'
import {
    changeAccountPassword,
    deleteAccount,
    getAccount,
    requestEmailVerification,
    resendEmailVerification,
    updateAccountName,
} from './accountApi'

export const accountQueryKey = ['account'] as const

export function useAccount() {
    return useQuery({
        queryKey: accountQueryKey,
        queryFn: getAccount,
        staleTime: 5 * 60 * 1000,
    })
}

function readableError(error: unknown, fallback: string) {
    const normalized = error instanceof Error ? error : normalizeApiError(error)
    const apiError = normalized as ApiError
    if (apiError.code === 'NAME_ALREADY_IN_USE' || apiError.status === 409) {
        return 'Ese nombre ya está en uso. Elige otro para continuar.'
    }
    if (apiError.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.'
    if (apiError.status === 429)
        return 'Has realizado demasiadas solicitudes. Espera un momento e inténtalo de nuevo.'
    if (apiError.status === undefined)
        return 'No pudimos conectar con el servidor. Revisa tu conexión.'
    return friendlyNotificationError(apiError, fallback)
}

export function useAccountMutations() {
    const queryClient = useQueryClient()
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: accountQueryKey })

    const updateName = useMutation({
        mutationFn: updateAccountName,
        onSuccess: () => {
            invalidate()
            notify.success({
                title: 'Nombre actualizado',
                description: 'Tu cuenta quedó actualizada.',
            })
        },
        onError: (error) =>
            notify.error({
                title: 'No se pudo actualizar tu nombre',
                description: readableError(error, 'Inténtalo nuevamente.'),
            }),
    })

    const sendVerification = useMutation({
        mutationFn: requestEmailVerification,
        onSuccess: () =>
            notify.success({
                title: 'Correo enviado',
                description: 'Revisa tu bandeja de entrada para verificar tu email.',
            }),
        onError: (error) =>
            notify.error({
                title: 'No se pudo enviar el correo',
                description: readableError(error, 'Inténtalo nuevamente.'),
            }),
    })

    const resendVerification = useMutation({
        mutationFn: resendEmailVerification,
        onSuccess: () =>
            notify.success({
                title: 'Correo reenviado',
                description: 'Revisa tu bandeja de entrada.',
            }),
        onError: (error) =>
            notify.error({
                title: 'No se pudo reenviar el correo',
                description: readableError(error, 'Inténtalo nuevamente.'),
            }),
    })

    const changePassword = useMutation({
        mutationFn: changeAccountPassword,
        onSuccess: () =>
            notify.success({
                title: 'Contraseña actualizada',
                description: 'Tu contraseña se cambió correctamente.',
            }),
        onError: (error) =>
            notify.error({
                title: 'No se pudo cambiar la contraseña',
                description: readableError(error, 'Inténtalo nuevamente.'),
            }),
    })

    const removeAccount = useMutation({
        mutationFn: deleteAccount,
    })

    return { updateName, sendVerification, resendVerification, changePassword, removeAccount }
}
