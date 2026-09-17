/* eslint-disable @next/next/no-img-element -- QR output is generated as a data URL in the browser. */

'use client'

import QRCode from 'qrcode'
import { Download, FileCode, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal } from '@/app/components/ui/Modal'

type QrCodeButtonProps = { shareUrl: string }

export function QrCodeButton({ shareUrl }: QrCodeButtonProps) {
    const [open, setOpen] = useState(false)
    const [pngDataUrl, setPngDataUrl] = useState<string | null>(null)
    const [svgMarkup, setSvgMarkup] = useState<string | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return
        let cancelled = false
        void Promise.all([
            QRCode.toDataURL(shareUrl, { errorCorrectionLevel: 'M', margin: 2, width: 360 }),
            QRCode.toString(shareUrl, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 360 }),
        ]).then(([png, svg]) => {
            if (!cancelled) {
                setPngDataUrl(png)
                setSvgMarkup(svg)
            }
        }).catch(() => {
            if (!cancelled) setError('No pudimos generar el código QR. Inténtalo de nuevo.')
        })
        return () => { cancelled = true }
    }, [open, shareUrl])

    function openQrCode() {
        setError('')
        setPngDataUrl(null)
        setSvgMarkup(null)
        setOpen(true)
    }

    function downloadPng() {
        if (!pngDataUrl) return
        const link = document.createElement('a')
        link.href = pngDataUrl
        link.download = 'menuly-menu-qr.png'
        link.click()
    }

    function downloadSvg() {
        if (!svgMarkup) return
        const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }))
        const link = document.createElement('a')
        link.href = url
        link.download = 'menuly-menu-qr.svg'
        link.click()
        URL.revokeObjectURL(url)
    }

    return <>
        <button type="button" onClick={openQrCode} className="inline-flex items-center gap-2 rounded-xl border border-[#C9D7EA] bg-white px-3.5 py-2.5 text-sm font-bold text-[#243556] transition hover:-translate-y-0.5 hover:border-[#9EB3D8] hover:text-[#1E40AF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1E40AF]/15"><QrCode className="size-4 text-[#2451C5]" />Generate QR code</button>
        <Modal open={open} onClose={() => setOpen(false)} title="Tu código QR" description="Colócalo en tu local, empaques o redes para que tus clientes encuentren tu menú." size="sm">
            <div className="flex flex-col items-center text-center">{error ? <p role="alert" className="py-10 text-sm text-[#B42318]">{error}</p> : pngDataUrl ? <img src={pngDataUrl} alt="Código QR para abrir el menú" className="size-64 rounded-xl border border-[#E2E9F3] p-3" /> : <div className="grid size-64 place-items-center rounded-xl bg-[#F3F6FB] text-sm text-[#8996A9]">Generando código…</div>}<p className="mt-4 max-w-xs break-all text-xs leading-5 text-[#8996A9]">{shareUrl}</p><div className="mt-5 flex w-full gap-2"><button type="button" disabled={!pngDataUrl} onClick={downloadPng} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E40AF] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#183991] disabled:opacity-50"><Download className="size-4" />Download PNG</button><button type="button" disabled={!svgMarkup} onClick={downloadSvg} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9D7EA] px-3 py-2.5 text-sm font-bold text-[#243556] transition hover:bg-[#F3F6FB] disabled:opacity-50"><FileCode className="size-4" />SVG</button></div></div>
        </Modal>
    </>
}
