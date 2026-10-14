'use client'

import { Check, Copy, Link as LinkIcon } from 'lucide-react'

type ShareLinkButtonProps = {
    shareUrl: string
    copied: boolean
    onCopy: () => Promise<void>
    className?: string
}

export function ShareLinkButton({
    shareUrl,
    copied,
    onCopy,
    className = '',
}: ShareLinkButtonProps) {
    return (
        <button
            type="button"
            title={shareUrl}
            onClick={() => void onCopy()}
            className={`inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#C9D7EA] bg-white px-2.5 py-2.5 text-xs font-bold text-[#243556] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:text-[#1E40AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15 sm:gap-2 sm:px-3.5 sm:text-sm ${className}`}
        >
            {copied ? (
                <Check className="size-4 text-[#23814C]" />
            ) : (
                <Copy className="size-4 text-[#2451C5]" />
            )}
            {copied ? 'Copiado' : 'Copiar enlace'}
            <LinkIcon className="ml-0.5 hidden size-3.5 text-[#8996A9] sm:block" />
        </button>
    )
}
