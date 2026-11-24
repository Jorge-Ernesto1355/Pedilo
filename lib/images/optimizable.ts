export const OPTIMIZED_IMAGE_HOST = 'res.cloudinary.com'

/**
 * Only Cloudinary URLs can be resized/re-encoded through cloudinaryLoader.
 * Local previews (blob:/data:) and any other host are served as they are.
 */
export function isOptimizableImage(src: string) {
    try {
        const url = new URL(src)
        return url.protocol === 'https:' && url.hostname === OPTIMIZED_IMAGE_HOST
    } catch {
        return false
    }
}
