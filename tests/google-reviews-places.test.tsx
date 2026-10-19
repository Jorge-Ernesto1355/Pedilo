import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'

const apiGet = vi.hoisted(() => vi.fn())
const apiPost = vi.hoisted(() => vi.fn())
const apiDelete = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/client', () => ({
    apiClient: { get: apiGet, post: apiPost, delete: apiDelete },
    isAxiosError: (error: unknown): error is { isAxiosError: true } =>
        Boolean(
            error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError,
        ),
}))

import { GoogleReviewsStatsCard } from '@/app/(protected)/dashboard/features/dashboard-overview/GoogleReviewsStatsCard'

const qrStats = {
    data: {
        total_scans: 4,
        unique_visitors_estimated: 3,
        comparison_percentage: null,
        comparison_has_previous_data: false,
        daily: [{ date: '2026-10-17', scans: 4 }],
        meta: { timezone: 'America/Mazatlan' },
    },
}

const place = {
    placeId: 'ChIJplace-123',
    name: 'Café Central Mazatlán',
    address: 'Centro, Mazatlán, Sinaloa',
    rating: 4.8,
    totalReviews: 214,
    googleMapsUrl: 'https://maps.google.com/?cid=123',
}

function renderCard() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <GoogleReviewsStatsCard period="today" />
        </QueryClientProvider>,
    )
}

function axiosError(status: number, code: string, message: string) {
    return {
        isAxiosError: true,
        response: {
            status,
            data: { error: { statusCode: status, code, message } },
        },
    }
}

describe('Google Reviews Google Maps connection dashboard', () => {
    beforeEach(() => {
        apiGet.mockReset()
        apiPost.mockReset()
        apiDelete.mockReset()
        localStorage.clear()
        useAuthStore.setState({
            user: {
                id: 'google-place-user',
                businessId: 'google-place-business',
                name: 'Google Place',
                email: 'place@example.test',
            },
        })
    })

    it('searches, connects, shows real place metrics, and disconnects after confirmation', async () => {
        let linked = false
        apiGet.mockImplementation((path: string) => {
            if (path === '/businesses/google-reviews/stats')
                return Promise.resolve({ data: qrStats })
            if (path === '/businesses/google-reviews/search') {
                return Promise.resolve({ data: { success: true, data: [place] } })
            }
            if (path === '/businesses/google-reviews/rating') {
                return linked
                    ? Promise.resolve({
                          data: {
                              success: true,
                              data: {
                                  placeId: place.placeId,
                                  rating: place.rating,
                                  totalReviews: place.totalReviews,
                                  googleMapsUrl: place.googleMapsUrl,
                              },
                          },
                      })
                    : Promise.reject(
                          axiosError(
                              404,
                              'GOOGLE_PLACE_NOT_LINKED',
                              'No Google Maps place is linked to this business',
                          ),
                      )
            }
            throw new Error(`Unexpected GET ${path}`)
        })
        apiPost.mockImplementation((path: string, body: unknown, config: unknown) => {
            linked = true
            return Promise.resolve({
                data: {
                    success: true,
                    message: 'Negocio de Google Maps vinculado correctamente',
                    data: {
                        placeId: place.placeId,
                        name: place.name,
                        googleMapsUrl: place.googleMapsUrl,
                    },
                },
            }).then((response) => {
                expect(path).toBe('/businesses/google-reviews/connect')
                expect(body).toEqual({ placeId: place.placeId })
                expect(config).toEqual({ withCredentials: true })
                return response
            })
        })
        apiDelete.mockImplementation((path: string, config: unknown) => {
            linked = false
            expect(path).toBe('/businesses/google-reviews/connect')
            expect(config).toEqual({ withCredentials: true })
            return Promise.resolve({ data: { success: true, message: 'Desvinculado' } })
        })

        renderCard()

        expect(await screen.findByText('Vincula tu establecimiento')).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Nombre del establecimiento'), {
            target: { value: 'Café Central' },
        })
        fireEvent.change(screen.getByLabelText('Ciudad o ubicación'), {
            target: { value: 'Mazatlán, Sinaloa' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

        const result = await screen.findByRole('button', { name: /Café Central Mazatlán/ })
        expect(result).toHaveTextContent('Centro, Mazatlán, Sinaloa')
        expect(result).toHaveTextContent('4.8 / 5')
        expect(result).toHaveTextContent('214 reseñas')
        expect(apiGet).toHaveBeenCalledWith(
            '/businesses/google-reviews/search',
            expect.objectContaining({
                params: { query: 'Café Central', location: 'Mazatlán, Sinaloa' },
                withCredentials: true,
            }),
        )

        fireEvent.click(result)
        fireEvent.click(
            screen.getByRole('button', { name: 'Vincular establecimiento seleccionado' }),
        )

        expect(await screen.findByRole('link', { name: 'Abrir Google Maps' })).toBeInTheDocument()
        expect(apiPost).toHaveBeenCalledTimes(1)
        expect(await screen.findByText('Café Central Mazatlán')).toBeInTheDocument()
        expect(screen.getByText('4.8 / 5')).toBeInTheDocument()
        expect(screen.getByText('214 reseñas en Google Maps')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Abrir Google Maps' })).toHaveAttribute(
            'href',
            place.googleMapsUrl,
        )
        expect(screen.getByText('4')).toBeInTheDocument()
        expect(
            apiGet.mock.calls.filter(([path]) => path === '/businesses/google-reviews/stats'),
        ).toHaveLength(1)

        fireEvent.click(screen.getByRole('button', { name: 'Desvincular' }))
        const dialog = await screen.findByRole('dialog', { name: 'Desvincular Google Maps' })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, desvincular' }))

        expect(await screen.findByText('Vincula tu establecimiento')).toBeInTheDocument()
        expect(apiDelete).toHaveBeenCalledTimes(1)
        expect(localStorage.getItem('pedilo:google-place-name:google-place-business')).toBeNull()
        expect(
            apiGet.mock.calls.filter(([path]) => path === '/businesses/google-reviews/stats'),
        ).toHaveLength(1)
    })

    it('shows an empty search response and keeps QR scans visible when Places fails', async () => {
        apiGet.mockImplementation((path: string) => {
            if (path === '/businesses/google-reviews/stats')
                return Promise.resolve({ data: qrStats })
            if (path === '/businesses/google-reviews/rating') {
                return Promise.reject(
                    axiosError(404, 'GOOGLE_PLACE_NOT_LINKED', 'No Google Maps place is linked'),
                )
            }
            if (path === '/businesses/google-reviews/search') {
                return Promise.reject(axiosError(429, 'GOOGLE_PLACES_RATE_LIMITED', 'Rate limited'))
            }
            throw new Error(`Unexpected GET ${path}`)
        })
        renderCard()

        expect(await screen.findByText('Vincula tu establecimiento')).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Nombre del establecimiento'), {
            target: { value: 'Restaurante del Puerto' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

        expect(
            await screen.findByText(
                'Google Maps recibió demasiadas solicitudes. Inténtalo de nuevo en unos minutos.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
        expect(
            apiGet.mock.calls.filter(([path]) => path === '/businesses/google-reviews/stats'),
        ).toHaveLength(1)
    })

    it('renders an explicit empty state when search returns no places', async () => {
        apiGet.mockImplementation((path: string) => {
            if (path === '/businesses/google-reviews/stats')
                return Promise.resolve({ data: qrStats })
            if (path === '/businesses/google-reviews/rating') {
                return Promise.reject(
                    axiosError(404, 'GOOGLE_PLACE_NOT_LINKED', 'No Google Maps place is linked'),
                )
            }
            if (path === '/businesses/google-reviews/search') {
                return Promise.resolve({ data: { success: true, data: [] } })
            }
            throw new Error(`Unexpected GET ${path}`)
        })
        renderCard()

        expect(await screen.findByText('Vincula tu establecimiento')).toBeInTheDocument()
        fireEvent.change(screen.getByLabelText('Nombre del establecimiento'), {
            target: { value: 'Negocio sin resultados' },
        })
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

        expect(await screen.findByText('No encontramos establecimientos')).toBeInTheDocument()
    })

    it('offers retry for rating failures without hiding QR stats', async () => {
        let ratingCalls = 0
        apiGet.mockImplementation((path: string) => {
            if (path === '/businesses/google-reviews/stats')
                return Promise.resolve({ data: qrStats })
            if (path === '/businesses/google-reviews/rating') {
                ratingCalls += 1
                return ratingCalls === 1
                    ? Promise.reject(axiosError(502, 'GOOGLE_PLACES_UPSTREAM_ERROR', 'Unavailable'))
                    : Promise.resolve({
                          data: {
                              success: true,
                              data: {
                                  placeId: place.placeId,
                                  name: place.name,
                                  rating: place.rating,
                                  totalReviews: place.totalReviews,
                                  googleMapsUrl: place.googleMapsUrl,
                              },
                          },
                      })
            }
            throw new Error(`Unexpected GET ${path}`)
        })
        renderCard()

        expect(await screen.findByText(/Google Maps no está disponible/)).toBeInTheDocument()
        expect(screen.getByText('4')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

        expect(await screen.findByText('Café Central Mazatlán')).toBeInTheDocument()
        expect(ratingCalls).toBe(2)
        expect(
            apiGet.mock.calls.filter(([path]) => path === '/businesses/google-reviews/stats'),
        ).toHaveLength(1)
    })
})
