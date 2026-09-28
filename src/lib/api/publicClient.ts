import axios from 'axios'

const configuredBackendUrl = process.env.BACKEND_URL ?? 'https://api.pedilo.mx'
const apiBaseUrl = configuredBackendUrl.endsWith('/api/v1')
    ? configuredBackendUrl
    : `${configuredBackendUrl.replace(/\/$/, '')}/api/v1`

export const publicApiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: { Accept: 'application/json' },
    timeout: 15_000,
    withCredentials: false,
})
