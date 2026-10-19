import { beforeEach, describe, expect, it, vi } from 'vitest'

const qrMock = vi.hoisted(() => ({ toDataURL: vi.fn() }))

vi.mock('qrcode', () => ({ default: qrMock }))

import {
    buildCustomGoogleReviewsCard,
    buildMinimalGoogleReviewsCard,
    buildSimpleGoogleReviewsQr,
} from '@/app/(protected)/create-menu/features/google-reviews/googleReviewsCard'

const qrImageUrl = 'data:image/png;base64,qr'

class MockImage {
    naturalWidth = 900
    naturalHeight = 900
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    crossOrigin: string | null = null

    set src(_value: string) {
        this.onload?.()
    }
}

function createContext() {
    return {
        beginPath: vi.fn(),
        closePath: vi.fn(),
        roundRect: vi.fn(),
        arc: vi.fn(),
        clip: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 120 })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        save: vi.fn(),
        restore: vi.fn(),
        fillStyle: '',
        strokeStyle: '',
        shadowColor: '',
        shadowBlur: 0,
        lineWidth: 1,
        textAlign: 'left',
        font: '',
    } as unknown as CanvasRenderingContext2D
}

describe('Google Reviews QR artwork', () => {
    const url = 'http://localhost:3001/r/abc'
    const context = createContext()
    let canvas: HTMLCanvasElement

    beforeEach(() => {
        qrMock.toDataURL.mockReset().mockResolvedValue(qrImageUrl)
        vi.stubGlobal('Image', MockImage)
        canvas = document.createElement('canvas')
        Object.defineProperty(canvas, 'getContext', { value: vi.fn(() => context) })
        Object.defineProperty(canvas, 'toDataURL', {
            value: vi.fn(() => `data:image/png;base64,${canvas.width}x${canvas.height}`),
        })
        vi.spyOn(document, 'createElement').mockImplementation((tagName, options) =>
            tagName === 'canvas' ? canvas : document.createElement(tagName, options),
        )
    })

    it('encodes the supplied tracking URL in each of the three formats', async () => {
        const business = { url, businessName: 'Café de la Esquina', logoUrl: null, coverUrl: null }

        await buildCustomGoogleReviewsCard(business)
        expect(qrMock.toDataURL).toHaveBeenLastCalledWith(url, expect.any(Object))
        expect(canvas.toDataURL).toHaveBeenLastCalledWith('image/png')
        expect(canvas.width).toBe(1200)
        expect(canvas.height).toBe(1600)

        await buildMinimalGoogleReviewsCard(business)
        expect(qrMock.toDataURL).toHaveBeenLastCalledWith(url, expect.any(Object))
        expect(canvas.toDataURL).toHaveBeenLastCalledWith('image/png')
        expect(canvas.width).toBe(1200)
        expect(canvas.height).toBe(1440)

        await buildSimpleGoogleReviewsQr(url)
        expect(qrMock.toDataURL).toHaveBeenLastCalledWith(url, expect.any(Object))
        expect(qrMock.toDataURL).toHaveBeenCalledTimes(3)
    })

    it('keeps QR generation available when the optional business images are missing', async () => {
        await expect(
            buildCustomGoogleReviewsCard({
                url,
                businessName: '',
                logoUrl: null,
                coverUrl: null,
            }),
        ).resolves.toMatch(/^data:image\/png;base64,1200x1600$/)
    })
})
