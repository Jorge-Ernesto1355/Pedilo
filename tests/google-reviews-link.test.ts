import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGoogleReviewTrackingUrl } from '@/app/(protected)/create-menu/features/google-reviews/googleReviewsApi'

describe('Google Reviews tracking URL', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('uses the backend root redirect route, outside the versioned API prefix', () => {
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://localhost:3001/api/v1')

        expect(getGoogleReviewTrackingUrl('c12345678901234567890123')).toBe(
            'http://localhost:3001/r/c12345678901234567890123',
        )
    })

    it('encodes the QR code as one route segment', () => {
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.pedilo.mx')

        expect(getGoogleReviewTrackingUrl('c12345678901234567890123')).toBe(
            'https://api.pedilo.mx/r/c12345678901234567890123',
        )
    })

    it('rejects QR codes the backend redirect route cannot resolve', () => {
        vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.pedilo.mx')

        expect(getGoogleReviewTrackingUrl('abc')).toBe('')
    })
})
