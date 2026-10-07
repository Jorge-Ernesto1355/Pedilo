import axios from 'axios'
import { getBackendUrl } from '@/lib/auth/config'

const configuredBackendUrl = getBackendUrl()

const apiBaseUrl = configuredBackendUrl.endsWith('/api/v1')
    ? configuredBackendUrl
    : `${configuredBackendUrl.replace(/\/$/, '')}/api/v1`

export const publicApiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: { Accept: 'application/json' },
    timeout: 15_000,
    withCredentials: false,
})
