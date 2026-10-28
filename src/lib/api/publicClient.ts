import axios from 'axios'
import { getApiBaseUrl } from '@/lib/auth/config'

export const publicApiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: { Accept: 'application/json' },
    timeout: 15_000,
    withCredentials: false,
})
