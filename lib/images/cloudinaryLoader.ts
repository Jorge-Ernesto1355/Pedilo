import type { ImageLoaderProps } from 'next/image'

/**
 * Asks Cloudinary itself for the right size and the lightest format the browser
 * supports (f_auto: AVIF/WebP instead of the uploaded PNG, q_auto: adaptive quality).
 * This skips Next's own optimizer, so no extra server work or remotePatterns needed.
 */
export function cloudinaryLoader({ src, width }: ImageLoaderProps) {
    const marker = '/image/upload/'
    const index = src.indexOf(marker)
    if (index === -1) return src
    const cut = index + marker.length
    return `${src.slice(0, cut)}f_auto,q_auto,c_limit,w_${width}/${src.slice(cut)}`
}
