import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'

const apiGet = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/client', () => ({ apiClient: { get: apiGet } }))
vi.mock('recharts', async () => {
    const React = await import('react')
    return {
        CartesianGrid: () => null,
        Line: () => null,
        LineChart: ({ data, children }: { data: unknown; children: React.ReactNode }) =>
            React.createElement(
                'div',
                { 'data-testid': 'visits-chart', 'data-chart': JSON.stringify(data) },
                children,
            ),
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', null, children),
        Tooltip: () => null,
        XAxis: () => null,
        YAxis: () => null,
    }
})

import { MenuVisitsCard } from '@/app/(protected)/dashboard/features/dashboard-overview/MenuVisitsCard'

const baseStats = {
    total_visits: 12,
    unique_visitors_estimated: 8,
    comparison: {
        percentage_change: 20,
        direction: 'up' as const,
        has_previous_data: true,
    },
    series: {
        granularity: 'day' as const,
        current: [
            { label: '2026-10-15', visits: 0 },
            { label: '2026-10-16', visits: 12 },
        ],
        previous: [
            { label: '2026-10-08', visits: 4 },
            { label: '2026-10-09', visits: 6 },
        ],
    },
    meta: { timezone: 'America/Mazatlan' },
}

function renderCard(period: 'today' | '7d' | '30d' | 'thisMonth' = 'today') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={queryClient}>
            <MenuVisitsCard period={period} />
            <div>Otras métricas siguen disponibles</div>
        </QueryClientProvider>,
    )
}

describe('Store visits dashboard card', () => {
    beforeEach(() => {
        apiGet.mockReset()
        useAuthStore.setState({
            user: {
                id: 'store-visits-user',
                businessId: 'store-visits-business',
                name: 'Store visits',
                email: 'store@example.test',
            },
        })
    })

    it.each(['today', '7d', '30d', 'thisMonth'] as const)(
        'requests the selected period %s and shows endpoint values',
        async (period) => {
            apiGet.mockResolvedValueOnce({ data: { data: statsForPeriod(period) } })
            renderCard(period)

            expect(await screen.findByText('12')).toBeInTheDocument()
            expect(screen.getByText('8')).toBeInTheDocument()
            await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1))
            expect(apiGet).toHaveBeenCalledWith(
                '/businesses/store-visits/stats',
                expect.objectContaining({ params: { period }, withCredentials: true }),
            )
        },
    )

    it('shows positive and negative comparisons with clear indicators', async () => {
        apiGet.mockResolvedValueOnce({ data: { data: baseStats } }).mockResolvedValueOnce({
            data: {
                data: {
                    ...baseStats,
                    comparison: {
                        percentage_change: -12.5,
                        direction: 'down',
                        has_previous_data: true,
                    },
                },
            },
        })
        const first = renderCard('today')
        expect(await screen.findByText('+20% vs. periodo anterior')).toBeInTheDocument()
        first.unmount()

        renderCard('7d')
        expect(await screen.findByText(/-12[.,]5% vs\. periodo anterior/)).toBeInTheDocument()
    })

    it('does not invent a comparison when previous data is unavailable', async () => {
        apiGet.mockResolvedValueOnce({
            data: {
                data: {
                    ...baseStats,
                    comparison: {
                        percentage_change: null,
                        direction: 'unavailable',
                        has_previous_data: false,
                    },
                },
            },
        })
        renderCard()

        expect(await screen.findByText('Sin datos suficientes para comparar')).toBeInTheDocument()
        expect(screen.queryByText(/0% vs\./)).not.toBeInTheDocument()
    })

    it('keeps zero-visit days in the chart and presents an empty state for all-zero data', async () => {
        apiGet.mockResolvedValueOnce({ data: { data: baseStats } })
        const view = renderCard()
        const chart = await screen.findByTestId('visits-chart')
        expect(chart.getAttribute('data-chart')).toContain('"currentVisits":0')
        expect(screen.getByText('Zona horaria: America/Mazatlan')).toBeInTheDocument()
        view.unmount()

        apiGet.mockResolvedValueOnce({
            data: {
                data: {
                    ...baseStats,
                    total_visits: 0,
                    unique_visitors_estimated: 0,
                    series: {
                        granularity: 'day',
                        current: [{ label: '2026-10-16', visits: 0 }],
                        previous: [{ label: '2026-10-15', visits: 0 }],
                    },
                },
            },
        })
        renderCard()
        expect(await screen.findByText('Aún no hay visitas')).toBeInTheDocument()
    })

    it('plots all 24 hourly intervals for today, including zero intervals and both series', async () => {
        const current = Array.from({ length: 24 }, (_, hour) => ({
            label: `${String(hour).padStart(2, '0')}:00`,
            visits: hour === 1 ? 2 : 0,
        }))
        const previous = Array.from({ length: 24 }, (_, hour) => ({
            label: `${String(hour).padStart(2, '0')}:00`,
            visits: hour === 0 ? 1 : 0,
        }))
        apiGet.mockResolvedValueOnce({
            data: {
                data: {
                    ...baseStats,
                    total_visits: 2,
                    series: { granularity: 'hour', current, previous },
                },
            },
        })
        renderCard('today')

        const chart = await screen.findByTestId('visits-chart')
        const chartData = JSON.parse(chart.getAttribute('data-chart') ?? '[]') as Array<{
            label: string
            previousLabel: string
            currentVisits: number
            previousVisits: number
        }>
        expect(screen.getByText('Visitas por hora')).toBeInTheDocument()
        expect(chartData).toHaveLength(24)
        expect(chartData[0]).toEqual({
            label: '00:00',
            previousLabel: '00:00',
            currentVisits: 0,
            previousVisits: 1,
        })
        expect(chartData[1]?.currentVisits).toBe(2)
        expect(chartData[23]?.label).toBe('23:00')
    })

    it('isolates failures and retries only the visits request without showing fake zeroes', async () => {
        apiGet.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
            data: { data: baseStats },
        })
        renderCard('30d')

        expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las visitas')
        expect(screen.getByText('Otras métricas siguen disponibles')).toBeInTheDocument()
        expect(screen.queryByText('0')).not.toBeInTheDocument()
        expect(apiGet).toHaveBeenCalledTimes(1)
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

        expect(await screen.findByText('12')).toBeInTheDocument()
        await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2))
        expect(apiGet).toHaveBeenLastCalledWith(
            '/businesses/store-visits/stats',
            expect.objectContaining({ params: { period: '30d' }, withCredentials: true }),
        )
    })
})

function statsForPeriod(period: 'today' | '7d' | '30d' | 'thisMonth') {
    if (period !== 'today') return baseStats

    return {
        ...baseStats,
        series: {
            granularity: 'hour' as const,
            current: Array.from({ length: 24 }, (_, hour) => ({
                label: `${String(hour).padStart(2, '0')}:00`,
                visits: hour === 1 ? 12 : 0,
            })),
            previous: Array.from({ length: 24 }, (_, hour) => ({
                label: `${String(hour).padStart(2, '0')}:00`,
                visits: hour === 2 ? 6 : 0,
            })),
        },
    }
}
