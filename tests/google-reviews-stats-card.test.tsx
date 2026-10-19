import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'

const apiGet = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/client', () => ({
    apiClient: { get: apiGet },
    isAxiosError: (error: unknown): error is { isAxiosError: true } =>
        Boolean(
            error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError,
        ),
}))

import { GoogleReviewsStatsCard } from '@/app/(protected)/dashboard/features/dashboard-overview/GoogleReviewsStatsCard'

describe('Google Reviews stats dashboard card', () => {
    beforeEach(() => {
        apiGet.mockReset()
        useAuthStore.setState({
            user: {
                id: 'qr-stats-user',
                businessId: 'qr-stats-business',
                name: 'QR Stats',
                email: 'qr@example.test',
            },
        })
    })

    it('keeps an API error local and retries only the selected QR statistics query', async () => {
        let statsAttempts = 0
        apiGet.mockImplementation((path: string) => {
            if (path === '/businesses/google-reviews/rating') {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            placeId: 'ChIJexisting',
                            rating: 4.5,
                            totalReviews: 20,
                            googleMapsUrl: 'https://maps.google.com/?cid=20',
                        },
                    },
                })
            }
            if (path !== '/businesses/google-reviews/stats') {
                throw new Error(`Unexpected GET ${path}`)
            }
            statsAttempts += 1
            if (statsAttempts === 1) return Promise.reject(new Error('offline'))
            return Promise.resolve({
                data: {
                    data: {
                        total_scans: 12,
                        unique_visitors_estimated: 8,
                        comparison_percentage: 0,
                        comparison_has_previous_data: false,
                        daily: [
                            { date: '2026-10-15', scans: 12 },
                            { date: '2026-10-16', scans: 0 },
                        ],
                        meta: { timezone: 'America/Mazatlan' },
                    },
                },
            })
        })

        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
        render(
            <QueryClientProvider client={queryClient}>
                <GoogleReviewsStatsCard period="7d" />
            </QueryClientProvider>,
        )

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'No pudimos cargar las estadísticas QR',
        )
        expect(statsAttempts).toBe(1)

        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

        expect(await screen.findByText('Sin datos del período anterior')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
        expect(screen.queryByText('Por día')).not.toBeInTheDocument()
        expect(screen.queryByRole('img', { name: /Gráfica de escaneos/ })).not.toBeInTheDocument()
        expect(
            screen.getByText(/Los escaneos no equivalen a reseñas publicadas/),
        ).toBeInTheDocument()
        await waitFor(() => expect(statsAttempts).toBe(2))
        expect(apiGet).toHaveBeenLastCalledWith(
            '/businesses/google-reviews/stats',
            expect.objectContaining({ params: { period: '7d' }, withCredentials: true }),
        )
    })
})
