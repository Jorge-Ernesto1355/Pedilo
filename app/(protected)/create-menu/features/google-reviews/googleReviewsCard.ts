import QRCode from 'qrcode'

const CARD_WIDTH = 1200
const CUSTOM_CARD_HEIGHT = 1600
const QR_SIZE = 900
const MINIMAL_CARD_HEIGHT = 1440
const MINIMAL_QR_SIZE = 900

export const MINIMAL_CARD_PALETTES = [
    { id: 'sage', name: 'Verde salvia', background: '#E7EAD8', dark: '#25483E', accent: '#D8E6A5' },
    {
        id: 'terracotta',
        name: 'Terracota',
        background: '#F5E5DB',
        dark: '#80432F',
        accent: '#F6C7A7',
    },
    {
        id: 'butter',
        name: 'Amarillo mantequilla',
        background: '#F4EED8',
        dark: '#725623',
        accent: '#F2D58C',
    },
    { id: 'rose', name: 'Rosa viejo', background: '#F3E4E8', dark: '#793B50', accent: '#F0C1CE' },
    { id: 'ocean', name: 'Azul océano', background: '#E2EDF0', dark: '#285361', accent: '#B7DCE4' },
] as const

export type MinimalCardPaletteId = (typeof MINIMAL_CARD_PALETTES)[number]['id']

export function getMinimalCardPalette(id: MinimalCardPaletteId) {
    return MINIMAL_CARD_PALETTES.find((palette) => palette.id === id) ?? MINIMAL_CARD_PALETTES[0]
}

export type GoogleReviewsCardData = {
    url: string
    businessName: string
    logoUrl: string | null
    coverUrl: string | null
}

function roundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    context.beginPath()
    context.roundRect(x, y, width, height, radius)
    context.closePath()
}

function fitText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    initialSize: number,
) {
    let size = initialSize
    while (size > 28) {
        context.font = `700 ${size}px Inter, Arial, sans-serif`
        if (context.measureText(text).width <= maxWidth) return size
        size -= 2
    }
    return size
}

function loadImage(source: string, crossOrigin = false): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        if (crossOrigin) image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
        image.src = source
    })
}

function drawImageCover(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    context.drawImage(
        image,
        x + (width - drawWidth) / 2,
        y + (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
    )
}

async function drawLogo(
    context: CanvasRenderingContext2D,
    logoUrl: string,
    centerX: number,
    centerY: number,
    size: number,
) {
    try {
        const logo = await loadImage(logoUrl, true)
        const scale = Math.min(size / logo.naturalWidth, size / logo.naturalHeight)
        const logoWidth = logo.naturalWidth * scale
        const logoHeight = logo.naturalHeight * scale
        const logoX = centerX - logoWidth / 2
        const logoY = centerY - logoHeight / 2
        context.save()
        context.beginPath()
        context.arc(centerX, centerY, size / 2 + 20, 0, Math.PI * 2)
        context.fillStyle = '#FFFFFF'
        context.shadowColor = 'rgba(18, 35, 74, 0.2)'
        context.shadowBlur = 28
        context.fill()
        context.shadowColor = 'transparent'
        context.beginPath()
        context.arc(centerX, centerY, size / 2, 0, Math.PI * 2)
        context.clip()
        context.drawImage(logo, logoX, logoY, logoWidth, logoHeight)
        context.restore()
    } catch {
        // Remote images without CORS are omitted so the PNG can still be exported safely.
    }
}

async function createQrDataUrl(url: string, width: number) {
    return QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 5,
        width,
        color: { dark: '#12234A', light: '#FFFFFF' },
    })
}

export async function buildSimpleGoogleReviewsQr(url: string) {
    return createQrDataUrl(url, 1400)
}

export async function buildMinimalGoogleReviewsCard(
    { url, businessName }: GoogleReviewsCardData,
    paletteId: MinimalCardPaletteId = 'sage',
) {
    const [qrDataUrl] = await Promise.all([createQrDataUrl(url, MINIMAL_QR_SIZE)])
    const qrImage = await loadImage(qrDataUrl)
    const palette = getMinimalCardPalette(paletteId)
    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH
    canvas.height = MINIMAL_CARD_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar el diseño del QR.')

    context.fillStyle = palette.background
    context.fillRect(0, 0, CARD_WIDTH, MINIMAL_CARD_HEIGHT)
    context.fillStyle = palette.dark
    context.fillRect(0, 0, CARD_WIDTH, 300)
    context.textAlign = 'left'
    context.fillStyle = palette.accent
    context.font = '700 25px Inter, Arial, sans-serif'
    context.fillText('UN MENSAJE PARA ESTE NEGOCIO', 88, 100)

    const name = businessName.trim() || 'Tu negocio'
    const nameSize = fitText(context, name, 1024, 66)
    context.font = `700 ${nameSize}px Inter, Arial, sans-serif`
    context.fillStyle = '#FFFFFF'
    context.fillText(name, 88, 205)

    roundedRect(context, 95, 345, 1010, 1010, 28)
    context.fillStyle = '#FFFFFF'
    context.fill()
    const qrX = (CARD_WIDTH - MINIMAL_QR_SIZE) / 2
    context.drawImage(qrImage, qrX, 400, MINIMAL_QR_SIZE, MINIMAL_QR_SIZE)

    context.textAlign = 'center'
    context.fillStyle = palette.dark
    context.font = '700 39px Inter, Arial, sans-serif'
    context.fillText('Tu opinión ayuda a crecer.', CARD_WIDTH / 2, 1410)
    return canvas.toDataURL('image/png')
}

export async function buildCustomGoogleReviewsCard({
    url,
    businessName,
    logoUrl,
    coverUrl,
}: GoogleReviewsCardData) {
    const [qrDataUrl, coverImage] = await Promise.all([
        createQrDataUrl(url, QR_SIZE),
        coverUrl ? loadImage(coverUrl, true).catch(() => null) : Promise.resolve(null),
    ])
    const qrImage = await loadImage(qrDataUrl)
    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH
    canvas.height = CUSTOM_CARD_HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar el diseño del QR.')

    context.fillStyle = '#F2EFE6'
    context.fillRect(0, 0, CARD_WIDTH, CUSTOM_CARD_HEIGHT)
    roundedRect(context, 36, 36, CARD_WIDTH - 72, CUSTOM_CARD_HEIGHT - 72, 38)
    context.fillStyle = '#FFFFFF'
    context.fill()

    context.save()
    roundedRect(context, 36, 36, CARD_WIDTH - 72, 380, 38)
    context.clip()
    if (coverImage) {
        drawImageCover(context, coverImage, 36, 36, CARD_WIDTH - 72, 380)
        const coverOverlay = context.createLinearGradient(36, 36, 36, 416)
        coverOverlay.addColorStop(0, 'rgba(15, 31, 29, 0.46)')
        coverOverlay.addColorStop(1, 'rgba(15, 31, 29, 0.9)')
        context.fillStyle = coverOverlay
        context.fillRect(36, 36, CARD_WIDTH - 72, 380)
    } else {
        context.fillStyle = '#25483E'
        context.fillRect(36, 36, CARD_WIDTH - 72, 380)
        context.strokeStyle = 'rgba(231, 234, 216, 0.12)'
        context.lineWidth = 2
        for (let i = 0; i < 7; i++) {
            context.beginPath()
            context.moveTo(640 + i * 84, 36)
            context.lineTo(340 + i * 84, 416)
            context.stroke()
        }
    }
    context.restore()

    const name = businessName.trim() || 'Tu negocio'
    context.textAlign = 'left'
    if (logoUrl) {
        await drawLogo(context, logoUrl, 146, 164, 112)
    } else {
        context.beginPath()
        context.arc(146, 164, 68, 0, Math.PI * 2)
        context.fillStyle = '#F2EFE6'
        context.fill()
        context.fillStyle = '#25483E'
        context.textAlign = 'center'
        context.font = '700 54px Inter, Arial, sans-serif'
        context.fillText(name.trim().charAt(0).toLocaleUpperCase() || 'T', 146, 183)
        context.textAlign = 'left'
    }
    context.fillStyle = '#E1E8C9'
    context.font = '700 22px Inter, Arial, sans-serif'
    context.fillText('UNA INVITACIÓN ESPECIAL', 250, 132)
    const nameSize = fitText(context, name, 810, 58)
    context.font = `700 ${nameSize}px Inter, Arial, sans-serif`
    context.fillStyle = '#FFFFFF'
    context.fillText(name, 250, 204)
    context.fillStyle = '#FFFFFF'
    context.font = '700 28px Inter, Arial, sans-serif'
    context.fillText('NOS ENCANTARÍA LEER TU RESEÑA', 100, 330)

    const qrX = (CARD_WIDTH - QR_SIZE) / 2
    const qrY = 478
    roundedRect(context, 100, 450, CARD_WIDTH - 200, 1000, 30)
    context.fillStyle = '#FFFFFF'
    context.fill()
    context.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE)

    context.textAlign = 'center'
    context.fillStyle = '#12234A'
    context.font = '700 38px Inter, Arial, sans-serif'
    context.fillText('Escanea y cuéntanos qué te pareció', CARD_WIDTH / 2, 1518)

    return canvas.toDataURL('image/png')
}
