import { apiClient } from '@/src/lib/api/client'
import type { RegisterFormValues } from '@/app/auth/lib/validation'
import { normalizeApiError } from './api-error'

export type RegisterPayload = Omit<RegisterFormValues, 'confirm'>

export type RegisterResponse = {
    success: true
    message?: string
}

function usesLocalLegalAcceptanceContract() {
    const backendUrl = apiClient.defaults?.baseURL
    if (!backendUrl) return false

    try {
        const hostname = new URL(backendUrl).hostname
        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '::1' ||
            hostname.endsWith('.localhost')
        )
    } catch {
        return false
    }
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
    try {
        const backendPayload = usesLocalLegalAcceptanceContract()
            ? {
                  name: payload.name,
                  email: payload.email,
                  password: payload.password,
                  acceptLegalDocuments: payload.terms,
                  ageDeclaration: payload.terms,
              }
            : payload
        const { data } = await apiClient.post<RegisterResponse>('/auth/register', backendPayload)
        return data
    } catch (error) {
        throw normalizeApiError(error)
    }
}
