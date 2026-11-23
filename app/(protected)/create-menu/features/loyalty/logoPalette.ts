import { fixDesignContrast, type LoyaltyDesign } from '@/app/components/loyalty/loyaltyDesign'

// Paleta sugerida a partir del logo del restaurante. Se lee el logo en un canvas pequeño
// (si el servidor de imágenes no permite CORS, simplemente no hay sugerencias).

function hex(r: number, g: number, b: number) {
    return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function saturation(r: number, g: number, b: number) {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    return max === 0 ? 0 : (max - min) / max
}

/** Colores dominantes del logo, del más al menos frecuente (máximo 4, sin casi blancos/negros). */
export function paletteFromPixels(data: Uint8ClampedArray, maxColors = 4): string[] {
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()
    for (let index = 0; index < data.length; index += 4) {
        const [r, g, b, alpha] = [data[index], data[index + 1], data[index + 2], data[index + 3]]
        if (alpha < 200) continue
        const brightness = (r + g + b) / 3
        if (brightness > 242 || brightness < 14) continue
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
        bucket.count += 1
        bucket.r += r
        bucket.g += g
        bucket.b += b
        buckets.set(key, bucket)
    }
    const colors = [...buckets.values()]
        .sort((a, b) => b.count - a.count)
        .map(
            (bucket) =>
                [
                    bucket.r / bucket.count,
                    bucket.g / bucket.count,
                    bucket.b / bucket.count,
                ] as const,
        )
    const picked: (readonly [number, number, number])[] = []
    for (const color of colors) {
        const distinct = picked.every(
            (other) =>
                Math.abs(other[0] - color[0]) +
                    Math.abs(other[1] - color[1]) +
                    Math.abs(other[2] - color[2]) >
                90,
        )
        if (distinct) picked.push(color)
        if (picked.length === maxColors) break
    }
    return picked.map(([r, g, b]) => hex(r, g, b))
}

export function extractLogoPalette(url: string): Promise<string[]> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') return resolve([])
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.decoding = 'async'
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                canvas.width = 32
                canvas.height = 32
                const context = canvas.getContext('2d', { willReadFrequently: true })
                if (!context) return resolve([])
                context.drawImage(image, 0, 0, 32, 32)
                resolve(paletteFromPixels(context.getImageData(0, 0, 32, 32).data))
            } catch {
                // Canvas "contaminado" por CORS: sin sugerencias.
                resolve([])
            }
        }
        image.onerror = () => resolve([])
        image.src = url
    })
}

function mix(color: string, target: number, amount: number) {
    const value = color.replace('#', '')
    const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16))
    const [r, g, b] = channels.map((channel) => channel + (target - channel) * amount)
    return hex(r, g, b)
}

/**
 * Aplica la paleta del logo: el color más saturado para el sello, un tono muy claro de
 * él como fondo y uno muy oscuro para el texto; luego se asegura el contraste.
 */
export function applyLogoPalette(design: LoyaltyDesign, palette: string[]): LoyaltyDesign {
    if (palette.length === 0) return design
    const accent = [...palette].sort((a, b) => {
        const [ra, ga, ba] = [1, 3, 5].map((offset) => parseInt(a.slice(offset, offset + 2), 16))
        const [rb, gb, bb] = [1, 3, 5].map((offset) => parseInt(b.slice(offset, offset + 2), 16))
        return saturation(rb, gb, bb) - saturation(ra, ga, ba)
    })[0]
    return fixDesignContrast({
        ...design,
        background: {
            ...design.background,
            color1: mix(accent, 255, 0.92),
            color2: mix(accent, 255, 0.8),
        },
        text: {
            ...design.text,
            primaryColor: mix(accent, 0, 0.72),
            secondaryColor: mix(accent, 0, 0.55),
        },
        stamp: {
            ...design.stamp,
            filledColor: accent,
            iconColor: '#FFFFFF',
            emptyColor: mix(accent, 255, 0.45),
        },
        card: { ...design.card, borderColor: mix(accent, 255, 0.75) },
    })
}
