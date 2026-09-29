/* eslint-disable @next/next/no-img-element -- Images may be local object URLs or Cloudinary URLs. */

'use client'

import { useState } from 'react'

type ProgressiveImageProps = {
    src: string
    placeholderSrc?: string | null
    alt: string
    className?: string
}

export function ProgressiveImage({ src, placeholderSrc, alt, className = '' }: ProgressiveImageProps) {
    const hasPlaceholder = Boolean(placeholderSrc && placeholderSrc !== src)
    const imageKey = `${src}|${placeholderSrc ?? ''}`
    const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null)
    const isLoaded = !hasPlaceholder || loadedImageKey === imageKey

    return (
        <>
            {hasPlaceholder && <img width={1200} height={800} src={placeholderSrc ?? undefined} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full scale-105 object-cover blur-sm transition-opacity duration-300 motion-reduce:transition-none ${isLoaded ? 'opacity-0' : 'opacity-100'}`} />}
            <img width={1200} height={800} src={src} alt={alt} onLoad={() => setLoadedImageKey(imageKey)} className={`${className} transition-opacity duration-300 motion-reduce:transition-none ${hasPlaceholder ? (isLoaded ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`} />
        </>
    )
}
