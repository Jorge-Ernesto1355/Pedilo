'use client'

import { useMemo, useState } from 'react'

function slugify(value: string) {
    return (
        value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'mi-negocio'
    )
}

export function useBusinessShareLink(BusinesSlug: string) {
    const [copied, setCopied] = useState(false)
    const slug = useMemo(() => slugify(BusinesSlug), [BusinesSlug])
    const shareUrl =
        typeof window === 'undefined'
            ? `/${slug}`
            : new URL(`/${slug}`, window.location.origin).toString()

    async function copyLink() {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareUrl)
        } else {
            const input = document.createElement('textarea')
            input.value = shareUrl
            input.setAttribute('readonly', '')
            input.style.position = 'fixed'
            input.style.opacity = '0'
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            input.remove()
        }
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2200)
    }

    return { shareUrl, slug, copied, copyLink }
}
