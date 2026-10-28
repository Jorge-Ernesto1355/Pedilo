import axios, { AxiosError } from 'axios'
import { getApiBaseUrl } from '@/lib/auth/config'

export const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        Accept: 'application/json',
    },
    timeout: 15_000,
    withCredentials: true,
})

export function isAxiosError(error: unknown): error is AxiosError {
    return axios.isAxiosError(error)
}
