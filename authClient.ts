import { createAuthClient } from 'better-auth/react'
import { getBetterAuthUrl } from '@/lib/auth/config'

export const authClient = createAuthClient({
    baseURL: getBetterAuthUrl(),
})
