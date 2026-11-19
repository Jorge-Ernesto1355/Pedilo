/* eslint-disable @next/next/no-img-element -- The blur placeholder is a tiny image that must not go through the optimizer. */

'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'
import { cloudinaryLoader } from '@/lib/images/cloudinaryLoader'
import { isOptimizableImage } from '@/lib/images/optimizable'

type ProgressiveImageProps = {
    src: string
    placeholderSrc?: string | null
    alt: string
    className?: string
    priority?: boolean
    sizes?: string
    width?: number
    height?: number
}

export function ProgressiveImage({
    src,
    placeholderSrc,
    alt,
    className = '',
    priority = false,
    sizes = '100vw',
    width = 1200,
    height = 800,
}: ProgressiveImageProps) {
    const hasPlaceholder = Boolean(placeholderSrc && placeholderSrc !== src)
    const imageKey = `${src}|${placeholderSrc ?? ''}`
    const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null)
    const isLoaded = loadedImageKey === imageKey

    // With server-rendered HTML the image can finish loading before hydration,
    // so onLoad never fires: check img.complete when the element mounts.
    const mainImageRef = useCallback(
        (image: HTMLImageElement | null) => {
            if (image?.complete && image.naturalWidth > 0) setLoadedImageKey(imageKey)
        },
        [imageKey],
    )

    return (
        <>
            {!hasPlaceholder && !isLoaded && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-pulse bg-[#E4EBF5] motion-reduce:animate-none"
                />
            )}
            {hasPlaceholder && (
                <img
                    width={width}
                    height={height}
                    src={placeholderSrc ?? undefined}
                    alt=""
                    aria-hidden="true"
                    className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-300 motion-reduce:transition-none ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
                />
            )}
            <Image
                ref={mainImageRef}
                width={width}
                height={height}
                src={src}
                alt={alt}
                sizes={sizes}
                loader={cloudinaryLoader}
                unoptimized={!isOptimizableImage(src)}
                loading={priority ? 'eager' : undefined}
                fetchPriority={priority ? 'high' : undefined}
                decoding={priority ? undefined : 'async'}
                onLoad={() => setLoadedImageKey(imageKey)}
                onError={() => setLoadedImageKey(imageKey)}
                className={`${className} transition-opacity duration-300 motion-reduce:transition-none ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </>
    )
}
