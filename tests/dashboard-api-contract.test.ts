import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.hoisted(() => vi.fn())
const apiPatch = vi.hoisted(() => vi.fn())

vi.mock('@/src/lib/api/client', () => ({
    apiClient: { get: apiGet, patch: apiPatch },
}))

import { getDashboardSales } from '@/app/(protected)/dashboard/features/dashboard-sales/dashboardSales'
import { getAverageTicket } from '@/app/(protected)/dashboard/features/dashboard-sales/averageTicketApi'
import {
    getBestSellingProducts,
    getMostRequestedProducts,
    getProductSummary,
} from '@/app/(protected)/create-menu/features/product-management/productApi'
import { getOrder, getOrders, updateOrderStatus } from '@/src/lib/api/orderApi'

describe('dashboard frontend API contracts', () => {
    beforeEach(() => {
        apiGet.mockReset()
        apiPatch.mockReset()
    })

    it('requests dashboard sales by period and preserves backend points', async () => {
        const response = {
            period: 'today',
            granularity: 'hour',
            timezone: 'America/Mazatlan',
            total: 450,
            ordersCount: 8,
            trend: 12,
            averageTicket: 56.25,
            points: [
                { label: '09:00', start: '2026-09-29T16:00:00.000Z', sales: 450, orderCount: 8 },
            ],
        }
        apiGet.mockResolvedValueOnce({ data: response })

        await expect(getDashboardSales('today')).resolves.toEqual(response)
        expect(apiGet).toHaveBeenCalledWith(
            '/dashboard/sales',
            expect.objectContaining({ params: { period: 'today' } }),
        )
    })

    it('requests average ticket without a business id and preserves the analytics contract', async () => {
        const response = {
            data: {
                metric: 'average_ticket',
                period: 'this_month',
                currency: 'MXN',
                current: {
                    total_sales: '100.00',
                    orders_count: 1,
                    average_ticket: '100.00',
                    start_at: '2026-10-01T00:00:00.000Z',
                    end_at: '2026-10-11T12:00:00.000Z',
                },
                previous: {
                    total_sales: '0.00',
                    orders_count: 0,
                    average_ticket: null,
                    start_at: '2026-09-01T00:00:00.000Z',
                    end_at: '2026-09-11T12:00:00.000Z',
                },
                global: {
                    total_sales: '100.00',
                    orders_count: 1,
                    average_ticket: '100.00',
                },
                comparison: {
                    difference: null,
                    percentage_change: null,
                    direction: 'up',
                    has_previous_data: false,
                },
                meta: {
                    timezone: 'America/Mazatlan',
                    generated_at: '2026-10-11T12:00:00.000Z',
                },
            },
        }
        apiGet.mockResolvedValueOnce({ data: response })

        await expect(getAverageTicket('this_month')).resolves.toEqual(response)
        expect(apiGet).toHaveBeenCalledWith(
            '/analytics/average-ticket',
            expect.objectContaining({ params: { period: 'this_month' } }),
        )
    })

    it('uses the official order list, detail, and status endpoints', async () => {
        apiGet.mockResolvedValue({ data: { orders: [], page: 1, limit: 20, total: 0 } })
        await getOrders('business-1', {
            page: 1,
            limit: 20,
            status: 'PREPARING',
            search: 'Jorge',
        })
        await getOrder('order-1')
        apiPatch.mockResolvedValueOnce({ data: { id: 'order-1', status: 'PREPARING' } })
        await updateOrderStatus('order-1', 'PREPARING')

        expect(apiGet.mock.calls[0][0]).toBe(
            '/businesses/business-1/orders?page=1&limit=20&status=PREPARING&search=Jorge',
        )
        expect(apiGet.mock.calls[1][0]).toBe('/businesses/orders/order-1')
        expect(apiPatch).toHaveBeenCalledWith(
            '/businesses/orders/order-1/status',
            { status: 'PREPARING' },
            expect.anything(),
        )
    })

    it('keeps product analytics separated by official endpoint', async () => {
        apiGet.mockResolvedValue({ data: [] })
        await getBestSellingProducts('business-1', { limit: 5 })
        await getMostRequestedProducts('business-1', { categoryId: 'category-1', limit: 5 })
        apiGet.mockResolvedValueOnce({
            data: {
                totalProducts: 3,
                activeProducts: 2,
                inactiveProducts: 1,
                uncategorizedProducts: 0,
                categoriesWithProducts: 1,
            },
        })
        await getProductSummary('business-1', { from: '2026-09-01', to: '2026-09-29' })

        expect(apiGet.mock.calls[0][0]).toContain('/analytics/best-selling?limit=5')
        expect(apiGet.mock.calls[1][0]).toContain(
            '/analytics/most-requested?categoryId=category-1&limit=5',
        )
        expect(apiGet.mock.calls[2][0]).toContain(
            '/analytics/summary?from=2026-09-01&to=2026-09-29',
        )
    })
})
