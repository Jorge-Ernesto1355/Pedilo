import { normalizeApiError } from '@/app/auth/lib/client/api-error'
import { apiClient } from '@/src/lib/api/client'
import type { BusinessSettings, BusinessSettingsInput } from './businessSettings.types'

const credentials = { withCredentials: true }

async function request<T>(callback: () => Promise<{ data: T }>): Promise<T> {
    try {
        return (await callback()).data
    } catch (error) {
        throw normalizeApiError(error)
    }
}

export function getBusinessSettings() {
    return request(() => apiClient.get<BusinessSettings>('/businesses/settings', credentials))
}

export function createBusinessSettings(input: BusinessSettingsInput) {
    return request(() =>
        apiClient.post<BusinessSettings>('/businesses/settings', input, credentials),
    )
}

export function updateBusinessSettings(input: BusinessSettingsInput) {
    return request(() =>
        apiClient.patch<BusinessSettings>('/businesses/settings', input, credentials),
    )
}
