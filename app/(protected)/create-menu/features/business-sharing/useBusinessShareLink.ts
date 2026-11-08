'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'

function subscribeToHydration(onStoreChange: () => void) {
    const timeoutId = window.setTimeout(onStoreChange, 0)
    return () => window.clearTimeout(timeoutId)
}

function getClientHydrationSnapshot() {
    return true
}

function getServerHydrationSnapshot() {
    return false
}

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
    const relativeShareUrl = `/${slug}`
    const isHydrated = useSyncExternalStore(
        subscribeToHydration,
        getClientHydrationSnapshot,
        getServerHydrationSnapshot,
    )
    const shareUrl = isHydrated
        ? new URL(relativeShareUrl, window.location.origin).toString()
        : relativeShareUrl

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
