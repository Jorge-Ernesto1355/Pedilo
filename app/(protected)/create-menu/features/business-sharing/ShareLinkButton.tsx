'use client'

import { Check, Copy, Link as LinkIcon } from 'lucide-react'

type ShareLinkButtonProps = { shareUrl: string; copied: boolean; onCopy: () => Promise<void> }

export function ShareLinkButton({ shareUrl, copied, onCopy }: ShareLinkButtonProps) {
    return <button type="button" title={shareUrl} onClick={() => void onCopy()} className="inline-flex items-center gap-2 rounded-xl border border-[#C9D7EA] bg-white px-3.5 py-2.5 text-sm font-bold text-[#243556] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:text-[#1E40AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15">{copied ? <Check className="size-4 text-[#23814C]" /> : <Copy className="size-4 text-[#2451C5]" />}{copied ? 'Link copied' : 'Copy link'}<LinkIcon className="ml-0.5 hidden size-3.5 text-[#8996A9] sm:block" /></button>
}
