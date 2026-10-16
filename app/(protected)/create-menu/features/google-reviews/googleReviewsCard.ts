import QRCode from 'qrcode'

const CARD_WIDTH = 1200
const CUSTOM_CARD_HEIGHT = 1600
const QR_SIZE = 900

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
        const logoX = centerX - size / 2
        const logoY = centerY - size / 2
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
        context.drawImage(logo, logoX, logoY, size, size)
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

    context.fillStyle = '#F5F8FC'
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
        coverOverlay.addColorStop(0, 'rgba(10, 29, 78, 0.36)')
        coverOverlay.addColorStop(1, 'rgba(10, 29, 78, 0.92)')
        context.fillStyle = coverOverlay
        context.fillRect(36, 36, CARD_WIDTH - 72, 380)
    } else {
        const fallback = context.createLinearGradient(36, 36, CARD_WIDTH - 36, 416)
        fallback.addColorStop(0, '#122E80')
        fallback.addColorStop(1, '#2451C5')
        context.fillStyle = fallback
        context.fillRect(36, 36, CARD_WIDTH - 72, 380)
    }
    context.restore()

    context.textAlign = 'center'
    context.fillStyle = '#FFFFFF'
    context.font = '700 28px Inter, Arial, sans-serif'
    context.fillText('PEDILO · GOOGLE REVIEWS', CARD_WIDTH / 2, 102)
    const name = businessName.trim() || 'Tu negocio'
    const nameSize = fitText(context, name, 880, 66)
    context.font = `700 ${nameSize}px Inter, Arial, sans-serif`
    context.fillText(name, CARD_WIDTH / 2, 220)
    if (logoUrl) await drawLogo(context, logoUrl, CARD_WIDTH / 2, 318, 132)

    const qrX = (CARD_WIDTH - QR_SIZE) / 2
    const qrY = 465
    roundedRect(context, 108, 438, CARD_WIDTH - 216, 980, 30)
    context.fillStyle = '#FFFFFF'
    context.fill()
    context.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE)

    context.fillStyle = '#12234A'
    context.font = '700 47px Inter, Arial, sans-serif'
    context.fillText('¡Déjanos tu opinión en Google!', CARD_WIDTH / 2, 1495)
    context.fillStyle = '#65738A'
    context.font = '400 28px Inter, Arial, sans-serif'
    context.fillText('Escanea el código y comparte tu experiencia', CARD_WIDTH / 2, 1545)

    return canvas.toDataURL('image/png')
}
