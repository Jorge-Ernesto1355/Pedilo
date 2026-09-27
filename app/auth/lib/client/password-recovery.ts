import type {
    RecoveryEmailValues,
    ResetPasswordValues,
    VerificationCodeValues,
} from '@/app/auth/lib/validation'
import { normalizeApiError } from './api-error'
import { apiClient } from '@/src/lib/api/client'

/**
 * Adapter boundary for the external authentication backend.
 *
 * The backend contract is intentionally not assumed here. The integration
 * layer should map its own transport and response format to these methods and
 * resolve on success or reject with an optional `{ status }` error.
 */
export type ResetPasswordPayload = {
    token: string
    newPassword: ResetPasswordValues['newPassword']
}

/** Compatibility shape for tests and integrations that inject a recovery client. */
export interface PasswordRecoveryClient {
    requestReset(values: RecoveryEmailValues): Promise<void>
    verifyCode?(values: VerificationCodeValues & { email: string }): Promise<void>
    resendCode?(values: RecoveryEmailValues): Promise<void>
    resetPassword?(values: ResetPasswordValues & { email: string; code: string }): Promise<void>
}

export async function requestPasswordReset(values: RecoveryEmailValues): Promise<void> {
    try {
        await apiClient.post('/auth/forgot-password', { email: values.email })
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export async function resetAccountPassword(payload: ResetPasswordPayload): Promise<void> {
    try {
        await apiClient.post('/auth/reset-password', payload)
    } catch (error) {
        throw normalizeApiError(error)
    }
}
